import type { AIRequest, ChatMessage } from './conversation-types';
import {
  AIServiceError,
  isChatRequest,
  MAX_COMPLETED_HISTORY_MESSAGES,
  MAX_HISTORY_CHARACTERS,
  MOCK_TEXTS,
} from '../../../shared/ai-contract';
import type { ChatRequest } from '../../../shared/ai-contract';

// Retain a contiguous suffix of complete turns. Never split or truncate a turn.
// No DOM access: the caller provides only its own island snapshot.
export function buildBackendRequest(request: AIRequest): ChatRequest {
  const current = request.messages.at(-1);
  if (!current || current.role !== 'user')
    throw new AIServiceError('invalid_request');
  const seen = new Set<string>();
  for (const message of request.messages) {
    if (seen.has(message.id)) throw new AIServiceError('invalid_request');
    seen.add(message.id);
  }
  const complete = (message: ChatMessage) =>
    !message.status || message.status === 'complete';
  const turns: (readonly [ChatMessage, ChatMessage])[] = [];
  for (let index = 0; index < request.messages.length - 1; index++) {
    const user = request.messages[index];
    const assistant = request.messages[index + 1];
    if (user.role === 'user' && assistant?.role === 'assistant') {
      if (
        complete(user) &&
        complete(assistant) &&
        assistant.kind !== 'mock' &&
        !MOCK_TEXTS.some((text) => text === assistant.content)
      )
        turns.push([user, assistant]);
      index++;
    }
  }
  const retained: ChatMessage[] = [];
  let characters = 0;
  for (let index = turns.length - 1; index >= 0; index--) {
    const [user, assistant] = turns[index];
    const size = user.content.length + assistant.content.length;
    if (
      retained.length + 2 > MAX_COMPLETED_HISTORY_MESSAGES ||
      characters + size > MAX_HISTORY_CHARACTERS
    )
      break;
    retained.unshift(user, assistant);
    characters += size;
  }
  const body = {
    context: { text: request.context.text },
    messages: [...retained, current].map(({ role, content }) => ({
      role,
      content,
    })),
  };
  if (!isChatRequest(body)) throw new AIServiceError('invalid_request');
  return body;
}
