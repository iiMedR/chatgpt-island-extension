import type { SelectionResult } from './selection-types';

export const MAX_SELECTION_LENGTH = 10_000;

// Pure validation: whitespace is normalized only at the boundaries.
export function validateSelectionText(text: string): SelectionResult {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (trimmed.length > MAX_SELECTION_LENGTH)
    return { valid: false, reason: 'oversized' };
  return { valid: true, text: trimmed };
}
