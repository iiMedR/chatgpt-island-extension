import type {
  AIAdapter,
  ChatMessage,
  ConversationSnapshot,
  IslandConversation,
  SelectionContext,
} from './conversation-types';
import { buildAIRequest } from './request-builder';
import { mockAIAdapter } from './mock-ai-adapter';
import { AIServiceError } from '../../../shared/ai-contract';

export const MAX_MESSAGE_LENGTH = 8000;
export const REQUEST_ERROR =
  'The local response failed. Your question is saved; send again to retry.';
export function validateQuestion(
  input: string,
): { valid: true; text: string } | { valid: false; error: string } {
  const text = input.trim();
  if (!text) return { valid: false, error: 'Enter a question before sending.' };
  if (text.length > MAX_MESSAGE_LENGTH)
    return {
      valid: false,
      error: 'Questions must be 8,000 characters or fewer.',
    };
  return { valid: true, text };
}
export type SubmissionResult =
  'success' | 'error' | 'invalid' | 'busy' | 'discarded';
export function createConversationManager(
  context: SelectionContext,
  adapter: AIAdapter = mockAIAdapter,
) {
  let snapshot: ConversationSnapshot = Object.freeze({
    conversation: Object.freeze({
      id: crypto.randomUUID(),
      context: Object.freeze({
        text: context.text,
        sourceUrl: context.sourceUrl,
        capturedAt: context.capturedAt,
      }),
      messages: Object.freeze([]),
      createdAt: Date.now(),
    }),
    input: '',
    status: 'idle',
    error: null,
  });
  const listeners = new Set<() => void>();
  let disposed = false;
  let requestId = 0;
  let active: AbortController | null = null;
  let failedUserId: string | null = null;
  function publish(next: ConversationSnapshot) {
    snapshot = Object.freeze(next);
    for (const listener of [...listeners]) listener();
  }
  return {
    kind: adapter.kind ?? 'mock',
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      if (!disposed) listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setInput(input: string) {
      if (
        disposed ||
        snapshot.status === 'submitting' ||
        snapshot.input === input
      )
        return;
      publish({ ...snapshot, input, status: 'idle', error: null });
    },
    async submit(): Promise<SubmissionResult> {
      if (disposed || !snapshot.conversation) return 'discarded';
      if (snapshot.status === 'submitting') return 'busy';
      const question = validateQuestion(snapshot.input);
      if (!question.valid) {
        publish({ ...snapshot, status: 'error', error: question.error });
        return 'invalid';
      }
      const previous = snapshot.conversation;
      // A failed turn has no assistant reply. Retrying/editing replaces that tail, never duplicates it.
      const retrying =
        failedUserId !== null && previous.messages.at(-1)?.id === failedUserId;
      const user: ChatMessage = Object.freeze({
        id: retrying ? failedUserId! : crypto.randomUUID(),
        role: 'user',
        content: question.text,
        createdAt: Date.now(),
      });
      const conversation: IslandConversation = Object.freeze({
        ...previous,
        messages: Object.freeze([
          ...(retrying ? previous.messages.slice(0, -1) : previous.messages),
          user,
        ]),
      });
      const ticket = ++requestId;
      const controller = new AbortController();
      active = controller;
      failedUserId = user.id;
      publish({ ...snapshot, conversation, status: 'submitting', error: null });
      try {
        const answer = await adapter.generateResponse(
          buildAIRequest(conversation),
          controller.signal,
        );
        if (disposed || ticket !== requestId || controller.signal.aborted)
          return 'discarded';
        if (typeof answer !== 'string' || !answer.trim())
          throw new Error('Invalid adapter response');
        const assistant: ChatMessage = Object.freeze({
          kind: adapter.kind ?? 'mock',
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
        });
        failedUserId = null;
        publish({
          conversation: Object.freeze({
            ...conversation,
            messages: Object.freeze([...conversation.messages, assistant]),
          }),
          input: '',
          status: 'success',
          error: null,
        });
        return 'success';
      } catch (error) {
        if (disposed || ticket !== requestId || controller.signal.aborted)
          return 'discarded';
        // Never expose adapter exceptions: they can contain request/context text.
        publish({
          ...snapshot,
          status: 'error',
          error:
            error instanceof AIServiceError ? error.message : REQUEST_ERROR,
        });
        return 'error';
      } finally {
        if (ticket === requestId) active = null;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      requestId++;
      active?.abort();
      active = null;
      failedUserId = null;
      listeners.clear();
      snapshot = Object.freeze({
        conversation: null,
        input: '',
        status: 'idle',
        error: null,
      });
    },
  };
}
export type ConversationManager = ReturnType<typeof createConversationManager>;
