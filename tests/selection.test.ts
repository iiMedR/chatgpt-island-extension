import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAssistantSelection } from '../src/content/selection/selection-dom';
import { createSelectionManager } from '../src/content/selection/selection-manager';
import { validateSelectionText } from '../src/content/selection/selection-validator';

function fixture(
  html = '<div data-message-author-role="assistant"><p id="first">  Hello <strong id="bold">world</strong></p><p id="last">Second line  </p></div>',
) {
  document.body.innerHTML = html;
}
function select(start: string, end = start) {
  const range = document.createRange();
  range.setStart(document.querySelector(start)!.firstChild!, 0);
  const last = document.querySelector(end)!.lastChild!;
  range.setEnd(
    last,
    last.nodeType === Node.TEXT_NODE
      ? last.textContent!.length
      : last.childNodes.length,
  );
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}
let manager: ReturnType<typeof createSelectionManager> | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  history.replaceState(null, '', '/c/one');
  fixture();
});
afterEach(() => {
  manager?.dispose();
  manager = undefined;
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('text and DOM validation', () => {
  it.each(
    ['   ', 'x'.repeat(10001)].map((text) => ({ text, length: text.length })),
  )('rejects invalid selected assistant text of length $length', ({ text }) => {
    fixture(
      '<div data-message-author-role="assistant"><p id="text"></p></div>',
    );
    document.querySelector('#text')!.textContent = text;
    expect(readAssistantSelection(select('#text'), document).valid).toBe(false);
  });
  it.each(['', ' \n\t '])('rejects empty/whitespace %j', (text) =>
    expect(validateSelectionText(text)).toEqual({
      valid: false,
      reason: 'empty',
    }),
  );
  it('rejects oversized text and accepts the exact trimmed limit', () => {
    expect(validateSelectionText('x'.repeat(10001))).toEqual({
      valid: false,
      reason: 'oversized',
    });
    expect(validateSelectionText('  ' + 'x'.repeat(10000) + '  ').valid).toBe(
      true,
    );
  });
  it('preserves internal whitespace and trims boundaries', () =>
    expect(validateSelectionText(' \n a  b\nc \t')).toEqual({
      valid: true,
      text: 'a  b\nc',
    }));
  it('captures nested Markdown across one assistant response', () => {
    const selection = select('#first', '#last');
    expect(readAssistantSelection(selection, document)).toEqual({
      valid: true,
      text: selection.toString().trim(),
    });
    expect(readAssistantSelection(select('#bold'), document)).toEqual({
      valid: true,
      text: 'world',
    });
  });
  it('accepts semantic article turn markup', () => {
    fixture('<article data-turn="assistant"><p id="text">Answer</p></article>');
    expect(readAssistantSelection(select('#text'), document)).toEqual({
      valid: true,
      text: 'Answer',
    });
  });
  it('accepts a response spanning nested assistant blocks in one turn', () => {
    fixture(
      '<article data-turn="assistant"><div data-message-author-role="assistant"><p id="a">Writing</p><button aria-label="Copy"><svg></svg></button><p id="b">Card content</p></div><div data-message-author-role="assistant"><p id="c">Explanation</p></div></article>',
    );
    const selection = select('#a', '#c');
    expect(readAssistantSelection(selection, document)).toEqual({
      valid: true,
      text: selection.toString().trim(),
    });
  });
  it('still rejects selected text from response-card controls', () => {
    fixture(
      '<article data-turn="assistant"><p id="a">Before</p><button>Private action</button><p id="b">After</p></article>',
    );
    expect(readAssistantSelection(select('#a', '#b'), document).valid).toBe(
      false,
    );
  });
  it('rejects nested user messages inside an assistant turn', () => {
    fixture(
      '<article data-turn="assistant"><p id="a">Before</p><div data-message-author-role="user">User</div><p id="b">After</p></article>',
    );
    expect(readAssistantSelection(select('#a', '#b'), document).valid).toBe(
      false,
    );
  });
  it.each([
    '<div data-message-author-role="user"><p id="text">User</p></div>',
    '<textarea id="text">Composer</textarea>',
    '<div contenteditable="true"><p id="text">Composer</p></div>',
    '<aside><div data-message-author-role="assistant"><p id="text">Sidebar</p></div></aside>',
    '<nav><p id="text">Sidebar</p></nav>',
    '<div data-message-author-role="assistant"><input type="password"><p id="text" contenteditable="true">Editable</p></div>',
    '<div data-message-author-role="assistant"><div data-chatgpt-island-root><p id="text">Extension</p></div></div>',
    '<div data-message-author-role="assistant"><button id="text">Copy</button></div>',
  ])('rejects excluded or non-assistant markup %s', (html) => {
    fixture(html);
    expect(readAssistantSelection(select('#text'), document).valid).toBe(false);
  });
  it('rejects a range crossing two assistant messages', () => {
    fixture(
      '<div data-message-author-role="assistant"><p id="a">A</p></div><div data-message-author-role="assistant"><p id="b">B</p></div>',
    );
    expect(readAssistantSelection(select('#a', '#b'), document).valid).toBe(
      false,
    );
  });
  it('rejects a range crossing assistant and unrelated page regions', () => {
    fixture(
      '<div data-message-author-role="assistant"><p id="a">A</p></div><aside id="b">B</aside>',
    );
    expect(readAssistantSelection(select('#a', '#b'), document).valid).toBe(
      false,
    );
  });
  it('rejects editable content between otherwise valid endpoints', () => {
    fixture(
      '<div data-message-author-role="assistant"><p id="a">A</p><span contenteditable="true">Private</span><p id="b">B</p></div>',
    );
    expect(readAssistantSelection(select('#a', '#b'), document).valid).toBe(
      false,
    );
  });
  it('rejects document selections while an input is focused', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(readAssistantSelection(select('#bold'), document).valid).toBe(false);
  });
  it('rejects collapsed or missing selection', () => {
    window.getSelection()?.removeAllRanges();
    expect(readAssistantSelection(window.getSelection(), document).valid).toBe(
      false,
    );
    expect(readAssistantSelection(null, document).valid).toBe(false);
  });
});

describe('selection lifecycle', () => {
  function start(navigation?: EventTarget) {
    const debug = vi.fn();
    manager = createSelectionManager({ window, document, navigation, debug });
    return debug;
  }
  function trigger(event = 'selectionchange') {
    document.dispatchEvent(new Event(event));
    vi.advanceTimersByTime(100);
  }
  it.each(['mouseup', 'keyup', 'selectionchange'])(
    'captures on %s with typed metadata',
    (event) => {
      start();
      select('#bold');
      trigger(event);
      expect(manager!.getSelection()).toEqual({
        text: 'world',
        sourceUrl: location.href,
        capturedAt: expect.any(Number),
        sourceType: 'assistant-message',
      });
    },
  );
  it('retains the last valid selection after collapse, outside click, or invalid selection', () => {
    start();
    select('#bold');
    trigger();
    const previous = manager!.getSelection();
    window.getSelection()!.removeAllRanges();
    trigger('mouseup');
    expect(manager!.getSelection()).toBe(previous);
    const sidebar = document.createElement('aside');
    sidebar.id = 'side';
    sidebar.textContent = 'Elsewhere';
    document.body.append(sidebar);
    select('#side');
    trigger();
    expect(manager!.getSelection()).toBe(previous);
  });
  it('flushes pending selection validation when triggered before the debounce completes', () => {
    start();
    select('#bold');
    document.dispatchEvent(new Event('selectionchange'));
    expect(manager!.getSelection()?.text).toBe('world');
    select('#last');
    document.dispatchEvent(new Event('selectionchange'));
    expect(manager!.getSelection()?.text).toBe('Second line');
  });
  it('coalesces rapid events and never logs selected text', () => {
    const debug = start();
    select('#bold');
    for (let i = 0; i < 20; i++)
      document.dispatchEvent(new Event('selectionchange'));
    vi.advanceTimersByTime(100);
    expect(
      debug.mock.calls.filter(([event]) => event === 'validated'),
    ).toHaveLength(1);
    expect(JSON.stringify(debug.mock.calls)).not.toContain('world');
  });
  it('captures dynamically inserted assistant responses without scanning or observers', () => {
    start();
    document.body.innerHTML =
      '<div data-message-author-role="assistant"><p id="new">New answer</p></div>';
    select('#new');
    trigger();
    expect(manager!.getSelection()?.text).toBe('New answer');
  });
  it.each(['popstate', 'currententrychange', 'poll', 'getter'])(
    'clears on navigation via %s and does not recapture a stale range',
    (event) => {
      const navigation = new EventTarget();
      const debug = start(navigation);
      select('#bold');
      trigger();
      history.pushState(null, '', '/c/two');
      if (event === 'popstate')
        window.dispatchEvent(new PopStateEvent('popstate'));
      if (event === 'currententrychange')
        navigation.dispatchEvent(new Event(event));
      if (event === 'poll') vi.advanceTimersByTime(1000);
      expect(manager!.getSelection()).toBeNull();
      trigger('mouseup');
      expect(manager!.getSelection()).toBeNull();
      expect(debug).toHaveBeenCalledWith('cleared');
      select('#last');
      trigger();
      expect(manager!.getSelection()?.text).toBe('Second line');
    },
  );
  it('cancels a pending capture during navigation', () => {
    start();
    select('#bold');
    document.dispatchEvent(new Event('selectionchange'));
    history.pushState(null, '', '/c/two');
    vi.advanceTimersByTime(100);
    expect(manager!.getSelection()).toBeNull();
  });
  it('preserves state for hash/query changes within the same conversation', () => {
    start();
    select('#bold');
    trigger();
    history.replaceState(null, '', '/c/one?model=test#answer');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(manager!.getSelection()?.text).toBe('world');
  });
  it('clears on pagehide and resumes after bfcache restoration', () => {
    start();
    select('#bold');
    trigger();
    window.dispatchEvent(new Event('pagehide'));
    expect(manager!.getSelection()).toBeNull();
    select('#last');
    trigger();
    expect(manager!.getSelection()).toBeNull();
    window.dispatchEvent(new Event('pageshow'));
    trigger();
    expect(manager!.getSelection()?.text).toBe('Second line');
  });
  it('disposes listeners and timers and exposes no mutable state', () => {
    start();
    select('#bold');
    trigger();
    expect(Object.isFrozen(manager!.getSelection())).toBe(true);
    manager!.dispose();
    manager!.dispose();
    select('#last');
    trigger();
    expect(manager!.getSelection()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
