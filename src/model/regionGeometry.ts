import type {
  Point,
  RegionObject,
  RegionShapePreset,
} from "./types";
import { measurePath } from "./path";

export type RegionBoundaryHit = {
  point: Point;
  segmentIndex: number;
  distance: number;
};

export function canDragRegion(region: RegionObject): boolean {
  return region.closed && region.points.length >= 3;
}

export function canInsertRegionVertex(region: RegionObject): boolean {
  return canDragRegion(region) && !region.geometryLocked;
}

export function applyRegionShapePreset(
  region: RegionObject,
  preset: RegionShapePreset,
): RegionObject {
  const next = structuredClone(region);
  next.shapePreset = preset;
  if (preset === "custom" || region.points.length === 0) return next;

  const xs = region.points.map((point) => point.x);
  const ys = region.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  if (preset === "rectangle") {
    next.points = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  } else if (preset === "diamond") {
    next.points = [
      { x: centerX, y: minY },
      { x: maxX, y: centerY },
      { x: centerX, y: maxY },
      { x: minX, y: centerY },
    ];
  } else {
    const radiusX = (maxX - minX) / 2;
    const radiusY = (maxY - minY) / 2;
    next.points = Array.from({ length: 32 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 32;
      return {
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      };
    });
  }
  next.closed = true;
  return next;
}

export function regionContainsPoint(
  region: RegionObject,
  point: Point,
): boolean {
  if (!region.closed || region.points.length < 3) return false;

  let inside = false;
  for (
    let current = 0, previous = region.points.length - 1;
    current < region.points.length;
    previous = current, current += 1
  ) {
    const a = region.points[current];
    const b = region.points[previous];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x <
        ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) +
          a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRegionDashArray(
  region: RegionObject,
): string | undefined {
  if (region.lineStyle === "solid" || region.points.length < 2) {
    return undefined;
  }
  const boundary = region.closed
    ? [...region.points, region.points[0]]
    : region.points;
  const perimeter = measurePath(boundary);
  if (perimeter <= 0) return undefined;
  const count = Math.min(80, Math.max(4, Math.round(region.lineDashCount)));
  const slot = perimeter / count;

  if (region.lineStyle === "dashed") {
    return `${round(slot * 0.62)} ${round(slot * 0.38)}`;
  }

  const dot = Math.min(
    slot * 0.28,
    Math.max(1.5, region.strokeWidth * 0.8),
  );
  return `${round(dot)} ${round(Math.max(0.5, slot - dot))}`;
}

export function nearestRegionBoundaryPoint(
  region: RegionObject,
  requested: Point,
): RegionBoundaryHit {
  const segmentCount = region.closed
    ? region.points.length
    : region.points.length - 1;
  let best: RegionBoundaryHit = {
    point: { ...requested },
    segmentIndex: 0,
    distance: Number.POSITIVE_INFINITY,
  };

  for (let index = 0; index < segmentCount; index += 1) {
    const start = region.points[index];
    const end = region.points[(index + 1) % region.points.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const amount =
      lengthSquared <= 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((requested.x - start.x) * dx +
                (requested.y - start.y) * dy) /
                lengthSquared,
            ),
          );
    const point = {
      x: start.x + dx * amount,
      y: start.y + dy * amount,
    };
    const distance = Math.hypot(
      requested.x - point.x,
      requested.y - point.y,
    );
    if (distance < best.distance) {
      best = { point, segmentIndex: index, distance };
    }
  }

  return best;
}

export function insertRegionVertex(
  region: RegionObject,
  requested: Point,
): RegionObject {
  if (!canInsertRegionVertex(region)) return structuredClone(region);

  const hit = nearestRegionBoundaryPoint(region, requested);
  const next = structuredClone(region);
  next.points.splice(hit.segmentIndex + 1, 0, hit.point);
  next.shapePreset = "custom";
  return next;
}
