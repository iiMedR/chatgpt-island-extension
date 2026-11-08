import { createSelectionManager } from './selection/selection-manager';
import { createIslandTrigger } from './island-trigger';
import { isExtensionMessage } from '../shared/messages';
import { isSupportedUrl } from '../utils/isSupportedUrl';

// This slot lives only in the extension's isolated world, never the host DOM.
type ContentWindow = Window & {
  __chatgptIslandDispose?: () => void;
  navigation?: EventTarget;
};
export function initializeContent(
  window: ContentWindow,
  document: Document,
): () => void {
  window.__chatgptIslandDispose?.();
  const contextValid = () => {
    try {
      return Boolean(chrome.runtime.id);
    } catch {
      return false;
    } // Chrome invalidates old contexts after extension reloads.
  };
  if (!isSupportedUrl(window.location.href) || !contextValid()) return () => {};
  if (import.meta.env.DEV)
    console.debug('[ChatGPT Island] Content script initialized');
  const manager = createSelectionManager({
    window,
    document,
    navigation: window.navigation,
    debug: import.meta.env.DEV
      ? (event, reason) =>
          console.debug('[ChatGPT Island] Selection:', event, reason ?? '')
      : undefined,
  });
  let disposed = false;
  const trigger = createIslandTrigger({
    getSelection: () => manager.getSelection(),
    getUrl: () => window.location.href,
    isContextValid: () => !disposed && contextValid(),
    // Replace this callback with the React island controller in Milestone 04.
    onOpen: import.meta.env.DEV
      ? () => console.debug('[ChatGPT Island] Island-open received')
      : () => {},
  });
  const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
    message: unknown,
    sender,
    respond,
  ) => {
    if (!isExtensionMessage(message)) return;
    const reply = (result: unknown) => {
      try {
        respond(result);
      } catch {
        // A channel can disappear after the runtime-id check; never log its raw error.
        if (import.meta.env.DEV)
          console.debug('[ChatGPT Island] Message reply failed');
        dispose();
      }
    };
    if (!contextValid()) {
      dispose();
      reply({ status: 'context-invalidated' });
      return;
    }
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'FOUNDATION_PING') {
      reply({ running: true });
      return;
    }
    const result = trigger();
    if (import.meta.env.DEV)
      console.debug('[ChatGPT Island] Trigger:', result.status);
    reply(result);
  };
  const hide = (event: PageTransitionEvent) => {
    if (!event.persisted) dispose();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    manager.dispose();
    window.removeEventListener('pagehide', hide);
    if (contextValid()) {
      try {
        chrome.runtime.onMessage.removeListener(listener);
      } catch {
        if (import.meta.env.DEV)
          console.debug('[ChatGPT Island] Message cleanup failed');
      }
    }
    if (window.__chatgptIslandDispose === dispose)
      delete window.__chatgptIslandDispose;
  }
  chrome.runtime.onMessage.addListener(listener);
  window.addEventListener('pagehide', hide);
  window.__chatgptIslandDispose = dispose;
  return dispose;
}
