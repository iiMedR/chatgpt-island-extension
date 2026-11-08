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
