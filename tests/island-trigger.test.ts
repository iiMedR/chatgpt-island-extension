import { afterEach, expect, it, vi } from 'vitest';
import { createIslandTrigger } from '../src/content/island-trigger';
import type { CapturedSelection } from '../src/content/selection/selection-types';
const selection: CapturedSelection = {
  text: 'Selected answer',
  sourceUrl: 'https://chatgpt.com/c/one',
  capturedAt: 100,
  sourceType: 'assistant-message',
};
afterEach(() => vi.restoreAllMocks());
function setup(captured: CapturedSelection | null = selection) {
  const getSelection = vi.fn(() => captured);
  const getUrl = vi.fn(() => 'https://chatgpt.com/c/one');
  const isContextValid = vi.fn(() => true);
  const onOpen = vi.fn();
  return {
    getSelection,
    getUrl,
    isContextValid,
    onOpen,
    trigger: createIslandTrigger({
      getSelection,
      getUrl,
      isContextValid,
      onOpen,
    }),
  };
}
it('emits exactly one immutable payload for each valid request, locally only', () => {
  const { trigger, onOpen, getSelection } = setup();
  expect(trigger()).toEqual({ status: 'triggered' });
  expect(onOpen).toHaveBeenCalledOnce();
  expect(getSelection).toHaveBeenCalledOnce();
  expect(onOpen.mock.calls[0][0]).toEqual({
    selectedText: selection.text,
    sourceUrl: selection.sourceUrl,
    triggeredAt: expect.any(Number),
    capturedAt: selection.capturedAt,
  });
  expect(Object.isFrozen(onOpen.mock.calls[0][0])).toBe(true);
  trigger();
  expect(onOpen).toHaveBeenCalledTimes(2);
});
it('returns no-selection without an event', () => {
  const { trigger, onOpen } = setup(null);
  expect(trigger()).toEqual({ status: 'no-selection' });
  expect(onOpen).not.toHaveBeenCalled();
});
it.each([
  { text: 123 },
  { sourceUrl: undefined },
  { text: '' },
  { text: '  ' },
  { text: 'x'.repeat(10001) },
  { text: ' untrimmed ' },
  { sourceUrl: 'https://chatgpt.com/c/two' },
  { sourceUrl: 'https://example.com/c/one' },
  { sourceUrl: 'bad' },
  { sourceType: 'user-message' },
  { capturedAt: NaN },
  { capturedAt: -1 },
  { capturedAt: Infinity },
  { capturedAt: Date.now() + 100000 },
])('rejects invalid/stale state (case %#)', (patch) => {
  const { trigger, onOpen } = setup({
    ...selection,
    ...patch,
  } as CapturedSelection);
  expect(trigger()).toEqual({ status: 'invalid-selection' });
  expect(onOpen).not.toHaveBeenCalled();
});
it('uses lifecycle expiration rather than imposing a conflicting arbitrary age limit', () => {
  const { trigger } = setup();
  expect(trigger()).toEqual({ status: 'triggered' });
});
it('rejects unsupported pages and invalidated contexts before reading selection', () => {
  const state = setup();
  state.getUrl.mockReturnValue('https://example.com/');
  expect(state.trigger()).toEqual({ status: 'unsupported-page' });
  expect(state.getSelection).not.toHaveBeenCalled();
  state.isContextValid.mockReturnValue(false);
  expect(state.trigger()).toEqual({ status: 'context-invalidated' });
  expect(state.onOpen).not.toHaveBeenCalled();
});
it('returns handler failures without throwing or logging the payload', () => {
  const { trigger, onOpen } = setup();
  onOpen.mockImplementation(() => {
    throw new Error(selection.text);
  });
  expect(trigger()).toEqual({ status: 'handler-failed' });
  expect(onOpen).toHaveBeenCalledOnce();
});
