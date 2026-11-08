import { createSelectionManager } from './selection/selection-manager';

if (location.origin === 'https://chatgpt.com') {
  if (import.meta.env.DEV)
    console.debug('[ChatGPT Island] Content script initialized');
  const manager = createSelectionManager({
    window,
    document,
    navigation: (window as Window & { navigation?: EventTarget }).navigation,
    debug: import.meta.env.DEV
      ? (event, reason) =>
          console.debug('[ChatGPT Island] Selection:', event, reason ?? '')
      : undefined,
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) manager.dispose();
  });
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'FOUNDATION_PING'
      )
        sendResponse({ running: true });
    },
  );
}
