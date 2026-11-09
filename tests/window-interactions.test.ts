import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useIslandWindow } from '../src/content/island/useIslandWindow';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function event(
  target: HTMLElement,
  x: number,
  y: number,
  id = 1,
  button = 0,
): PointerEvent<HTMLElement> {
  return {
    button,
    pointerId: id,
    clientX: x,
    clientY: y,
    target,
    currentTarget: target,
    preventDefault: vi.fn(),
  } as unknown as PointerEvent<HTMLElement>;
}
it('captures/releases a drag pointer, clamps movement, and stops after cancellation', () => {
  const { result, unmount } = renderHook(useIslandWindow);
  const target = document.createElement('header');
  target.setPointerCapture = vi.fn();
  target.hasPointerCapture = vi.fn(() => true);
  target.releasePointerCapture = vi.fn();
  act(() => result.current.drag.onPointerDown(event(target, 100, 100)));
  expect(target.setPointerCapture).toHaveBeenCalledWith(1);
  act(() => result.current.drag.onPointerMove(event(target, -9999, -9999)));
  act(() => vi.advanceTimersByTime(20));
  expect(result.current.rect.x).toBe(12);
  expect(result.current.rect.y).toBe(12);
  act(() => result.current.drag.onPointerCancel());
  const cancelled = result.current.rect;
  act(() => result.current.drag.onPointerMove(event(target, 9999, 9999)));
  expect(result.current.rect).toBe(cancelled);
  expect(target.releasePointerCapture).toHaveBeenCalledWith(1);
  unmount();
});
it('ignores header controls/non-primary pointers and respects resize limits', () => {
  const { result } = renderHook(useIslandWindow);
  const before = result.current.rect;
  const button = document.createElement('button');
  act(() => result.current.drag.onPointerDown(event(button, 0, 0)));
  act(() => result.current.drag.onPointerMove(event(button, 400, 400)));
  expect(result.current.rect).toBe(before);
  const handle = document.createElement('span');
  act(() => result.current.resize.onPointerDown(event(handle, 0, 0, 1, 2)));
  act(() => result.current.resize.onPointerMove(event(handle, 200, 200)));
  expect(result.current.rect).toBe(before);
  act(() => result.current.resize.onPointerDown(event(handle, 100, 100)));
  act(() => result.current.resize.onPointerMove(event(handle, -999, -999)));
  act(() => vi.advanceTimersByTime(20));
  expect(result.current.rect.width).toBe(340);
  expect(result.current.rect.height).toBe(300);
  act(() => result.current.resize.onPointerUp());
});
it('fits viewport resize and releases a live gesture on unmount', () => {
  const { result, unmount } = renderHook(useIslandWindow);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(400);
  act(() => window.dispatchEvent(new Event('resize')));
  expect(result.current.rect.x + result.current.rect.width).toBeLessThanOrEqual(
    320,
  );
  expect(
    result.current.rect.y + result.current.rect.height,
  ).toBeLessThanOrEqual(400);
  const handle = document.createElement('span');
  handle.setPointerCapture = vi.fn();
  handle.hasPointerCapture = vi.fn(() => true);
  handle.releasePointerCapture = vi.fn();
  act(() => result.current.resize.onPointerDown(event(handle, 0, 0)));
  unmount();
  expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
});

it('coalesces pointer moves into one frame and ignores another pointer ending the gesture', () => {
  let renders = 0;
  const { result, unmount } = renderHook(() => {
    renders++;
    return useIslandWindow();
  });
  const target = document.createElement('header');
  const before = result.current.rect;
  const initialRenders = renders;
  act(() => result.current.drag.onPointerDown(event(target, 0, 0)));
  act(() => {
    result.current.drag.onPointerMove(event(target, -20, 0));
    result.current.drag.onPointerMove(event(target, -40, 0));
    result.current.drag.onPointerDown(event(target, 999, 999, 2));
    result.current.drag.onPointerCancel(event(target, 999, 999, 2));
  });
  expect(result.current.rect).toBe(before);
  expect(renders).toBe(initialRenders);
  act(() => vi.advanceTimersByTime(20));
  expect(result.current.rect.x).toBe(before.x - 40);
  expect(renders).toBe(initialRenders + 1);
  act(() => result.current.drag.onPointerMove(event(target, -60, 0)));
  act(() => result.current.drag.onPointerUp(event(target, -60, 0)));
  expect(result.current.rect.x).toBe(before.x - 60);
  expect(vi.getTimerCount()).toBe(0);
  unmount();
});
it('cancels queued frames and removes viewport listeners on unmount', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const { result, unmount } = renderHook(useIslandWindow);
  const target = document.createElement('header');
  act(() => result.current.drag.onPointerDown(event(target, 0, 0)));
  act(() => result.current.drag.onPointerMove(event(target, -20, -20)));
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
});
it('restores prior geometry clamped to a smaller viewport without resetting on rerender', () => {
  const { result, rerender } = renderHook(useIslandWindow);
  const original = result.current.rect;
  rerender();
  expect(result.current.rect).toBe(original);
  act(() => result.current.toggleExpanded());
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(480);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(360);
  act(() => window.dispatchEvent(new Event('resize')));
  expect(result.current.expanded).toBe(true);
  act(() => result.current.toggleExpanded());
  expect(result.current.expanded).toBe(false);
  expect(result.current.rect.x + result.current.rect.width).toBeLessThanOrEqual(
    480,
  );
  expect(
    result.current.rect.y + result.current.rect.height,
  ).toBeLessThanOrEqual(360);
});
