import { checkShortcutAssignment, registerCommands } from './commands';

registerCommands();
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (import.meta.env.DEV) console.debug('[ChatGPT Island] Installed:', reason);
  void checkShortcutAssignment().then((result) => {
    if (import.meta.env.DEV)
      console.debug('[ChatGPT Island] Shortcut:', result);
  });
});
if (import.meta.env.DEV)
  console.debug('[ChatGPT Island] Background initialized');
