import type { Viewport, WindowRect } from './island-types';
export function viewportFor(window: Window): Viewport {
  const viewport = window.visualViewport;
  return {
    x: viewport?.offsetLeft ?? 0,
    y: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}
function limits(viewport: Viewport) {
  const margin = Math.min(
    12,
    Math.max(0, (Math.min(viewport.width, viewport.height) - 1) / 2),
  );
  return {
    x: viewport.x + margin,
    y: viewport.y + margin,
    width: Math.max(1, viewport.width - margin * 2),
    height: Math.max(1, viewport.height - margin * 2),
  };
}
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
export function fitWindow(rect: WindowRect, viewport: Viewport): WindowRect {
  const bounds = limits(viewport);
  const width = clamp(rect.width, Math.min(340, bounds.width), bounds.width);
  const height = clamp(
    rect.height,
    Math.min(300, bounds.height),
    bounds.height,
  );
  return {
    width,
    height,
    x: clamp(rect.x, bounds.x, bounds.x + bounds.width - width),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - height),
  };
}
export function initialWindow(viewport: Viewport): WindowRect {
  return fitWindow(
    {
      x: viewport.x + viewport.width - 484,
      y: viewport.y + 48,
      width: 460,
      height: 520,
    },
    viewport,
  );
}
export function expandedWindow(viewport: Viewport): WindowRect {
  const rect = fitWindow(
    { x: viewport.x, y: viewport.y, width: 840, height: 800 },
    viewport,
  );
  return {
    ...rect,
    x: viewport.x + (viewport.width - rect.width) / 2,
    y: viewport.y + (viewport.height - rect.height) / 2,
  };
}
export function resizeWindow(
  rect: WindowRect,
  dx: number,
  dy: number,
  viewport: Viewport,
): WindowRect {
  const bounds = limits(viewport);
  return fitWindow(
    {
      ...rect,
      width: clamp(
        rect.width + dx,
        Math.min(340, bounds.width),
        bounds.x + bounds.width - rect.x,
      ),
      height: clamp(
        rect.height + dy,
        Math.min(300, bounds.height),
        bounds.y + bounds.height - rect.y,
      ),
    },
    viewport,
  );
}
