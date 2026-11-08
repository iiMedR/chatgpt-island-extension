import { OPEN_ISLAND_COMMAND, isIslandTriggerResult } from '../shared/messages';
import type { ExtensionMessage, IslandTriggerStatus } from '../shared/messages';
import { isSupportedUrl } from '../utils/isSupportedUrl';

export type CommandResult =
  | IslandTriggerStatus
  | 'ignored-command'
  | 'unsupported-tab'
  | 'missing-tab-id'
  | 'tab-query-failed'
  | 'messaging-failed'
  | 'response-timeout'
  | 'invalid-response';
export const RESPONSE_TIMEOUT_MS = 2000;
export async function handleCommand(
  command: string,
  suppliedTab?: chrome.tabs.Tab,
): Promise<CommandResult> {
  if (command !== OPEN_ISLAND_COMMAND) return 'ignored-command';
  let tab = suppliedTab;
  if (!tab) {
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch {
      return 'tab-query-failed';
    }
  }
  if (
    !tab ||
    tab.active === false ||
    !isSupportedUrl(tab.url) ||
    (tab.pendingUrl !== undefined && !isSupportedUrl(tab.pendingUrl))
  )
    return 'unsupported-tab';
  if (!Number.isInteger(tab.id) || tab.id! < 0) return 'missing-tab-id';
  const message: ExtensionMessage = { type: 'ISLAND_OPEN_REQUEST' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response: unknown = await Promise.race([
      chrome.tabs.sendMessage(tab.id!, message, { frameId: 0 }),
      new Promise<'response-timeout'>((resolve) => {
        timer = setTimeout(
          () => resolve('response-timeout'),
          RESPONSE_TIMEOUT_MS,
        );
      }),
    ]);
    if (response === 'response-timeout') return 'response-timeout';
    return isIslandTriggerResult(response)
      ? response.status
      : 'invalid-response';
  } catch {
    return 'messaging-failed';
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
export async function checkShortcutAssignment(): Promise<
  'assigned' | 'shortcut-unassigned' | 'shortcut-check-failed'
> {
  try {
    const commands = await chrome.commands.getAll();
    return commands.find((command) => command.name === OPEN_ISLAND_COMMAND)
      ?.shortcut
      ? 'assigned'
      : 'shortcut-unassigned';
  } catch {
    return 'shortcut-check-failed';
  }
}
let registered = false;
export function registerCommands() {
  if (registered) return;
  registered = true;
  chrome.commands.onCommand.addListener((command, tab) => {
    void handleCommand(command, tab).then((result) => {
      if (import.meta.env.DEV)
        console.debug('[ChatGPT Island] Command:', result);
    });
  });
}
