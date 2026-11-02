import type {
  ArrowObject,
  MarkerObject,
  Point,
  SceneObject,
  SceneObjectPatch,
  TextObject,
} from "./types";

export type SelectionHandle = "nw" | "ne" | "sw" | "se";

export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SELECTION_PADDING = 8;
const MIN_SELECTION_SIZE = 24;
const MIN_RESIZED_SIZE = 8;

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pointsBounds(points: Point[]): SelectionBounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function markerBounds(marker: MarkerObject): SelectionBounds {
  const width = marker.size * (marker.scaleX ?? 1);
  const height = marker.size * (marker.scaleY ?? 1);
  return {
    x: marker.x - width / 2,
    y: marker.y - height / 2,
    width,
    height,
  };
}

function textBounds(text: TextObject): SelectionBounds {
  const scaleX = text.scaleX ?? 1;
  const scaleY = text.scaleY ?? 1;
  const width =
    Math.max(80, text.text.length * text.fontSize * 0.8) * scaleX;
  const height = text.fontSize * 1.4 * scaleY;
  return {
    x: text.x,
    y: text.y - text.fontSize * scaleY,
    width,
    height,
  };
}

function arrowBounds(arrow: ArrowObject): SelectionBounds {
  return pointsBounds(
    arrow.points?.length >= 2 ? arrow.points : [arrow.start, arrow.end],
  );
}

export function objectBounds(object: SceneObject): SelectionBounds {
  switch (object.type) {
    case "marker":
      return markerBounds(object);
    case "text":
      return textBounds(object);
    case "arrow":
      return arrowBounds(object);
    case "region":
    case "freehand":
      return pointsBounds(object.points);
  }
}

export function selectionBounds(object: SceneObject): SelectionBounds {
  const bounds = objectBounds(object);
  return {
    x: bounds.x - SELECTION_PADDING,
    y: bounds.y - SELECTION_PADDING,
    width: Math.max(MIN_SELECTION_SIZE, bounds.width + SELECTION_PADDING * 2),
    height: Math.max(
      MIN_SELECTION_SIZE,
      bounds.height + SELECTION_PADDING * 2,
    ),
  };
}

export function selectionHandlePoints(
  bounds: SelectionBounds,
): Array<{ handle: SelectionHandle; x: number; y: number }> {
  return [
    { handle: "nw", x: bounds.x, y: bounds.y },
    { handle: "ne", x: bounds.x + bounds.width, y: bounds.y },
    { handle: "sw", x: bounds.x, y: bounds.y + bounds.height },
    {
      handle: "se",
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    },
  ];
}

function resizeBounds(
  bounds: SelectionBounds,
  handle: SelectionHandle,
  dx: number,
  dy: number,
): SelectionBounds {
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;

  if (handle === "nw" || handle === "sw") left += dx;
  if (handle === "ne" || handle === "se") right += dx;
  if (handle === "nw" || handle === "ne") top += dy;
  if (handle === "sw" || handle === "se") bottom += dy;

  if (right - left < MIN_RESIZED_SIZE) {
    if (handle === "nw" || handle === "sw") {
      left = right - MIN_RESIZED_SIZE;
    } else {
      right = left + MIN_RESIZED_SIZE;
    }
  }
  if (bottom - top < MIN_RESIZED_SIZE) {
    if (handle === "nw" || handle === "ne") {
      top = bottom - MIN_RESIZED_SIZE;
    } else {
      bottom = top + MIN_RESIZED_SIZE;
    }
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function mapPoint(
  point: Point,
  source: SelectionBounds,
  target: SelectionBounds,
): Point {
  const scaleX = source.width <= 0 ? 1 : target.width / source.width;
  const scaleY = source.height <= 0 ? 1 : target.height / source.height;
  return {
    x: target.x + (point.x - source.x) * scaleX,
    y: target.y + (point.y - source.y) * scaleY,
  };
}

function rotatePoint(
  point: Point,
  center: Point,
  radians: number,
): Point {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: roundCoordinate(center.x + dx * cosine - dy * sine),
    y: roundCoordinate(center.y + dx * sine + dy * cosine),
  };
}

function boundsCenter(bounds: SelectionBounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function rotateObjectAroundCenter(
  object: SceneObject,
  radians: number,
): SceneObject {
  const next = structuredClone(object);
  const center = boundsCenter(objectBounds(object));

  switch (next.type) {
    case "marker":
      next.rotation += (radians * 180) / Math.PI;
      break;
    case "text": {
      const origin = rotatePoint(
        { x: next.x, y: next.y },
        center,
        radians,
      );
      next.x = origin.x;
      next.y = origin.y;
      next.rotation += (radians * 180) / Math.PI;
      break;
    }
    case "arrow":
      next.start = rotatePoint(next.start, center, radians);
      next.end = rotatePoint(next.end, center, radians);
      next.points = next.points.map((point) =>
        rotatePoint(point, center, radians),
      );
      break;
    case "region":
    case "freehand":
      next.points = next.points.map((point) =>
        rotatePoint(point, center, radians),
      );
      break;
  }

  return next;
}

export function flipObject(
  object: SceneObject,
  axis: "horizontal" | "vertical",
): SceneObject {
  const next = structuredClone(object);
  const bounds = objectBounds(object);
  const center = boundsCenter(bounds);

  if (next.type === "marker" || next.type === "text") {
    if (axis === "horizontal") {
      next.x = center.x * 2 - next.x;
      next.flipX = !next.flipX;
    } else {
      next.y = center.y * 2 - next.y;
      next.flipY = !next.flipY;
    }
    next.rotation = -next.rotation;
    return next;
  }

  const flipPoint = (point: Point): Point =>
    axis === "horizontal"
      ? { x: center.x * 2 - point.x, y: point.y }
      : { x: point.x, y: center.y * 2 - point.y };

  switch (next.type) {
    case "arrow":
      next.start = flipPoint(next.start);
      next.end = flipPoint(next.end);
      next.points = next.points.map(flipPoint);
      break;
    case "region":
    case "freehand":
      next.points = next.points.map(flipPoint);
      break;
  }

  return next;
}

export function resizeObjectFromDelta(
  object: SceneObject,
  handle: SelectionHandle,
  dx: number,
  dy: number,
): SceneObject {
  const source = objectBounds(object);
  const target = resizeBounds(source, handle, dx, dy);
  const scaleX = source.width <= 0 ? 1 : target.width / source.width;
  const scaleY = source.height <= 0 ? 1 : target.height / source.height;
  const next = structuredClone(object);

  switch (next.type) {
    case "marker":
    case "text": {
      const origin = mapPoint(
        { x: next.x, y: next.y },
        source,
        target,
      );
      next.x = origin.x;
      next.y = origin.y;
      next.scaleX *= scaleX;
      next.scaleY *= scaleY;
      break;
    }
    case "arrow": {
      next.start = mapPoint(next.start, source, target);
      next.end = mapPoint(next.end, source, target);
      next.points = next.points.map((point) =>
        mapPoint(point, source, target),
      );
      break;
    }
    case "region":
    case "freehand":
      next.points = next.points.map((point) =>
        mapPoint(point, source, target),
      );
      break;
  }

  return next;
}

export function objectGeometryPatch(
  object: SceneObject,
): SceneObjectPatch {
  switch (object.type) {
    case "marker":
    case "text":
      return {
        x: object.x,
        y: object.y,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
        flipX: object.flipX,
        flipY: object.flipY,
        rotation: object.rotation,
      };
    case "arrow":
      return {
        start: object.start,
        end: object.end,
        points: object.points,
      };
    case "region":
    case "freehand":
      return { points: object.points };
  }
}
