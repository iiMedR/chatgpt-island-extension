import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { IslandWindowState, WindowRect } from './island-types';
import {
  expandedWindow,
  fitWindow,
  initialWindow,
  resizeWindow,
  viewportFor,
} from './window-geometry';

export function useIslandWindow() {
  const [state, setState] = useState<IslandWindowState>(() => ({
    rect: initialWindow(viewportFor(window)),
    expanded: false,
    restore: null,
  }));
  const gesture = useRef<{
    kind: 'drag' | 'resize';
    id: number;
    x: number;
    y: number;
    rect: WindowRect;
    target: HTMLElement;
  } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<WindowRect | null>(null);
  const flush = useCallback(() => {
    frame.current = null;
    const rect = pending.current;
    pending.current = null;
    if (rect) setState((previous) => ({ ...previous, rect }));
  }, []);
  const finish = useCallback(
    (commit = true) => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
      if (commit) flush();
      else pending.current = null;
      const current = gesture.current;
      gesture.current = null;
      if (current?.target.hasPointerCapture?.(current.id))
        current.target.releasePointerCapture(current.id);
    },
    [flush],
  );
  useEffect(() => {
    const resized = () => {
      finish();
      setState((current) => ({
        ...current,
        rect: current.expanded
          ? expandedWindow(viewportFor(window))
          : fitWindow(current.rect, viewportFor(window)),
      }));
    };
    window.addEventListener('resize', resized);
    window.visualViewport?.addEventListener('resize', resized);
    window.visualViewport?.addEventListener('scroll', resized);
    return () => {
      finish(false);
      window.removeEventListener('resize', resized);
      window.visualViewport?.removeEventListener('resize', resized);
      window.visualViewport?.removeEventListener('scroll', resized);
    };
  }, [finish]);
  const start = (event: PointerEvent<HTMLElement>, kind: 'drag' | 'resize') => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      gesture.current !== null ||
      state.expanded ||
      (kind === 'drag' && (event.target as Element).closest('button'))
    )
      return;
    event.preventDefault();
    // Opening feedback must never trail an active drag/resize gesture.
    event.currentTarget
      .closest<HTMLElement>('.island')
      ?.style.setProperty('animation', 'none');
    gesture.current = {
      kind,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rect: state.rect,
      target: event.currentTarget,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const rect =
      current.kind === 'drag'
        ? fitWindow(
            { ...current.rect, x: current.rect.x + dx, y: current.rect.y + dy },
            viewportFor(window),
          )
        : resizeWindow(current.rect, dx, dy, viewportFor(window));
    pending.current = rect;
    if (frame.current === null)
      frame.current = window.requestAnimationFrame(flush);
  };
  const keyboard =
    (kind: 'drag' | 'resize') => (event: KeyboardEvent<HTMLElement>) => {
      if (
        state.expanded ||
        ((event.target as Element).closest('button') && kind === 'drag')
      )
        return;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-16, 0],
        ArrowRight: [16, 0],
        ArrowUp: [0, -16],
        ArrowDown: [0, 16],
      };
      const step = delta[event.key];
      if (!step) return;
      event.preventDefault();
      setState((previous) => ({
        ...previous,
        rect:
          kind === 'drag'
            ? fitWindow(
                {
                  ...previous.rect,
                  x: previous.rect.x + step[0],
                  y: previous.rect.y + step[1],
                },
                viewportFor(window),
              )
            : resizeWindow(previous.rect, ...step, viewportFor(window)),
      }));
    };
  const pointer = {
    onPointerMove: move,
    onPointerUp: (event?: PointerEvent<HTMLElement>) => {
      if (!event || gesture.current?.id === event.pointerId) finish();
    },
    onPointerCancel: (event?: PointerEvent<HTMLElement>) => {
      if (!event || gesture.current?.id === event.pointerId) finish();
    },
    onLostPointerCapture: (event?: PointerEvent<HTMLElement>) => {
      if (!event || gesture.current?.id === event.pointerId) finish();
    },
  };
  return {
    ...state,
    drag: {
      ...pointer,
      onPointerDown: (event: PointerEvent<HTMLElement>) => start(event, 'drag'),
      onKeyDown: keyboard('drag'),
    },
    resize: {
      ...pointer,
      onPointerDown: (event: PointerEvent<HTMLElement>) =>
        start(event, 'resize'),
      onKeyDown: keyboard('resize'),
    },
    toggleExpanded() {
      finish();
      setState((current) =>
        current.expanded
          ? {
              rect: fitWindow(
                current.restore ?? current.rect,
                viewportFor(window),
              ),
              expanded: false,
              restore: null,
            }
          : {
              rect: expandedWindow(viewportFor(window)),
              expanded: true,
              restore: current.rect,
            },
      );
    },
  };
}
