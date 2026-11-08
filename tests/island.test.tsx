import { act, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createIslandController } from '../src/content/island/island-controller';
import { createIslandTrigger } from '../src/content/island-trigger';
import { PLACEHOLDER_RESPONSE } from '../src/content/island/island-types';
import {
  fitWindow,
  initialWindow,
  resizeWindow,
  expandedWindow,
} from '../src/content/island/window-geometry';
import { hostTheme } from '../src/content/island/theme';

let controller: ReturnType<typeof createIslandController>;
const payload = {
  selectedText: 'RAG grounds responses in relevant information.',
  sourceUrl: 'https://chatgpt.com/c/one',
  triggeredAt: 1,
};
const viewport = { x: 0, y: 0, width: 1200, height: 800 };
beforeEach(() => {
  controller = createIslandController(document);
});
afterEach(() => {
  act(() => controller.dispose());
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});
function open(selectedText = payload.selectedText) {
  act(() => controller.open({ ...payload, selectedText }));
  const host = document.querySelector<HTMLElement>(
    '[data-chatgpt-island-root]',
  )!;
  return {
    host,
    shadow: host.shadowRoot!,
    ui: within(host.shadowRoot!.querySelector('div')!),
  };
}
it('opens from a valid trigger with selected context and focused composer', () => {
  const trigger = createIslandTrigger({
    getUrl: () => payload.sourceUrl,
    getSelection: () => ({
      text: payload.selectedText,
      sourceUrl: payload.sourceUrl,
      capturedAt: 1,
      sourceType: 'assistant-message',
    }),
    isContextValid: () => true,
    onOpen: controller.open,
  });
  act(() => {
    expect(trigger()).toEqual({ status: 'triggered' });
  });
  const host = document.querySelector('[data-chatgpt-island-root]')!;
  expect(host.shadowRoot!.textContent).toContain(payload.selectedText);
  expect(host.shadowRoot!.activeElement).toHaveAttribute(
    'aria-label',
    'Ask about the selected text',
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('disables empty submission and adds one local question/placeholder with Enter', () => {
  const { ui } = open();
  const field = ui.getByRole('textbox');
  expect(ui.getByRole('button', { name: 'Send question' })).toBeDisabled();
  fireEvent.change(field, { target: { value: '  ' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(ui.queryByText('Development placeholder')).toBeNull();
  fireEvent.change(field, { target: { value: 'Explain this part.' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(ui.getByText('Explain this part.')).toBeInTheDocument();
  expect(ui.getByText('Development placeholder')).toBeInTheDocument();
  expect(ui.getByText(PLACEHOLDER_RESPONSE)).toBeInTheDocument();
  expect(field).toHaveValue('');
});
it('leaves Shift+Enter and IME Enter to native editing without submitting', () => {
  const { ui } = open();
  const field = ui.getByRole('textbox');
  fireEvent.change(field, { target: { value: 'First' } });
  expect(fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })).toBe(true);
  expect(fireEvent.keyDown(field, { key: 'Enter', isComposing: true })).toBe(
    true,
  );
  expect(ui.queryByText('Development placeholder')).toBeNull();
  fireEvent.change(field, { target: { value: 'First\nSecond' } });
  expect(field).toHaveValue('First\nSecond');
});
it('closes, removes the host, restores focus and reopens with fresh conversation state', () => {
  const before = document.createElement('button');
  document.body.append(before);
  before.focus();
  const { ui } = open();
  fireEvent.change(ui.getByRole('textbox'), {
    target: { value: 'Old question' },
  });
  fireEvent.click(ui.getByRole('button', { name: 'Send question' }));
  fireEvent.click(ui.getByRole('button', { name: 'Close island' }));
  expect(document.querySelector('[data-chatgpt-island-root]')).toBeNull();
  expect(document.activeElement).toBe(before);
  const reopened = open();
  expect(reopened.ui.queryByText('Old question')).toBeNull();
  before.remove();
});
it('keeps a single root and conversation for repeated identical context, replacing only new context', () => {
  const { host, ui } = open();
  fireEvent.change(ui.getByRole('textbox'), {
    target: { value: 'Keep draft' },
  });
  open();
  expect(document.querySelectorAll('[data-chatgpt-island-root]')).toHaveLength(
    1,
  );
  expect(document.querySelector('[data-chatgpt-island-root]')).toBe(host);
  expect(ui.getByRole('textbox')).toHaveValue('Keep draft');
  open('A different excerpt');
  expect(ui.getByRole('textbox')).toHaveValue('');
  expect(ui.queryByText(payload.selectedText)).toBeNull();
  expect(ui.getByText('A different excerpt')).toBeInTheDocument();
});
it('closes with Escape inside the island without a global Escape listener', () => {
  const { ui } = open();
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(ui.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(ui.getByRole('textbox'), { key: 'Escape' });
  expect(document.querySelector('[data-chatgpt-island-root]')).toBeNull();
});
it('renders untrusted context and questions as text, never markup', () => {
  const injection = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
  const { shadow, ui } = open(injection);
  expect(ui.getByText(injection)).toBeInTheDocument();
  expect(shadow.querySelector('img, script')).toBeNull();
  fireEvent.change(ui.getByRole('textbox'), { target: { value: injection } });
  fireEvent.click(ui.getByRole('button', { name: 'Send question' }));
  expect(shadow.querySelector('img, script')).toBeNull();
});
it('expands/restores window geometry and keeps it when context is replaced', () => {
  const { ui } = open();
  const dialog = ui.getByRole('dialog');
  const original = dialog.getAttribute('style');
  fireEvent.click(ui.getByRole('button', { name: 'Expand island' }));
  expect(dialog.getAttribute('style')).not.toBe(original);
  fireEvent.click(ui.getByRole('button', { name: 'Restore island' }));
  expect(dialog.getAttribute('style')).toBe(original);
  const header = ui.getByLabelText('Move ChatGPT Island with arrow keys');
  fireEvent.keyDown(header, { key: 'ArrowLeft' });
  const moved = dialog.getAttribute('style');
  open('New selection');
  expect(dialog.getAttribute('style')).toBe(moved);
});
it('adopts explicit host light/dark themes and updates on attribute changes', async () => {
  document.documentElement.className = 'dark';
  const { host } = open();
  expect(host.dataset.theme).toBe('dark');
  await act(async () => {
    document.documentElement.className = 'light';
  });
  expect(host.dataset.theme).toBe('light');
});
it('uses system dark mode as the fallback', () => {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    colorScheme: 'normal',
  } as CSSStyleDeclaration);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  expect(hostTheme(document, window)).toBe('dark');
  vi.unstubAllGlobals();
});
it('clamps drag geometry to visible viewport bounds', () => {
  const rect = fitWindow(
    { x: -100, y: 9999, width: 460, height: 520 },
    viewport,
  );
  expect(rect).toEqual({ x: 12, y: 268, width: 460, height: 520 });
});
it('enforces resize minimums and preserves the upper-left corner at maximum size', () => {
  const initial = initialWindow(viewport);
  expect(resizeWindow(initial, -9999, -9999, viewport)).toMatchObject({
    width: 340,
    height: 300,
  });
  const large = resizeWindow(initial, 9999, 9999, viewport);
  expect(large.x).toBe(initial.x);
  expect(large.y).toBe(initial.y);
  expect(large.x + large.width).toBeLessThanOrEqual(1188);
});
it('adapts default/expanded/minimum geometry to small and offset visual viewports', () => {
  for (const viewport of [
    { x: 0, y: 0, width: 320, height: 400 },
    { x: 20, y: 150, width: 280, height: 240 },
  ]) {
    for (const rect of [initialWindow(viewport), expandedWindow(viewport)]) {
      expect(rect.x).toBeGreaterThanOrEqual(viewport.x);
      expect(rect.y).toBeGreaterThanOrEqual(viewport.y);
      expect(rect.x + rect.width).toBeLessThanOrEqual(
        viewport.x + viewport.width,
      );
      expect(rect.y + rect.height).toBeLessThanOrEqual(
        viewport.y + viewport.height,
      );
    }
  }
});
