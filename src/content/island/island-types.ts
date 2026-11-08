export interface IslandMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type Viewport = WindowRect;
export interface IslandWindowState {
  rect: WindowRect;
  expanded: boolean;
  restore: WindowRect | null;
}
export const PLACEHOLDER_RESPONSE =
  'AI integration is coming in a future milestone. Your question and selected text have been captured locally.';
