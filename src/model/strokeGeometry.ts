import { smoothPathData } from "./path";
import type { Point } from "./types";

export type StrokeFrame = {
  point: Point;
  angle: number;
  distance: number;
};

type TaperedSides = {
  left: Point[];
  right: Point[];
};

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function cubicPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  amount: number,
): Point {
  const inverse = 1 - amount;
  const a = inverse ** 3;
  const b = 3 * inverse ** 2 * amount;
  const c = 3 * inverse * amount ** 2;
  const d = amount ** 3;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export function sampleSmoothPath(
  points: Point[],
  samplesPerSegment = 16,
): Point[] {
  if (points.length <= 1) return points.map((point) => ({ ...point }));
  const steps = Math.max(2, Math.round(samplesPerSegment));
  const sampled: Point[] = [{ ...points[0] }];

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const tangentA = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const tangentB = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    for (let step = 1; step <= steps; step += 1) {
      sampled.push(
        cubicPoint(
          p1,
          tangentA,
          tangentB,
          p2,
          step / steps,
        ),
      );
    }
  }

  return sampled;
}

function pathLength(points: Point[]): number {
  return points
    .slice(1)
    .reduce(
      (total, point, index) => total + distance(points[index], point),
      0,
    );
}

function frameAtDistance(
  points: Point[],
  requestedDistance: number,
): StrokeFrame {
  if (points.length === 0) {
    return { point: { x: 0, y: 0 }, angle: 0, distance: 0 };
  }
  if (points.length === 1) {
    return {
      point: { ...points[0] },
      angle: 0,
      distance: 0,
    };
  }

  const total = pathLength(points);
  const target = Math.min(total, Math.max(0, requestedDistance));
  let travelled = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segmentLength = distance(start, end);
    if (target <= travelled + segmentLength || index === points.length - 2) {
      const amount =
        segmentLength <= 0 ? 0 : (target - travelled) / segmentLength;
      return {
        point: lerp(start, end, amount),
        angle:
          segmentLength <= 0
            ? 0
            : Math.atan2(end.y - start.y, end.x - start.x),
        distance: target,
      };
    }
    travelled += segmentLength;
  }

  return {
    point: { ...(points.at(-1) as Point) },
    angle: 0,
    distance: total,
  };
}

export function pathFrameAtProgress(
  points: Point[],
  progress: number,
  samplesPerSegment = 16,
): StrokeFrame {
  const sampled = sampleSmoothPath(points, samplesPerSegment);
  const total = pathLength(sampled);
  return frameAtDistance(
    sampled,
    total * Math.min(1, Math.max(0, progress)),
  );
}

export function clipSmoothPathToProgress(
  points: Point[],
  progress: number,
  samplesPerSegment = 16,
): Point[] {
  const sampled = sampleSmoothPath(points, samplesPerSegment);
  if (sampled.length === 0) return [];
  const total = pathLength(sampled);
  const target = total * Math.min(1, Math.max(0, progress));
  if (target <= 0) return [{ ...sampled[0] }];
  if (target >= total) return sampled;

  const clipped: Point[] = [{ ...sampled[0] }];
  let travelled = 0;
  for (let index = 0; index < sampled.length - 1; index += 1) {
    const start = sampled[index];
    const end = sampled[index + 1];
    const segmentLength = distance(start, end);
    if (travelled + segmentLength < target) {
      clipped.push({ ...end });
      travelled += segmentLength;
      continue;
    }
    clipped.push(lerp(start, end, (target - travelled) / segmentLength));
    break;
  }
  return clipped;
}

export function buildTaperedRibbonPoints(
  points: Point[],
  startWidth: number,
  endWidth: number,
): TaperedSides {
  if (points.length === 0) return { left: [], right: [] };
  if (points.length === 1) {
    return {
      left: [{ ...points[0] }],
      right: [{ ...points[0] }],
    };
  }

  const total = pathLength(points);
  const safeStart = Math.max(0, startWidth);
  const safeEnd = Math.max(0, endWidth);
  let travelled = 0;
  const left: Point[] = [];
  const right: Point[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[Math.min(points.length - 1, index + 1)];
    if (index > 0) travelled += distance(points[index - 1], current);
    const progress = total <= 0 ? 0 : travelled / total;
    const width = safeStart + (safeEnd - safeStart) * progress;
    const halfWidth = width / 2;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;

    left.push({
      x: current.x - nx * halfWidth,
      y: current.y - ny * halfWidth,
    });
    right.push({
      x: current.x + nx * halfWidth,
      y: current.y + ny * halfWidth,
    });
  }

  return { left, right };
}

export function buildTaperedRibbon(
  points: Point[],
  startWidth: number,
  endWidth: number,
): string {
  const { left, right } = buildTaperedRibbonPoints(
    points,
    startWidth,
    endWidth,
  );
  if (left.length === 0) return "";

  const path = left.map(
    (point, index) =>
      `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`,
  );
  for (let index = right.length - 1; index >= 0; index -= 1) {
    path.push(
      `L ${round(right[index].x)} ${round(right[index].y)}`,
    );
  }
  path.push("Z");
  return path.join(" ");
}

export function buildOpenOffsetPath(
  points: Point[],
  offset: number,
): string {
  if (points.length < 2) return "";
  return smoothPathData(
    points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy) || 1;
      return {
        x: point.x + (-dy / length) * offset,
        y: point.y + (dx / length) * offset,
      };
    }),
  );
}
