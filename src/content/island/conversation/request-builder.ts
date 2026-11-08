import type { AIRequest, IslandConversation } from './conversation-types';

// Own an immutable snapshot: an adapter cannot mutate UI history or context.
export function buildAIRequest(conversation: IslandConversation): AIRequest {
  return Object.freeze({
    context: Object.freeze({
      text: conversation.context.text,
      sourceUrl: conversation.context.sourceUrl,
      capturedAt: conversation.context.capturedAt,
    }),
    messages: Object.freeze(
      conversation.messages.map(
        ({ id, role, content, createdAt, kind, status }) =>
          Object.freeze({
            id,
            role,
            content,
            createdAt,
            ...(kind ? { kind } : {}),
            ...(status ? { status } : {}),
          }),
      ),
    ),
  });
}
