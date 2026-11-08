// No DOM access or conversation observation in this milestone.
if (location.origin === 'https://chatgpt.com') {
  if (import.meta.env.DEV)
    console.debug('[ChatGPT Island] Content script initialized');
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
