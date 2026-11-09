import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  createOpenAIAdapter,
  buildBackendRequest,
} from '../src/content/island/conversation/openai-adapter';
import type { AIRequest } from '../src/content/island/conversation/conversation-types';
import {
  AI_PORT,
  AI_ERRORS,
  BACKEND_URL,
  MAX_HISTORY_MESSAGES,
  MAX_TOTAL_CHARACTERS,
  MOCK_TEXTS,
  CLIENT_DEADLINE_MS,
} from '../src/shared/ai-contract';
import { registerAIRelay } from '../src/background/ai-relay';
function event<T>() {
  const listeners = new Set<(value: T) => unknown>();
  return {
    addListener: (fn: (value: T) => unknown) => {
      listeners.add(fn);
    },
    removeListener: (fn: (value: T) => unknown) => {
      listeners.delete(fn);
    },
    emit: async (value: T) => {
      await Promise.all([...listeners].map((fn) => fn(value)));
    },
    size: () => listeners.size,
  };
}
const request: AIRequest = {
  context: {
    text: 'Only the selection',
    sourceUrl: 'https://chatgpt.com/c/private-path',
    capturedAt: 123,
  },
  messages: [{ id: 'u', role: 'user', content: 'Explain.', createdAt: 1 }],
};
let connect: ReturnType<typeof vi.fn>;
let messages: ReturnType<typeof event<unknown>>;
let disconnected: ReturnType<typeof event<unknown>>;
let port: {
  name: string;
  onMessage: typeof messages;
  onDisconnect: typeof disconnected;
  postMessage: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  messages = event();
  disconnected = event();
  port = {
    name: AI_PORT,
    onMessage: messages,
    onDisconnect: disconnected,
    postMessage: vi.fn(),
    disconnect: vi.fn(),
  };
  connect = vi.fn(() => port);
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-extension', connect, lastError: undefined },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('strips source metadata and mock responses from the bounded wire request', () => {
  const body = buildBackendRequest({
    ...request,
    messages: [
      ...request.messages,
      {
        id: 'm',
        role: 'assistant',
        content: MOCK_TEXTS[0],
        createdAt: 2,
        kind: 'mock',
      },
      { id: 'followup', role: 'user', content: 'Follow-up', createdAt: 3 },
    ],
  });
  expect(body).toEqual({
    context: { text: request.context.text },
    messages: [{ role: 'user', content: 'Follow-up' }],
  });
  expect(JSON.stringify(body)).not.toContain('private-path');
  expect(JSON.stringify(body)).not.toContain('capturedAt');
});
it('retains recent ordered real turns and current question within history limits', () => {
  const history = Array.from({ length: 40 }, (_, index) => ({
    id: String(index),
    role: index % 2 ? ('assistant' as const) : ('user' as const),
    content: String(index),
    createdAt: index,
    kind: 'ai' as const,
  }));
  const body = buildBackendRequest({
    ...request,
    messages: [...history, request.messages[0]],
  });
  expect(body.messages).toHaveLength(MAX_HISTORY_MESSAGES);
  expect(body.messages.at(-1)?.content).toBe('Explain.');
  expect(body.messages[0].content).toBe('20');
  const long = buildBackendRequest({
    ...request,
    messages: [
      ...history.map((message) => ({ ...message, content: 'x'.repeat(7000) })),
      request.messages[0],
    ],
  });
  expect(
    long.messages.reduce(
      (sum, message) => sum + message.content.length,
      long.context.text.length,
    ),
  ).toBeLessThanOrEqual(MAX_TOTAL_CHARACTERS);
});
it('sends one typed port request, resolves real text and cleans listeners', async () => {
  const result = createOpenAIAdapter().generateResponse(request);
  expect(connect).toHaveBeenCalledExactlyOnceWith({ name: AI_PORT });
  expect(port.postMessage).toHaveBeenCalledExactlyOnceWith({
    type: 'AI_REQUEST',
    request: buildBackendRequest(request),
  });
  await messages.emit({ text: 'Real response fixture' });
  expect(await result).toBe('Real response fixture');
  expect(port.disconnect).toHaveBeenCalledOnce();
  expect(messages.size()).toBe(0);
});
it('maps safe backend error codes without displaying raw fields', async () => {
  const result = createOpenAIAdapter().generateResponse(request);
  const assertion = expect(result).rejects.toThrow(AI_ERRORS.rate_limit);
  await messages.emit({
    error: 'rate_limit',
    stack: 'PRIVATE',
    apiKey: 'not-exposed',
  });
  await assertion;
});
it('handles backend/worker unavailability, empty output and explicit timeout', async () => {
  let result = createOpenAIAdapter().generateResponse(request);
  let assertion = expect(result).rejects.toThrow(AI_ERRORS.backend_unavailable);
  await disconnected.emit(undefined);
  await assertion;
  result = createOpenAIAdapter().generateResponse(request);
  assertion = expect(result).rejects.toThrow(AI_ERRORS.empty_response);
  await messages.emit({ text: '' });
  await assertion;
  vi.useFakeTimers();
  result = createOpenAIAdapter().generateResponse(request);
  assertion = expect(result).rejects.toThrow(AI_ERRORS.timeout);
  await vi.advanceTimersByTimeAsync(CLIENT_DEADLINE_MS);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});
it('abort closes the port and makes late responses unable to settle the old request', async () => {
  const abort = new AbortController();
  const result = createOpenAIAdapter().generateResponse(request, abort.signal);
  const assertion = expect(result).rejects.toMatchObject({
    name: 'AbortError',
  });
  abort.abort();
  await assertion;
  await messages.emit({ text: 'Late answer' });
  expect(port.disconnect).toHaveBeenCalledOnce();
  expect(messages.size()).toBe(0);
});
it('validates relay senders, fixes the target URL and permits one HTTP call per port', async () => {
  const onConnect = event<chrome.runtime.Port>();
  vi.stubGlobal('chrome', { runtime: { id: 'test-extension', onConnect } });
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ text: 'Backend text' }),
  });
  vi.stubGlobal('fetch', fetch);
  registerAIRelay();
  registerAIRelay();
  expect(onConnect.size()).toBe(1);
  const workerPort = {
    ...port,
    sender: {
      id: 'test-extension',
      frameId: 0,
      url: 'https://chatgpt.com/c/test',
    },
  };
  await onConnect.emit(workerPort as unknown as chrome.runtime.Port);
  const message = { type: 'AI_REQUEST', request: buildBackendRequest(request) };
  await messages.emit(message);
  await messages.emit(message);
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0][0]).toBe(BACKEND_URL);
  expect(fetch.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    signal: expect.any(AbortSignal),
  });
  expect(port.postMessage).toHaveBeenCalledWith({ text: 'Backend text' });
  await disconnected.emit(undefined);
  let networkSignal: AbortSignal | undefined;
  fetch.mockImplementation((_url: string, options: RequestInit) => {
    networkSignal = options.signal as AbortSignal;
    return new Promise((_resolve, reject) =>
      networkSignal!.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      ),
    );
  });
  await onConnect.emit(workerPort as unknown as chrome.runtime.Port);
  const pending = messages.emit(message);
  await disconnected.emit(undefined);
  await pending;
  expect(networkSignal?.aborted).toBe(true);
  expect(port.postMessage).toHaveBeenCalledTimes(1);
  const bad = {
    ...workerPort,
    sender: { ...workerPort.sender, url: 'https://evil.test' },
  };
  await onConnect.emit(bad as unknown as chrome.runtime.Port);
  expect(port.disconnect).toHaveBeenCalledOnce();
});
