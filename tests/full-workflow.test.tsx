import { act, fireEvent, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createApp } from '../server/src/app';
import type { ResponsesClient } from '../server/src/openai-service';
import { createSelectionManager } from '../src/content/selection/selection-manager';
import { createIslandTrigger } from '../src/content/island-trigger';
import { createIslandController } from '../src/content/island/island-controller';
import { handleCommand } from '../src/background/commands';
import { buildBackendRequest } from '../src/content/island/conversation/context-manager';

it('runs fixture selection, command, React UI, validated backend and follow-up without collecting original conversation', async () => {
  vi.stubGlobal('location', new URL('https://chatgpt.com/c/fixture'));
  const origin = `chrome-extension://${'a'.repeat(32)}`;
  const create = vi.fn(async () => ({
    status: 'completed',
    output_text: 'Mocked provider answer',
  }));
  const app = createApp(
    { model: 'gpt-4.1-mini', extensionOrigin: origin, port: 8787 },
    { client: { responses: { create } } as unknown as ResponsesClient },
  );
  const controller = createIslandController(document, {
    kind: 'ai',
    generateResponse: async (request) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers: {
          origin,
          host: '127.0.0.1:8787',
          'content-type': 'application/json',
        },
        payload: buildBackendRequest(request),
      });
      expect(response.statusCode).toBe(200);
      return response.json().text as string;
    },
  });
  const manager = createSelectionManager({
    window,
    document,
    onClear: () => controller.close(false),
  });
  const trigger = createIslandTrigger({
    getSelection: manager.getSelection,
    getUrl: () => location.href,
    isContextValid: () => true,
    onOpen: controller.open,
  });
  vi.stubGlobal('chrome', {
    tabs: { sendMessage: vi.fn(async () => trigger()) },
  });
  const original = document.createElement('main');
  original.innerHTML =
    '<div data-message-author-role="user">PRIVATE USER MESSAGE</div><article data-turn="assistant"><p id="selected">Selected <strong>technical</strong> text</p><p>PRIVATE UNSELECTED TEXT</p></article><textarea aria-label="Original input"></textarea>';
  document.body.append(original);
  const before = original.innerHTML;
  try {
    const range = document.createRange();
    range.selectNodeContents(original.querySelector('#selected')!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await vi.waitFor(() =>
      expect(manager.getSelection()?.text).toBe('Selected technical text'),
    );
    const command = () =>
      handleCommand('open-island', {
        id: 1,
        active: true,
        url: location.href,
      } as chrome.tabs.Tab);
    await act(async () => {
      expect(await command()).toBe('triggered');
    });
    const host = document.querySelector<HTMLElement>(
      '[data-chatgpt-island-root]',
    )!;
    const ui = within(host.shadowRoot!.querySelector('div')!);
    expect(host.shadowRoot!.activeElement).toBe(ui.getByRole('textbox'));
    fireEvent.click(
      ui.getByRole('checkbox', {
        name: 'Allow AI processing for this temporary conversation',
      }),
    );
    for (const question of ['Explain simply', 'Give an example']) {
      fireEvent.change(ui.getByRole('textbox'), {
        target: { value: question },
      });
      await act(async () =>
        fireEvent.keyDown(ui.getByRole('textbox'), { key: 'Enter' }),
      );
      await vi.waitFor(() =>
        expect(ui.getAllByText('Mocked provider answer')).toHaveLength(
          question === 'Explain simply' ? 1 : 2,
        ),
      );
    }
    expect(create).toHaveBeenCalledTimes(2);
    const request = create.mock.calls[1] as unknown as [{ input: unknown[] }];
    expect(request[0].input).toEqual([
      {
        role: 'user',
        content: JSON.stringify({ reference_text: 'Selected technical text' }),
      },
      { role: 'user', content: 'Explain simply' },
      { role: 'assistant', content: 'Mocked provider answer' },
      { role: 'user', content: 'Give an example' },
    ]);
    expect(JSON.stringify(create.mock.calls)).not.toMatch(
      /PRIVATE|capturedAt|sourceUrl/,
    );
    await act(async () => {
      await command();
    });
    expect(
      document.querySelectorAll('[data-chatgpt-island-root]'),
    ).toHaveLength(1);
    act(() => controller.close());
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await command();
      });
      act(() => controller.close());
      expect(document.querySelector('[data-chatgpt-island-root]')).toBeNull();
    }
    expect(original.innerHTML).toBe(before);
    expect(original.querySelector('textarea')!.value).toBe('');
    expect(create).toHaveBeenCalledTimes(2);
  } finally {
    manager.dispose();
    act(() => controller.dispose());
    original.remove();
    await app.close();
    vi.unstubAllGlobals();
  }
});
