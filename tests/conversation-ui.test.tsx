import { act, fireEvent, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createIslandController } from '../src/content/island/island-controller';
import type {
  AIAdapter,
  AIRequest,
} from '../src/content/island/conversation/conversation-types';
import { MOCK_RESPONSE } from '../src/content/island/conversation/mock-ai-adapter';
import { REQUEST_ERROR } from '../src/content/island/conversation/conversation-manager';

const payload = {
  selectedText: 'Selected  excerpt\nwith code',
  sourceUrl: 'https://chatgpt.com/c/one',
  capturedAt: 42,
  triggeredAt: 43,
};
let controller: ReturnType<typeof createIslandController> | undefined;
afterEach(() => {
  act(() => controller?.dispose());
  controller = undefined;
  document.body.innerHTML = '';
});
function setup(adapter?: AIAdapter) {
  controller = createIslandController(document, adapter);
  act(() => controller!.open(payload));
  const shadow = document.querySelector(
    '[data-chatgpt-island-root]',
  )!.shadowRoot!;
  return { shadow, ui: within(shadow.querySelector('div')!) };
}
async function send(ui: ReturnType<typeof within>, text: string) {
  fireEvent.change(ui.getByRole('textbox'), { target: { value: text } });
  await act(async () => {
    fireEvent.keyDown(ui.getByRole('textbox'), { key: 'Enter' });
  });
}
function pendingResponse() {
  let resolve!: (response: string) => void;
  const promise = new Promise<string>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
it('renders ordered follow-ups with preserved context and a snapshot request, then focuses/clears the composer', async () => {
  const generateResponse = vi.fn<AIAdapter['generateResponse']>(
    async () => MOCK_RESPONSE,
  );
  const { ui, shadow } = setup({ generateResponse });
  await send(ui, ' Explain this part. ');
  await send(ui, 'What is the next step?');
  expect(ui.getAllByText('Development placeholder')).toHaveLength(2);
  const request = generateResponse.mock.calls[1][0];
  expect(request.context).toEqual({
    text: payload.selectedText,
    sourceUrl: payload.sourceUrl,
    capturedAt: 42,
  });
  expect(request.messages.map((message) => message.content)).toEqual([
    'Explain this part.',
    MOCK_RESPONSE,
    'What is the next step?',
  ]);
  expect(ui.getByLabelText('Selected text context')).toHaveTextContent(
    'Selected excerpt with code',
  );
  expect(ui.getByRole('textbox')).toHaveValue('');
  expect(shadow.activeElement).toBe(ui.getByRole('textbox'));
});
it('shows the length limit without silently truncating or submitting an oversized draft', async () => {
  const generateResponse = vi.fn(async () => MOCK_RESPONSE);
  const { ui } = setup({ generateResponse });
  const field = ui.getByRole('textbox');
  await send(ui, 'x'.repeat(8001));
  expect(field).toHaveValue('x'.repeat(8001));
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(ui.getByText(/Questions must be 8,000/)).toBeInTheDocument();
  expect(ui.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(generateResponse).not.toHaveBeenCalled();
  await send(ui, 'x'.repeat(8000));
  expect(generateResponse).toHaveBeenCalledOnce();
  expect(field).toHaveValue('');
});
it('shows a safe inline error, retains the question and retries without duplicating it', async () => {
  const generateResponse = vi
    .fn()
    .mockRejectedValueOnce(new Error('secret request content'))
    .mockResolvedValueOnce(MOCK_RESPONSE);
  const { ui } = setup({ generateResponse });
  await send(ui, 'Keep my question');
  expect(ui.getByRole('alert')).toHaveTextContent(REQUEST_ERROR);
  expect(ui.queryByText('secret request content')).toBeNull();
  expect(ui.getByRole('textbox')).toHaveValue('Keep my question');
  await act(async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Retry question' }));
  });
  expect(ui.queryByRole('alert')).toBeNull();
  expect(ui.getAllByText('Keep my question')).toHaveLength(1);
  expect(ui.getByText(MOCK_RESPONSE)).toBeInTheDocument();
});
it('locks pending input and prevents duplicate submission events', async () => {
  const pending = pendingResponse();
  const generateResponse = vi.fn(() => pending.promise);
  const { ui } = setup({ generateResponse });
  await send(ui, 'One question');
  expect(ui.getByRole('textbox')).toHaveAttribute('readonly');
  expect(ui.getByRole('button', { name: 'Send question' })).toBeDisabled();
  fireEvent.keyDown(ui.getByRole('textbox'), { key: 'Enter' });
  fireEvent.click(ui.getByRole('button', { name: 'Send question' }));
  expect(generateResponse).toHaveBeenCalledOnce();
  await act(async () => {
    pending.resolve(MOCK_RESPONSE);
  });
  expect(ui.getByRole('textbox')).not.toHaveAttribute('readonly');
  expect(ui.getByText(MOCK_RESPONSE)).toBeInTheDocument();
});
it('drops a pending response on new context, retains window geometry and preserves repeated same-context state', async () => {
  const pending = pendingResponse();
  let oldSignal: AbortSignal | undefined;
  const generateResponse = vi.fn(
    (_request: AIRequest, signal?: AbortSignal) => {
      oldSignal = signal;
      return pending.promise;
    },
  );
  const { ui } = setup({ generateResponse });
  await send(ui, 'Old question');
  const dialog = ui.getByRole('dialog');
  const geometry = dialog.getAttribute('style');
  act(() =>
    controller!.open({
      ...payload,
      selectedText: 'New context',
      capturedAt: 77,
    }),
  );
  expect(oldSignal!.aborted).toBe(true);
  expect(ui.queryByText('Old question')).toBeNull();
  expect(ui.getByText('New context')).toBeInTheDocument();
  expect(dialog.getAttribute('style')).toBe(geometry);
  await act(async () => {
    pending.resolve('Stale answer');
  });
  expect(ui.queryByText('Stale answer')).toBeNull();
  fireEvent.change(ui.getByRole('textbox'), { target: { value: 'New draft' } });
  act(() =>
    controller!.open({
      ...payload,
      selectedText: 'New context',
      capturedAt: 78,
    }),
  );
  expect(ui.getByRole('textbox')).toHaveValue('New draft');
  expect(document.querySelectorAll('[data-chatgpt-island-root]')).toHaveLength(
    1,
  );
  generateResponse.mockResolvedValueOnce(MOCK_RESPONSE);
  await send(ui, 'New question');
  const request = generateResponse.mock.calls[1][0];
  expect(request.context).toMatchObject({
    text: 'New context',
    capturedAt: 77,
  });
  expect(request.messages.map((message) => message.content)).toEqual([
    'New question',
  ]);
});
it('close invalidates pending work; reopening is fresh and original page content is untouched', async () => {
  document.body.innerHTML =
    '<div data-message-author-role="assistant">Original answer</div><textarea id="original">Original draft</textarea>';
  const before = document.body.innerHTML;
  const pending = pendingResponse();
  const { ui } = setup({ generateResponse: () => pending.promise });
  await send(ui, 'A question');
  fireEvent.click(ui.getByRole('button', { name: 'Close island' }));
  expect(document.querySelector('[data-chatgpt-island-root]')).toBeNull();
  act(() => controller!.open(payload));
  await act(async () => {
    pending.resolve('Must not reappear');
  });
  const reopened = within(
    document
      .querySelector('[data-chatgpt-island-root]')!
      .shadowRoot!.querySelector('div')!,
  );
  expect(reopened.queryByText('A question')).toBeNull();
  expect(reopened.queryByText('Must not reappear')).toBeNull();
  expect(reopened.getByRole('textbox')).toHaveValue('');
  expect(document.body.innerHTML).toBe(before);
  expect(document.querySelector<HTMLTextAreaElement>('#original')!.value).toBe(
    'Original draft',
  );
});
it('does not force a reader back to the bottom after they scroll up', async () => {
  const { ui } = setup();
  const region = ui.getByRole('region', { name: 'Island conversation' });
  Object.defineProperties(region, {
    scrollHeight: { value: 1000, configurable: true },
    clientHeight: { value: 200, configurable: true },
  });
  region.scrollTop = 100;
  fireEvent.scroll(region);
  await send(ui, 'A question while reading history');
  expect(region.scrollTop).toBe(100);
  region.scrollTop = 800;
  fireEvent.scroll(region);
  await send(ui, 'At the bottom');
  expect(region.scrollTop).toBe(1000);
});
it('renders malicious-looking input safely through the request and message lifecycle', async () => {
  const { ui, shadow } = setup();
  const text = '<img src=x onerror=alert(1)><script>test()</script>';
  await send(ui, text);
  expect(ui.getByText(text)).toBeInTheDocument();
  expect(shadow.querySelector('img,script')).toBeNull();
});
it('labels real-adapter responses as Assistant and shows the transmission notice', async () => {
  const { ui } = setup({
    kind: 'ai',
    generateResponse: async () => 'Provider response fixture',
  });
  await send(ui, 'Explain');
  expect(ui.getByText('Assistant')).toBeInTheDocument();
  expect(ui.queryByText('Development placeholder')).toBeNull();
  expect(
    ui.getByText('Selected context and island messages are sent to OpenAI.'),
  ).toBeInTheDocument();
});
