chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (import.meta.env.DEV) console.debug('[ChatGPT Island] Installed:', reason);
});
if (import.meta.env.DEV)
  console.debug('[ChatGPT Island] Background initialized');
