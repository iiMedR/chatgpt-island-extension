export interface SelectionContext {
  readonly text: string;
  readonly sourceUrl: string;
  readonly capturedAt: number;
}
export type MessageRole = 'user' | 'assistant';
export interface ChatMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: number;
}
export interface IslandConversation {
  readonly id: string;
  readonly context: SelectionContext;
  readonly messages: readonly ChatMessage[];
  readonly createdAt: number;
}
export interface AIRequest {
  readonly context: SelectionContext;
  readonly messages: readonly ChatMessage[];
}
export interface AIAdapter {
  generateResponse(request: AIRequest, signal?: AbortSignal): Promise<string>;
}
export type RequestStatus = 'idle' | 'submitting' | 'success' | 'error';
export interface ConversationSnapshot {
  readonly conversation: IslandConversation | null;
  readonly input: string;
  readonly status: RequestStatus;
  readonly error: string | null;
}
