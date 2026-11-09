import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  handleCommand,
  checkShortcutAssignment,
  registerCommands,
  RESPONSE_TIMEOUT_MS,
} from '../src/background/commands';
const tab = {
  id: 7,
  url: 'https://chatgpt.com/c/one',
  active: true,
} as chrome.tabs.Tab;
let query: ReturnType<typeof vi.fn>;
let sendMessage: ReturnType<typeof vi.fn>;
let getAll: ReturnType<typeof vi.fn>;
let addListener: ReturnType<typeof vi.fn>;
beforeEach(() => {
  query = vi.fn().mockResolvedValue([tab]);
  sendMessage = vi.fn().mockResolvedValue({ status: 'triggered' });
  getAll = vi
    .fn()
    .mockResolvedValue([{ name: 'open-island', shortcut: 'Alt+Shift+E' }]);
  addListener = vi.fn();
  vi.stubGlobal('chrome', {
    tabs: { query, sendMessage },
    commands: { getAll, onCommand: { addListener } },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('uses the supplied command tab and sends no text to the top-frame content script', async () => {
  expect(await handleCommand('open-island', tab)).toBe('triggered');
  expect(query).not.toHaveBeenCalled();
  expect(sendMessage).toHaveBeenCalledExactlyOnceWith(
    7,
    { type: 'ISLAND_OPEN_REQUEST' },
    { frameId: 0 },
  );
});
it('falls back to the active tab only when the event has no tab', async () => {
  expect(await handleCommand('open-island')).toBe('triggered');
  expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
});
it('ignores unknown commands without touching tabs', async () => {
  expect(await handleCommand('other')).toBe('ignored-command');
  expect(query).not.toHaveBeenCalled();
});
it.each([
  'https://example.com/',
  'https://chatgpt.com.evil.test/',
  'http://chatgpt.com/',
  undefined,
])('rejects unsupported tab %s', async (url) => {
  expect(await handleCommand('open-island', { ...tab, url })).toBe(
    'unsupported-tab',
  );
  expect(sendMessage).not.toHaveBeenCalled();
});
it('rejects inactive or navigating-away tabs', async () => {
  expect(await handleCommand('open-island', { ...tab, active: false })).toBe(
    'unsupported-tab',
  );
  expect(
    await handleCommand('open-island', {
      ...tab,
      pendingUrl: 'https://example.com/',
    }),
  ).toBe('unsupported-tab');
  expect(sendMessage).not.toHaveBeenCalled();
});
it.each([undefined, -1, 1.5, NaN])(
  'rejects missing or invalid tab id %s',
  async (id) => {
    expect(await handleCommand('open-island', { ...tab, id })).toBe(
      'missing-tab-id',
    );
    expect(sendMessage).not.toHaveBeenCalled();
  },
);
it('handles absent tabs and query errors', async () => {
  query.mockResolvedValue([]);
  expect(await handleCommand('open-island')).toBe('unsupported-tab');
  query.mockRejectedValue(new Error('API unavailable'));
  expect(await handleCommand('open-island')).toBe('tab-query-failed');
});
it('handles missing content scripts and messaging errors without retries', async () => {
  sendMessage.mockRejectedValue(new Error('Receiving end does not exist'));
  expect(await handleCommand('open-island', tab)).toBe('messaging-failed');
  expect(sendMessage).toHaveBeenCalledOnce();
});
it('bounds an unresponsive receiver and releases its single timeout', async () => {
  vi.useFakeTimers();
  sendMessage.mockReturnValue(new Promise(() => {}));
  const result = handleCommand('open-island', tab);
  await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
  expect(await result).toBe('response-timeout');
  expect(vi.getTimerCount()).toBe(0);
});
it('clears the timeout after a normal response', async () => {
  vi.useFakeTimers();
  await handleCommand('open-island', tab);
  expect(vi.getTimerCount()).toBe(0);
});
it.each([
  'no-selection',
  'invalid-selection',
  'context-invalidated',
  'handler-failed',
])('returns typed content status %s', async (status) => {
  sendMessage.mockResolvedValue({ status });
  expect(await handleCommand('open-island', tab)).toBe(status);
});
it.each([
  undefined,
  {},
  { status: 'other' },
  { status: 'triggered', text: 'not allowed' },
])('rejects malformed responses %j', async (result) => {
  sendMessage.mockResolvedValue(result);
  expect(await handleCommand('open-island', tab)).toBe('invalid-response');
});
it('registers exactly once and sends one request per repeated command invocation', async () => {
  registerCommands();
  registerCommands();
  expect(addListener).toHaveBeenCalledOnce();
  const listener = addListener.mock.calls[0][0] as (
    command: string,
    tab: chrome.tabs.Tab,
  ) => void;
  listener('open-island', tab);
  listener('open-island', tab);
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
});
it('checks both assigned and unassigned shortcuts without changing preferences', async () => {
  expect(await checkShortcutAssignment()).toBe('assigned');
  getAll.mockResolvedValue([{ name: 'open-island', shortcut: '' }]);
  expect(await checkShortcutAssignment()).toBe('shortcut-unassigned');
  getAll.mockResolvedValue([]);
  expect(await checkShortcutAssignment()).toBe('shortcut-unassigned');
  getAll.mockRejectedValue(new Error('Unavailable'));
  expect(await checkShortcutAssignment()).toBe('shortcut-check-failed');
});

it('keeps overlapping commands for separate supplied tabs isolated without fallback queries', async () => {
  const results = await Promise.all([
    handleCommand('open-island', tab),
    handleCommand('open-island', {
      ...tab,
      id: 9,
      url: 'https://chatgpt.com/c/two',
    }),
  ]);
  expect(results).toEqual(['triggered', 'triggered']);
  expect(query).not.toHaveBeenCalled();
  expect(sendMessage.mock.calls).toEqual([
    [7, { type: 'ISLAND_OPEN_REQUEST' }, { frameId: 0 }],
    [9, { type: 'ISLAND_OPEN_REQUEST' }, { frameId: 0 }],
  ]);
});
