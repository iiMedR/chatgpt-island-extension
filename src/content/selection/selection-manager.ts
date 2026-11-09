import { readAssistantSelection } from './selection-dom';
import type { CapturedSelection, SelectionDiagnostic } from './selection-types';

interface Options {
  window: Window;
  document: Document;
  navigation?: EventTarget;
  debug?: (event: SelectionDiagnostic, reason?: string) => void;
  onClear?: () => void;
}

function route(url: string): string {
  const parsed = new URL(url);
  return parsed.origin + parsed.pathname;
}

function signature(selection: Selection | null) {
  if (!selection?.anchorNode || !selection.focusNode || selection.isCollapsed)
    return null;
  return {
    anchor: new WeakRef(selection.anchorNode),
    focus: new WeakRef(selection.focusNode),
    anchorOffset: selection.anchorOffset,
    focusOffset: selection.focusOffset,
  };
}

export function createSelectionManager({
  window,
  document,
  navigation,
  debug,
  onClear,
}: Options) {
  let captured: CapturedSelection | null = null;
  let currentRoute = route(window.location.href);
  let pending: number | undefined;
  let disposed = false;
  let suspended = false;
  let stale: ReturnType<typeof signature> = null;
  let lastResult = 'not-observed';
  const clear = () => {
    captured = null;
    lastResult = 'cleared';
    if (pending !== undefined) window.clearTimeout(pending);
    pending = undefined;
    stale = signature(window.getSelection());
    debug?.('cleared');
    onClear?.();
  };
  const checkNavigation = () => {
    const next = route(window.location.href);
    if (next === currentRoute) return false;
    currentRoute = next;
    clear();
    return true;
  };
  const process = () => {
    pending = undefined;
    if (disposed || suspended || checkNavigation()) return;
    const selection = window.getSelection();
    if (
      stale &&
      selection &&
      selection.anchorNode === stale.anchor.deref() &&
      selection.focusNode === stale.focus.deref() &&
      selection.anchorOffset === stale.anchorOffset &&
      selection.focusOffset === stale.focusOffset
    )
      return;
    stale = null;
    const result = readAssistantSelection(selection, document);
    lastResult = result.valid ? 'valid' : result.reason;
    if (!result.valid) {
      debug?.('rejected', result.reason);
      return;
    }
    debug?.('detected');
    if (
      captured?.text === result.text &&
      captured.sourceUrl === window.location.href
    )
      return;
    captured = Object.freeze({
      text: result.text,
      sourceUrl: window.location.href,
      capturedAt: Date.now(),
      sourceType: 'assistant-message',
    });
    debug?.('validated');
  };
  const schedule = () => {
    if (disposed || suspended || checkNavigation()) return;
    if (pending !== undefined) window.clearTimeout(pending);
    pending = window.setTimeout(process, 80);
  };
  const hide = () => {
    suspended = true;
    clear();
  };
  const show = () => {
    suspended = false;
    checkNavigation();
  };
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('mouseup', schedule, { passive: true });
  document.addEventListener('keyup', schedule, { passive: true });
  window.addEventListener('popstate', checkNavigation);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);
  navigation?.addEventListener('currententrychange', checkNavigation);
  // URL-only safety net for older browsers and isolated-world Navigation API differences.
  const interval = window.setInterval(checkNavigation, 1000);
  return {
    diagnostics(): string {
      // Structural, bounded diagnostics only: no text, URLs, IDs, classes or
      // arbitrary attribute values leave the page.
      if (disposed) return 'disposed';
      checkNavigation();
      const selection = window.getSelection();
      const describe = (node: Node | null) => {
        let element =
          node?.nodeType === 1 ? (node as Element) : node?.parentElement;
        const path: string[] = [];
        for (
          let depth = 0;
          element && depth < 16;
          depth++, element = element.parentElement
        ) {
          const role = element.getAttribute('data-message-author-role');
          const turn = element.getAttribute('data-turn');
          const safeRole = (value: string) =>
            ['assistant', 'user', 'system'].includes(value) ? value : 'other';
          path.push(
            element.tagName
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '')
              .slice(0, 30) +
              (role !== null ? `[author=${safeRole(role)}]` : '') +
              (turn !== null ? `[turn=${safeRole(turn)}]` : '') +
              (element.hasAttribute('contenteditable')
                ? '[editable-attribute]'
                : ''),
          );
        }
        return path.join(' > ') || 'none';
      };
      const result = readAssistantSelection(selection, document);
      return `Last capture: ${lastResult}; current: ${result.valid ? 'valid' : result.reason}; cached: ${captured ? 'yes' : 'no'}; focused: ${describe(document.activeElement)}; start: ${describe(selection?.anchorNode ?? null)}; end: ${describe(selection?.focusNode ?? null)}`;
    },
    getSelection(): CapturedSelection | null {
      if (disposed || checkNavigation()) return null;
      // A shortcut may arrive before the scheduled selection debounce finishes.
      // Flush only already-scheduled validation, using the same range/privacy rules.
      if (pending !== undefined) {
        window.clearTimeout(pending);
        process();
      }
      return captured;
    },
    clear,
    dispose() {
      if (disposed) return;
      clear();
      stale = null;
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('mouseup', schedule);
      document.removeEventListener('keyup', schedule);
      window.removeEventListener('popstate', checkNavigation);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      navigation?.removeEventListener('currententrychange', checkNavigation);
    },
  };
}
