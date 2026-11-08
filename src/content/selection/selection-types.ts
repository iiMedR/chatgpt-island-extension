export interface CapturedSelection {
  readonly text: string;
  readonly sourceUrl: string;
  readonly capturedAt: number;
  readonly sourceType: 'assistant-message';
}

export type SelectionResult =
  | { valid: true; text: string }
  | {
      valid: false;
      reason:
        | 'empty'
        | 'oversized'
        | 'outside-assistant'
        | 'excluded-region'
        | 'multiple-ranges';
    };

export type SelectionDiagnostic =
  'detected' | 'validated' | 'rejected' | 'cleared';
