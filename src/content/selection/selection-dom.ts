import type { SelectionResult } from './selection-types';
import { validateSelectionText } from './selection-validator';

const MESSAGE = '[data-message-author-role], article[data-turn]';
const EXCLUDED =
  'input, textarea, select, button, form, nav, aside, [role="navigation"], [role="search"], [role="complementary"], [role="textbox"], [contenteditable]:not([contenteditable="false"]), [data-chatgpt-island-root]';

function elementFor(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function messageFor(node: Node): Element | null {
  return elementFor(node)?.closest(MESSAGE) ?? null;
}

function isAssistant(message: Element): boolean {
  const role =
    message.getAttribute('data-message-author-role') ??
    message.getAttribute('data-turn');
  return role === 'assistant';
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
      (element.matches(EXCLUDED) ||
        (element.matches(MESSAGE) && element !== message))
    ) {
      return { valid: false, reason: 'excluded-region' };
    }
    node = walker.nextNode();
  }
  return validateSelectionText(selection.toString());
}
