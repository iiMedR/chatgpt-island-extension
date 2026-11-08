import { afterEach, expect, it, vi } from 'vitest';
import {
  createConversationManager,
  MAX_MESSAGE_LENGTH,
  REQUEST_ERROR,
  validateQuestion,
} from '../src/content/island/conversation/conversation-manager';
import type { ConversationManager } from '../src/content/island/conversation/conversation-manager';
import type {
  AIAdapter,
  AIRequest,
  SelectionContext,
} from '../src/content/island/conversation/conversation-types';
import { buildAIRequest } from '../src/content/island/conversation/request-builder';
import {
  MOCK_RESPONSE,
  mockAIAdapter,
} from '../src/content/island/conversation/mock-ai-adapter';

const context: SelectionContext = {
  text: 'Selected  text\nwith <code>.',
  sourceUrl: 'https://chatgpt.com/c/one',
  capturedAt: 123,
};
const managers: ConversationManager[] = [];
afterEach(() => {
  managers.forEach((manager) => manager.dispose());
  managers.length = 0;
  vi.restoreAllMocks();
});
function create(adapter: AIAdapter = mockAIAdapter) {
  const manager = createConversationManager(context, adapter);
  managers.push(manager);
  return manager;
}
function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<string>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
it.each(['', ' ', '\n\t'])(
  'rejects empty/whitespace input %j without an adapter request',
  async (input) => {
    const generateResponse = vi.fn();
    const manager = create({ generateResponse });
    manager.setInput(input);
    expect(await manager.submit()).toBe('invalid');
    expect(generateResponse).not.toHaveBeenCalled();
    expect(manager.getSnapshot().conversation!.messages).toHaveLength(0);
  },
);
it('enforces the exact normalized 8,000-unit boundary and trims only question boundaries', async () => {
  const manager = create();
  manager.setInput('x'.repeat(MAX_MESSAGE_LENGTH + 1));
  expect(await manager.submit()).toBe('invalid');
  manager.setInput('  ' + 'x'.repeat(MAX_MESSAGE_LENGTH) + '\n');
  expect(await manager.submit()).toBe('success');
  expect(manager.getSnapshot().conversation!.messages[0].content).toHaveLength(
    8000,
  );
  expect(validateQuestion('  first\n  second  ')).toEqual({
    valid: true,
    text: 'first\n  second',
  });
});
it('preserves selection metadata and builds ordered follow-up requests with one dedicated context', async () => {
  const generateResponse = vi.fn(async () => MOCK_RESPONSE);
  const manager = create({ generateResponse });
  const firstId = manager.getSnapshot().conversation!.id;
  manager.setInput(' Explain this part. ');
  expect(await manager.submit()).toBe('success');
  manager.setInput('A follow-up?');
  expect(await manager.submit()).toBe('success');
  const first = generateResponse.mock.calls[0] as unknown as [AIRequest];
  const second = generateResponse.mock.calls[1] as unknown as [AIRequest];
  expect(first[0].context).toEqual(context);
  expect(second[0].context).toEqual(context);
  expect(first[0].messages.map((message) => message.content)).toEqual([
    'Explain this part.',
  ]);
  expect(second[0].messages.map((message) => message.content)).toEqual([
    'Explain this part.',
    MOCK_RESPONSE,
    'A follow-up?',
  ]);
  expect(second[0].messages.map((message) => message.role)).toEqual([
    'user',
    'assistant',
    'user',
  ]);
  expect(
    second[0].messages.every((message) => message.content !== context.text),
  ).toBe(true);
  const conversation = manager.getSnapshot().conversation!;
  expect(conversation.id).toBe(firstId);
  expect(conversation.context).toEqual(context);
  expect(new Set(conversation.messages.map((message) => message.id)).size).toBe(
    4,
  );
  expect(manager.getSnapshot()).toMatchObject({
    input: '',
    status: 'success',
    error: null,
  });
});
it('request builder creates immutable copies and excludes unrelated fields', () => {
  const conversation = {
    id: 'local',
    context: { ...context, unrelated: 'never include' },
    createdAt: 1,
    messages: [
      {
        id: 'q',
        role: 'user' as const,
        content: 'Question',
        createdAt: 2,
        unrelated: 'omit',
      },
    ],
  };
  const request = buildAIRequest(conversation);
  expect(request).toEqual({
    context,
    messages: [{ id: 'q', role: 'user', content: 'Question', createdAt: 2 }],
  });
  expect(request.context).not.toBe(conversation.context);
  expect(request.messages[0]).not.toBe(conversation.messages[0]);
  expect(Object.isFrozen(request)).toBe(true);
  expect(Object.isFrozen(request.messages)).toBe(true);
  expect(Object.isFrozen(request.context)).toBe(true);
  expect(Object.isFrozen(request.messages[0])).toBe(true);
});
it('mock adapter is deterministic, local, and respects cancellation', async () => {
  const request: AIRequest = { context, messages: [] };
  const fetch = vi.spyOn(globalThis, 'fetch');
  expect(await mockAIAdapter.generateResponse(request)).toBe(MOCK_RESPONSE);
  expect(await mockAIAdapter.generateResponse(request)).toBe(MOCK_RESPONSE);
  expect(fetch).not.toHaveBeenCalled();
  const controller = new AbortController();
  controller.abort();
  await expect(
    mockAIAdapter.generateResponse(request, controller.signal),
  ).rejects.toThrow();
});
it('prevents concurrent duplicate submissions synchronously and keeps the input stable while pending', async () => {
  const pending = deferred();
  const generateResponse = vi.fn(() => pending.promise);
  const manager = create({ generateResponse });
  manager.setInput('Question');
  const result = manager.submit();
  expect(manager.getSnapshot().status).toBe('submitting');
  expect(await manager.submit()).toBe('busy');
  manager.setInput('Should not replace pending input');
  expect(manager.getSnapshot().input).toBe('Question');
  expect(generateResponse).toHaveBeenCalledOnce();
  pending.resolve(MOCK_RESPONSE);
  expect(await result).toBe('success');
  expect(manager.getSnapshot().conversation!.messages).toHaveLength(2);
});
it('keeps failed questions editable and retries the same turn without duplicates or raw error leakage', async () => {
  const generateResponse = vi
    .fn()
    .mockRejectedValueOnce(new Error(context.text))
    .mockResolvedValueOnce(MOCK_RESPONSE);
  const log = vi.spyOn(console, 'error');
  const debug = vi.spyOn(console, 'debug');
  const manager = create({ generateResponse });
  manager.setInput('  Question?  ');
  expect(await manager.submit()).toBe('error');
  const failed = manager.getSnapshot();
  expect(failed).toMatchObject({
    status: 'error',
    error: REQUEST_ERROR,
    input: '  Question?  ',
  });
  expect(failed.conversation!.messages).toHaveLength(1);
  const id = failed.conversation!.messages[0].id;
  manager.setInput('Edited question');
  expect(await manager.submit()).toBe('success');
  const messages = manager.getSnapshot().conversation!.messages;
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ id, content: 'Edited question' });
  expect(log).not.toHaveBeenCalled();
  expect(debug).not.toHaveBeenCalled();
});
it('repeated unchanged retries reuse the failed message id', async () => {
  const generateResponse = vi
    .fn()
    .mockRejectedValueOnce(new Error('Failed'))
    .mockResolvedValueOnce(MOCK_RESPONSE);
  const manager = create({ generateResponse });
  manager.setInput('Question');
  await manager.submit();
  const id = manager.getSnapshot().conversation!.messages[0].id;
  await manager.submit();
  expect(manager.getSnapshot().conversation!.messages[0].id).toBe(id);
  expect(
    (generateResponse.mock.calls[1][0] as AIRequest).messages,
  ).toHaveLength(1);
});
it.each(['', ' \n '])(
  'treats empty adapter response as an error (case %#)',
  async (answer) => {
    const manager = create({ generateResponse: async () => answer });
    manager.setInput('Question');
    expect(await manager.submit()).toBe('error');
    expect(manager.getSnapshot().input).toBe('Question');
  },
);
it.each(['resolve', 'reject'])(
  'dispose aborts and discards late %s without reviving cleared state',
  async (mode) => {
    const pending = deferred();
    let signal: AbortSignal | undefined;
    const manager = create({
      generateResponse: (_request, requestSignal) => {
        signal = requestSignal;
        return pending.promise;
      },
    });
    manager.setInput('Private question');
    const result = manager.submit();
    manager.dispose();
    manager.dispose();
    expect(signal!.aborted).toBe(true);
    expect(manager.getSnapshot()).toEqual({
      conversation: null,
      input: '',
      status: 'idle',
      error: null,
    });
    if (mode === 'resolve') pending.resolve('Old reply');
    else pending.reject(new Error('Old failure'));
    expect(await result).toBe('discarded');
    expect(manager.getSnapshot().conversation).toBeNull();
    expect(await manager.submit()).toBe('discarded');
  },
);
it('fresh conversations have unique ids and no inherited messages or draft', async () => {
  const old = create();
  old.setInput('Question');
  await old.submit();
  const firstId = old.getSnapshot().conversation!.id;
  old.dispose();
  const next = create();
  expect(next.getSnapshot().conversation!.id).not.toBe(firstId);
  expect(next.getSnapshot().conversation!.messages).toEqual([]);
  expect(next.getSnapshot().input).toBe('');
});
