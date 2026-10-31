import type { Point } from "./types";

type StabilizeOptions = {
  minDistance?: number;
  smoothing?: number;
};

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(point: Point, amount: number): Point {
  return { x: point.x * amount, y: point.y * amount };
}

function lerp(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

export function stabilizePoint(
  previous: Point,
  requested: Point,
  smoothing = 0.4,
): Point {
  return lerp(previous, requested, Math.min(1, Math.max(0.01, smoothing)));
}

export function appendStabilizedPoint(
  points: Point[],
  requested: Point,
  options: StabilizeOptions = {},
): Point[] {
  if (points.length === 0) return [{ ...requested }];

  const previous = points.at(-1) as Point;
  const minDistance = options.minDistance ?? 1.5;
  const next = stabilizePoint(previous, requested, options.smoothing ?? 0.42);
  return distance(previous, next) >= minDistance ? [...points, next] : points;
}

export function measurePath(points: Point[]): number {
  return points.slice(1).reduce(
    (total, point, index) => total + distance(points[index], point),
    0,
  );
}

export function smoothPathData(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${round(points[0].x)} ${round(points[0].y)}`;
  }

  const parts = [`M ${round(points[0].x)} ${round(points[0].y)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const controlA = add(p1, scale(subtract(p2, p0), 1 / 6));
    const controlB = subtract(p2, scale(subtract(p3, p1), 1 / 6));

    parts.push(
      `C ${round(controlA.x)} ${round(controlA.y)} ${round(controlB.x)} ${round(controlB.y)} ${round(p2.x)} ${round(p2.y)}`,
    );
  }

  return parts.join(" ");
}

export function polylinePathData(points: Point[]): string {
  if (points.length === 0) return "";

  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`,
    )
    .join(" ");
}

export function trimPathEnd(points: Point[], trimDistance: number): Point[] {
  if (points.length < 2 || trimDistance <= 0) {
    return points.map((point) => ({ ...point }));
  }

  const result = points.map((point) => ({ ...point }));
  let remaining = trimDistance;

  while (result.length > 1) {
    const end = result.at(-1) as Point;
    const previous = result.at(-2) as Point;
    const segmentLength = distance(previous, end);

    if (segmentLength > remaining) {
      const ratio = (segmentLength - remaining) / segmentLength;
      result[result.length - 1] = lerp(previous, end, ratio);
      break;
    }

    result.pop();
    remaining -= segmentLength;
  }

  return result.length > 0 ? result : [{ ...points[0] }];
}

export function finalAngle(points: Point[]): number {
  if (points.length < 2) return 0;
  const end = points.at(-1) as Point;
  const previous = points.at(-2) as Point;
  return Math.atan2(end.y - previous.y, end.x - previous.x);
}

export function offsetPath(points: Point[], offset: number): Point[] {
  if (points.length < 2) return points.map((point) => ({ ...point }));

  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const length = distance(previous, next) || 1;
    const nx = -(next.y - previous.y) / length;
    const ny = (next.x - previous.x) / length;
    return {
      x: point.x + nx * offset,
      y: point.y + ny * offset,
    };
  });
}
