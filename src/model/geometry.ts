import type { Point } from "./types";

export type Size = {
  width: number;
  height: number;
};

export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

export function fitViewport(
  canvas: Size,
  viewportSize: Size,
  padding = 32,
): Viewport {
  const availableWidth = Math.max(1, viewportSize.width - padding * 2);
  const availableHeight = Math.max(1, viewportSize.height - padding * 2);
  const scale = clampScale(
    Math.min(availableWidth / canvas.width, availableHeight / canvas.height),
  );
  const width = canvas.width * scale;
  const height = canvas.height * scale;

  return {
    scale: round(scale),
    x: round((viewportSize.width - width) / 2),
    y: round((viewportSize.height - height) / 2),
  };
}

export function zoomAt(
  viewport: Viewport,
  pointer: Point,
  nextScale: number,
): Viewport {
  const scale = clampScale(nextScale);
  const world = screenToWorld(pointer, viewport);

  return {
    x: pointer.x - world.x * scale,
    y: pointer.y - world.y * scale,
    scale,
  };
}
