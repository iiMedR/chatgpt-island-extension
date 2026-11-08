// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../server/src/app';
import type { ResponsesClient } from '../server/src/openai-service';
import { registerAIRelay } from '../src/background/ai-relay';
import { createOpenAIAdapter } from '../src/content/island/conversation/openai-adapter';
import { createConversationManager } from '../src/content/island/conversation/conversation-manager';
import { BACKEND_URL } from '../src/shared/ai-contract';
function event<T>() {
  const listeners = new Set<(value: T) => unknown>();
  return {
    addListener: (fn: (value: T) => unknown) => {
      listeners.add(fn);
    },
    removeListener: (fn: (value: T) => unknown) => {
      listeners.delete(fn);
    },
    emit(value: T) {
      for (const fn of [...listeners]) void fn(value);
    },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('runs manager → content adapter → worker → validated backend → mocked Responses SDK for ordered follow-ups', async () => {
  const origin = `chrome-extension://${'a'.repeat(32)}`;
  const create = vi.fn().mockResolvedValue({
    status: 'completed',
    output_text: 'SDK answer fixture',
  });
  const app = createApp(
    { model: 'gpt-4.1-mini', port: 8787, extensionOrigin: origin },
    { client: { responses: { create } } as unknown as ResponsesClient },
  );
  const onConnect = event<chrome.runtime.Port>();
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).toBe(BACKEND_URL);
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: {
        origin,
        host: '127.0.0.1:8787',
        'content-type': 'application/json',
      },
      payload: String(options.body),
    });
    return {
      ok: response.statusCode === 200,
      json: async () => response.json(),
    };
  });
  const connect = () => {
    const contentMessages = event<unknown>();
    const workerMessages = event<unknown>();
    const contentDisconnect = event<unknown>();
    const workerDisconnect = event<unknown>();
    let closed = false;
    const disconnect = () => {
      if (closed) return;
      closed = true;
      contentDisconnect.emit(undefined);
      workerDisconnect.emit(undefined);
    };
    const content = {
      onMessage: contentMessages,
      onDisconnect: contentDisconnect,
      disconnect,
      postMessage: (value: unknown) => workerMessages.emit(value),
    };
    const worker = {
      name: 'island-ai',
      sender: {
        id: 'test-extension',
        frameId: 0,
        url: 'https://chatgpt.com/c/test',
      },
      onMessage: workerMessages,
      onDisconnect: workerDisconnect,
      disconnect,
      postMessage: (value: unknown) => contentMessages.emit(value),
    };
    onConnect.emit(worker as unknown as chrome.runtime.Port);
    return content;
  };
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-extension', onConnect, connect, lastError: undefined },
  });
  vi.stubGlobal('fetch', fetch);
  registerAIRelay();
  const manager = createConversationManager(
    {
      text: 'Selected reference',
      sourceUrl: 'https://chatgpt.com/c/private',
      capturedAt: 12,
    },
    createOpenAIAdapter(),
  );
  try {
    manager.setInput('Explain this.');
    expect(await manager.submit()).toBe('success');
    manager.setInput('A follow-up?');
    expect(await manager.submit()).toBe('success');
    expect(create).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    const provider = create.mock.calls[1][0];
    expect(provider).toMatchObject({
      model: 'gpt-4.1-mini',
      store: false,
      stream: false,
    });
    expect(provider.input).toEqual([
      {
        role: 'user',
        content: JSON.stringify({ reference_text: 'Selected reference' }),
      },
      { role: 'user', content: 'Explain this.' },
      { role: 'assistant', content: 'SDK answer fixture' },
      { role: 'user', content: 'A follow-up?' },
    ]);
    expect(JSON.stringify(provider)).not.toContain('private');
    expect(JSON.stringify(provider)).not.toContain('capturedAt');
    expect(
      manager
        .getSnapshot()
        .conversation!.messages.filter(
          (message) => message.role === 'assistant',
        )
        .every((message) => message.kind === 'ai'),
    ).toBe(true);
    expect(manager.getSnapshot().conversation!.messages).toHaveLength(4);
  } finally {
    manager.dispose();
    await app.close();
  }
});
