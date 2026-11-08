import type { CapturedSelection } from './selection/selection-types';
import { validateSelectionText } from './selection/selection-validator';
import type { IslandTriggerResult } from '../shared/messages';
import { isSupportedUrl } from '../utils/isSupportedUrl';

export interface IslandOpenPayload {
  readonly selectedText: string;
  readonly sourceUrl: string;
  readonly capturedAt: number;
  readonly triggeredAt: number;
}
interface TriggerOptions {
  getSelection: () => CapturedSelection | null;
  getUrl: () => string;
  isContextValid: () => boolean;
  onOpen: (payload: IslandOpenPayload) => void;
}
export function createIslandTrigger(
  options: TriggerOptions,
): () => IslandTriggerResult {
  return () => {
    if (!options.isContextValid()) return { status: 'context-invalidated' };
    const url = options.getUrl();
    if (!isSupportedUrl(url)) return { status: 'unsupported-page' };
    // The manager performs navigation/lifecycle checks; never re-read page text here.
    const selection = options.getSelection();
    if (!selection) return { status: 'no-selection' };
    if (
      typeof selection.text !== 'string' ||
      typeof selection.sourceUrl !== 'string'
    )
      return { status: 'invalid-selection' };
    const text = validateSelectionText(selection.text);
    const now = Date.now();
    if (
      !text.valid ||
      text.text !== selection.text ||
      selection.sourceType !== 'assistant-message' ||
      !isSupportedUrl(selection.sourceUrl) ||
      new URL(selection.sourceUrl).pathname !== new URL(url).pathname ||
      !Number.isFinite(selection.capturedAt) ||
      selection.capturedAt < 0 ||
      selection.capturedAt > now
    )
      return { status: 'invalid-selection' };
    try {
      options.onOpen(
        Object.freeze({
          selectedText: text.text,
          sourceUrl: selection.sourceUrl,
          capturedAt: selection.capturedAt,
          triggeredAt: now,
        }),
      );
      return { status: 'triggered' };
    } catch {
      return { status: 'handler-failed' };
    }
  };
}
