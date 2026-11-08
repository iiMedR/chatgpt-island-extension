import type { AIAdapter } from './conversation-types';
import {
  AI_PORT,
  AIServiceError,
  isAIErrorCode,
  MAX_ANSWER_LENGTH,
  CLIENT_DEADLINE_MS,
} from '../../../shared/ai-contract';
import { buildBackendRequest } from './context-manager';
export { buildBackendRequest } from './context-manager';

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
