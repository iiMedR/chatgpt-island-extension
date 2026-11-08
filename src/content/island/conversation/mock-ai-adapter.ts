import type { AIAdapter } from './conversation-types';
export const MOCK_RESPONSE =
  'AI integration is not connected yet. Your question and selected text are ready to be sent to an AI provider.';
export const mockAIAdapter: AIAdapter = {
  async generateResponse(_request, signal) {
    signal?.throwIfAborted();
    return MOCK_RESPONSE;
  },
};
