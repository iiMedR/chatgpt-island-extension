export const OPEN_ISLAND_COMMAND = 'open-island';
export type ExtensionMessage =
  | { type: 'ISLAND_OPEN_REQUEST' }
  | { type: 'FOUNDATION_PING' }
  | { type: 'SELECTION_DIAGNOSTICS' };
export type IslandTriggerStatus =
  | 'triggered'
  | 'no-selection'
  | 'invalid-selection'
  | 'unsupported-page'
  | 'context-invalidated'
  | 'handler-failed';
export interface IslandTriggerResult {
  status: IslandTriggerStatus;
}
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length === 1 &&
    'type' in value &&
    (value.type === 'ISLAND_OPEN_REQUEST' ||
      value.type === 'FOUNDATION_PING' ||
      value.type === 'SELECTION_DIAGNOSTICS')
  );
}
export function isIslandTriggerResult(
  value: unknown,
): value is IslandTriggerResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length === 1 &&
    'status' in value &&
    typeof value.status === 'string' &&
    [
      'triggered',
      'no-selection',
      'invalid-selection',
      'unsupported-page',
      'context-invalidated',
      'handler-failed',
    ].includes(value.status)
  );
}
