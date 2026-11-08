import {
  AI_PORT,
  BACKEND_URL,
  isChatRequest,
  isAIErrorCode,
  MAX_ANSWER_LENGTH,
  RELAY_DEADLINE_MS,
} from '../shared/ai-contract';
import type { AIErrorCode } from '../shared/ai-contract';
import { isSupportedUrl } from '../utils/isSupportedUrl';
let registered = false;
export function registerAIRelay() {
  if (registered) return;
  registered = true;
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== AI_PORT) return;
    if (
      port.sender?.id !== chrome.runtime.id ||
      port.sender.frameId !== 0 ||
      !isSupportedUrl(port.sender.url)
    ) {
      port.disconnect();
      return;
    }
    let used = false;
    let closed = false;
    const abort = new AbortController();
    const disconnected = () => {
      closed = true;
      abort.abort();
      port.onMessage.removeListener(receive);
      port.onDisconnect.removeListener(disconnected);
    };
    const send = (result: { text: string } | { error: AIErrorCode }) => {
      if (!closed) {
        try {
          port.postMessage(result);
        } catch {
          disconnected();
        }
      }
    };
    const receive = async (message: unknown) => {
      if (used) return;
      used = true;
      if (
        typeof message !== 'object' ||
        message === null ||
        Object.keys(message).length !== 2 ||
        !('type' in message) ||
        message.type !== 'AI_REQUEST' ||
        !('request' in message) ||
        !isChatRequest(message.request)
      ) {
        send({ error: 'invalid_request' });
        return;
      }
      const timeout = setTimeout(() => abort.abort(), RELAY_DEADLINE_MS);
      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.request),
          signal: abort.signal,
        });
        const value: unknown = await response.json();
        if (!response.ok)
          send({
            error:
              typeof value === 'object' &&
              value !== null &&
              'error' in value &&
              isAIErrorCode(value.error)
                ? value.error
                : 'unavailable',
          });
        else if (
          typeof value === 'object' &&
          value !== null &&
          'text' in value &&
          typeof value.text === 'string' &&
          value.text.trim() &&
          value.text.length <= MAX_ANSWER_LENGTH
        )
          send({ text: value.text });
        else send({ error: 'empty_response' });
      } catch {
        if (!closed)
          send({
            error: abort.signal.aborted ? 'timeout' : 'backend_unavailable',
          });
      } finally {
        clearTimeout(timeout);
      }
    };
    port.onMessage.addListener(receive);
    port.onDisconnect.addListener(disconnected);
  });
}
