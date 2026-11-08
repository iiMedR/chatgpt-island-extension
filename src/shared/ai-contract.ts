export const AI_PORT = 'island-ai';
export const BACKEND_URL = 'http://127.0.0.1:8787/api/chat';
export const MAX_COMPLETED_HISTORY_MESSAGES = 20;
export const MAX_HISTORY_CHARACTERS = 30000;
export const MAX_HISTORY_MESSAGES = MAX_COMPLETED_HISTORY_MESSAGES + 1;
export const MAX_TOTAL_CHARACTERS = 10000 + 8000 + MAX_HISTORY_CHARACTERS;
export const MAX_ANSWER_LENGTH = 16000;
export const BACKEND_DEADLINE_MS = 25000;
export const RELAY_DEADLINE_MS = 28000;
export const CLIENT_DEADLINE_MS = 30000;
export const MOCK_TEXTS = [
  'AI integration is not connected yet. Your question and selected text are ready to be sent to an AI provider.',
  'AI integration is coming in a future milestone. Your question and selected text have been captured locally.',
] as const;
export interface WireMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatRequest {
  context: { text: string };
  messages: WireMessage[];
}
export const AI_ERRORS = {
  backend_unavailable:
    "Couldn't connect to the AI service. Check that the local backend is running.",
  timeout: 'The AI request timed out. Please try again.',
  invalid_request:
    'The AI request is invalid or too large. Shorten the question or start a new island.',
  missing_api_key:
    'Configure OPENAI_API_KEY in the local backend environment, then restart it.',
  invalid_api_key:
    'The backend API key was rejected. Check its OpenAI configuration.',
  unsupported_model:
    'The configured model is unavailable. Check OPENAI_MODEL on the backend.',
  rate_limit: 'The AI service is rate limited. Please try again later.',
  insufficient_credits:
    'The OpenAI API account has insufficient quota. Check its billing and limits.',
  empty_response: 'The AI service returned no usable text. Please try again.',
  unavailable: 'The AI service is temporarily unavailable. Please try again.',
} as const;
export type AIErrorCode = keyof typeof AI_ERRORS;
export class AIServiceError extends Error {
  constructor(readonly code: AIErrorCode) {
    super(AI_ERRORS[code]);
    this.name = 'AIServiceError';
  }
}
export function isAIErrorCode(code: unknown): code is AIErrorCode {
  return typeof code === 'string' && Object.hasOwn(AI_ERRORS, code);
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string[]) {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}
export function isChatRequest(value: unknown): value is ChatRequest {
  if (
    !record(value) ||
    !keys(value, ['context', 'messages']) ||
    !record(value.context) ||
    !keys(value.context, ['text']) ||
    typeof value.context.text !== 'string' ||
    !value.context.text.trim() ||
    value.context.text.length > 10000 ||
    !Array.isArray(value.messages) ||
    value.messages.length < 1 ||
    value.messages.length > MAX_HISTORY_MESSAGES
  )
    return false;
  let total = value.context.text.length;
  let historyCharacters = 0;
  for (const message of value.messages) {
    if (
      !record(message) ||
      !keys(message, ['role', 'content']) ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length >
        (message.role === 'user' ? 8000 : MAX_ANSWER_LENGTH) ||
      (message.role === 'assistant' &&
        MOCK_TEXTS.some((text) => text === message.content))
    )
      return false;
    total += message.content.length;
  }
  for (let index = 0; index < value.messages.length - 1; index++) {
    const message = value.messages[index];
    if (message.role !== (index % 2 === 0 ? 'user' : 'assistant')) return false;
    historyCharacters += message.content.length;
  }
  return (
    value.messages.length % 2 === 1 &&
    historyCharacters <= MAX_HISTORY_CHARACTERS &&
    value.messages[0].role === 'user' &&
    value.messages.at(-1).role === 'user' &&
    total <= MAX_TOTAL_CHARACTERS
  );
}
