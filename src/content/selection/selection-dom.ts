import type { SelectionResult } from './selection-types';
import { validateSelectionText } from './selection-validator';

const TURN = '[data-testid^="conversation-turn-"], [data-message-id]';
const MESSAGE = `[data-message-author-role], [data-turn], ${TURN}`;
const ASSISTANT_ACTION = 'button[data-testid="copy-turn-action-button"]';
const EXCLUDED =
  'input, textarea, select, button, form, nav, aside, [role="navigation"], [role="search"], [role="complementary"], [role="textbox"], [contenteditable]:not([contenteditable="false"]), [data-chatgpt-island-root]';

function elementFor(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function messageFor(node: Node): Element | null {
  let message = elementFor(node)?.closest(MESSAGE) ?? null;
  // ChatGPT can nest role-marked response blocks inside the same assistant turn.
  // Use that turn as the boundary, without crossing a differently authored region.
  while (message && isAssistant(message)) {
    const parent = message.parentElement?.closest(MESSAGE);
    if (!parent || !isAssistant(parent)) break;
    message = parent;
  }
  return message;
}

function hasSelectedText(element: Element, range: Range): boolean {
  const overlap = element.ownerDocument.createRange();
  overlap.selectNodeContents(element);
  if (range.compareBoundaryPoints(Range.START_TO_START, overlap) > 0)
    overlap.setStart(range.startContainer, range.startOffset);
  if (range.compareBoundaryPoints(Range.END_TO_END, overlap) < 0)
    overlap.setEnd(range.endContainer, range.endOffset);
  return Boolean(overlap.toString().trim());
}

function isAssistant(message: Element): boolean {
  const role =
    message.getAttribute('data-message-author-role') ??
    message.getAttribute('data-turn');
  if (role !== null) return role === 'assistant';
  // Some ChatGPT layouts omit author-role attributes. Require a bounded
  // message/turn container AND its assistant-only action, never generic prose,
  // Markdown classes, localized labels or the presence of any Copy button.
  return (
    message.matches(TURN) &&
    !message.querySelector(
      '[data-message-author-role="user"], [data-turn="user"]',
    ) &&
    Array.from(message.querySelectorAll(ASSISTANT_ACTION)).some(
      (control) => control.closest(TURN) === message,
    )
  );
}

// Inspect only the selected range and its ancestors, never all page messages.
export function readAssistantSelection(
  selection: Selection | null,
  document: Document,
): SelectionResult {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return { valid: false, reason: 'empty' };
  if (selection.rangeCount !== 1)
    return { valid: false, reason: 'multiple-ranges' };
  if (document.activeElement?.closest(EXCLUDED))
    return { valid: false, reason: 'excluded-region' };
  const range = selection.getRangeAt(0);
  const start = elementFor(range.startContainer);
  const end = elementFor(range.endContainer);
  const message = messageFor(range.startContainer);
  if (
    !start ||
    !end ||
    !message ||
    !isAssistant(message) ||
    messageFor(range.endContainer) !== message ||
    start.getRootNode() !== document ||
    end.getRootNode() !== document ||
    !message.isConnected
  ) {
    return { valid: false, reason: 'outside-assistant' };
  }
  if (start.closest(EXCLUDED) || end.closest(EXCLUDED))
    return { valid: false, reason: 'excluded-region' };
  // Endpoints alone would miss an editable field or nested unrelated region in between.
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (
      range.intersectsNode(element) &&
      ((element.matches(EXCLUDED) &&
        // Icon-only copy/expand controls inside a response card contribute no
        // selected text. Editable fields and other excluded regions stay strict.
        !(element.matches('button') && !hasSelectedText(element, range))) ||
        (element.matches(MESSAGE) && messageFor(element) !== message))
    ) {
      return { valid: false, reason: 'excluded-region' };
    }
    node = walker.nextNode();
  }
  return validateSelectionText(selection.toString());
}
