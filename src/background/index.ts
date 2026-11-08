import { checkShortcutAssignment, registerCommands } from './commands';
import { registerAIRelay } from './ai-relay';

registerCommands();
if (!__ISLAND_OFFLINE__) registerAIRelay();
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (import.meta.env.DEV) console.debug('[ChatGPT Island] Installed:', reason);
  void checkShortcutAssignment().then((result) => {
    if (import.meta.env.DEV)
      console.debug('[ChatGPT Island] Shortcut:', result);
  });
});
if (import.meta.env.DEV)
  console.debug('[ChatGPT Island] Background initialized');
