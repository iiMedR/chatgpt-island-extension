import type { AIAdapter, AIRequest } from './conversation-types';
import {
  AI_PORT,
  AIServiceError,
  isAIErrorCode,
  isChatRequest,
  MAX_HISTORY_MESSAGES,
  MAX_TOTAL_CHARACTERS,
  MAX_ANSWER_LENGTH,
  MOCK_TEXTS,
  CLIENT_DEADLINE_MS,
} from '../../../shared/ai-contract';
import type { ChatRequest, WireMessage } from '../../../shared/ai-contract';

export function buildBackendRequest(request: AIRequest): ChatRequest {
  const removeLeadingAssistant = (items: WireMessage[]) => {
    while (items[0]?.role === 'assistant') items.shift();
  };
  const messages: WireMessage[] = request.messages
    .filter(
      (message) =>
        message.role !== 'assistant' ||
        (message.kind !== 'mock' &&
          !MOCK_TEXTS.some((text) => text === message.content)),
    )
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_HISTORY_MESSAGES);
  removeLeadingAssistant(messages);
  while (
    messages.length > 1 &&
    request.context.text.length +
      messages.reduce((sum, message) => sum + message.content.length, 0) >
      MAX_TOTAL_CHARACTERS
  ) {
    messages.shift();
    removeLeadingAssistant(messages);
  }
  const body = { context: { text: request.context.text }, messages };
  if (!isChatRequest(body)) throw new AIServiceError('invalid_request');
  return body;
}
export function createOpenAIAdapter(): AIAdapter {
  return {
    kind: 'ai',
    generateResponse(request, signal) {
      if (signal?.aborted)
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      const body = buildBackendRequest(request);
      return new Promise<string>((resolve, reject) => {
        let port: chrome.runtime.Port | undefined;
        let settled = false;
        const finish = (error?: Error, text?: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          if (port) {
            port.onMessage.removeListener(receive);
            port.onDisconnect.removeListener(disconnect);
            try {
              port.disconnect();
            } catch {
              /* Already invalidated. */
            }
          }
          if (error) reject(error);
          else resolve(text!);
        };
        const abort = () => finish(new DOMException('Aborted', 'AbortError'));
        const disconnect = () => {
          void chrome.runtime.lastError;
          finish(new AIServiceError('backend_unavailable'));
        };
        const receive = (response: unknown) => {
          if (typeof response !== 'object' || response === null) {
            finish(new AIServiceError('unavailable'));
            return;
          }
          if (
            'text' in response &&
            typeof response.text === 'string' &&
            response.text.trim() &&
            response.text.length <= MAX_ANSWER_LENGTH
          )
            finish(undefined, response.text);
          else if ('error' in response && isAIErrorCode(response.error))
            finish(new AIServiceError(response.error));
          else finish(new AIServiceError('empty_response'));
        };
        const timer = setTimeout(
          () => finish(new AIServiceError('timeout')),
          CLIENT_DEADLINE_MS,
        );
        signal?.addEventListener('abort', abort, { once: true });
        try {
          port = chrome.runtime.connect({ name: AI_PORT });
          port.onMessage.addListener(receive);
          port.onDisconnect.addListener(disconnect);
          port.postMessage({ type: 'AI_REQUEST', request: body });
        } catch {
          finish(new AIServiceError('backend_unavailable'));
        }
      });
    },
  };
}
