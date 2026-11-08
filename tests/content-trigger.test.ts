import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initializeContent } from '../src/content/initialize';
import { handleCommand } from '../src/background/commands';
vi.mock('../src/content/island/island-controller', () => ({
  createIslandController: () => ({
    open: vi.fn(),
    close: vi.fn(),
    dispose: vi.fn(),
  }),
}));

type Listener = Parameters<typeof chrome.runtime.onMessage.addListener>[0];
let listeners: Set<Listener>;
let dispose: (() => void) | undefined;
let debug: ReturnType<typeof vi.spyOn>;
const tab = {
  id: 1,
  active: true,
  url: 'https://chatgpt.com/c/one',
} as chrome.tabs.Tab;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('location', new URL(tab.url!));
  listeners = new Set();
  debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'island-test',
      onMessage: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
    tabs: {
      sendMessage: vi.fn(async (_tab: number, message: unknown) =>
        dispatch(message),
      ),
      query: vi.fn(),
    },
  });
  document.body.innerHTML =
    '<div data-message-author-role="assistant"><p id="answer">Private selected answer</p></div><aside id="side">Sidebar</aside>';
  dispose = initializeContent(window, document);
});
afterEach(() => {
  dispose?.();
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function dispatch(message: unknown, sender = { id: 'island-test' }): unknown {
  let result: unknown;
  for (const listener of [...listeners])
    listener(message, sender, (value) => {
      result = value;
    });
  return result;
}
function capture(selector = '#answer') {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector(selector)!);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event('mouseup'));
  vi.advanceTimersByTime(100);
}
function opens() {
  return debug.mock.calls.filter(
    (call) => call[0] === '[ChatGPT Island] Island-open received',
  );
}
it('bridges one command to exactly one local event and returns no selected text', async () => {
  capture();
  expect(await handleCommand('open-island', tab)).toBe('triggered');
  expect(opens()).toHaveLength(1);
  expect(chrome.tabs.sendMessage).toHaveBeenCalledExactlyOnceWith(
    1,
    { type: 'ISLAND_OPEN_REQUEST' },
    { frameId: 0 },
  );
  expect(JSON.stringify(debug.mock.calls)).not.toContain(
    'Private selected answer',
  );
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'triggered',
  });
});
it('does not read the DOM Selection API when handling a shortcut', () => {
  capture();
  const read = vi.spyOn(window, 'getSelection');
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'triggered',
  });
  expect(read).not.toHaveBeenCalled();
});
it('preserves the last valid text after collapse or sidebar selection', () => {
  capture();
  window.getSelection()!.removeAllRanges();
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'triggered',
  });
  capture('#side');
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'triggered',
  });
});
it('rejects missing selection and expired navigation state', () => {
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'no-selection',
  });
  capture();
  location.href = 'https://chatgpt.com/c/two';
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'no-selection',
  });
  expect(opens()).toHaveLength(0);
});
it('does not accumulate listeners or events on repeated initialization/commands', () => {
  dispose = initializeContent(window, document);
  dispose = initializeContent(window, document);
  expect(listeners.size).toBe(1);
  capture();
  for (let i = 0; i < 3; i++)
    expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
      status: 'triggered',
    });
  expect(opens()).toHaveLength(3);
  dispose();
  expect(listeners.size).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});
it('ignores malformed messages and unrelated senders', () => {
  capture();
  expect(
    dispatch({ type: 'ISLAND_OPEN_REQUEST', selectedText: 'injected' }),
  ).toBeUndefined();
  expect(
    dispatch({ type: 'ISLAND_OPEN_REQUEST' }, { id: 'other' }),
  ).toBeUndefined();
  expect(opens()).toHaveLength(0);
});
it('handles invalidated contexts and clears pending selection timers', () => {
  capture();
  Object.defineProperty(chrome.runtime, 'id', {
    get() {
      throw new Error('Extension context invalidated');
    },
    configurable: true,
  });
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'context-invalidated',
  });
  expect(opens()).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});
it('clears on pagehide and never opens while cached', () => {
  capture();
  window.dispatchEvent(
    new PageTransitionEvent('pagehide', { persisted: true }),
  );
  expect(dispatch({ type: 'ISLAND_OPEN_REQUEST' })).toEqual({
    status: 'no-selection',
  });
  window.dispatchEvent(
    new PageTransitionEvent('pageshow', { persisted: true }),
  );
  expect(opens()).toHaveLength(0);
});
it('handles a response channel invalidated during a reply without uncaught errors', () => {
  capture();
  const listener = [...listeners][0];
  expect(() =>
    listener({ type: 'ISLAND_OPEN_REQUEST' }, { id: 'island-test' }, () => {
      throw new Error('Extension context invalidated');
    }),
  ).not.toThrow();
  expect(vi.getTimerCount()).toBe(0);
  expect(listeners.size).toBe(0);
});
