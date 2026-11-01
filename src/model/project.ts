import type {
  ArrowObject,
  ArrowPathMode,
  AtlasProject,
  FreehandObject,
  Layer,
  LineStyle,
  MarkerArtworkId,
  MarkerObject,
  Point,
  RegionObject,
  SceneObject,
  TacticalSymbol,
  TextObject,
  UnitAffiliation,
  UnitArtworkSource,
} from "./types";
import {
  AFFILIATION_COLORS,
  affiliationForSymbol,
  artworkSourceFor,
  defaultArtworkForSymbol,
} from "./unitAssets";
import type { BrushPreset } from "./brushes";

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;
export const DEFAULT_MARKER_SIZE = 88;
export const MAX_STROKE_WIDTH = 64;

function clampWidth(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_STROKE_WIDTH, Math.max(0, value));
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createLayer(name: string): Layer {
  return {
    id: createId("layer"),
    name,
    visible: true,
    locked: false,
    opacity: 1,
  };
}

export function createBlankProject(title = "未命名战役"): AtlasProject {
  const layer = createLayer("标注图层");

  return {
    version: 1,
    id: createId("atlas"),
    title,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    updatedAt: new Date().toISOString(),
    background: {
      dataUrl: null,
      opacity: 1,
      grayscale: 0,
      contrast: 1,
      brightness: 1,
    },
    maps: [],
    activeMapId: null,
    layers: [layer],
    objects: [],
  };
}

export function createMarker(
  layerId: string,
  point: Point,
  symbol: TacticalSymbol = "friendly",
  options: {
    affiliation?: UnitAffiliation;
    artwork?: MarkerArtworkId;
    artworkSource?: UnitArtworkSource;
    color?: string;
  } = {},
): MarkerObject {
  const affiliation = options.affiliation ?? affiliationForSymbol(symbol);
  const artwork =
    options.artwork ?? defaultArtworkForSymbol(symbol, affiliation);
  const artworkSource =
    options.artworkSource ?? artworkSourceFor(artwork);
  return {
    id: createId("marker"),
    layerId,
    type: "marker",
    name: "战役图标",
    x: point.x,
    y: point.y,
    size: DEFAULT_MARKER_SIZE,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    color: options.color ?? AFFILIATION_COLORS[affiliation],
    strokeEnabled: true,
    symbol,
    affiliation,
    artwork,
    artworkSource,
    label: "",
  };
}

export function createArrow(
  layerId: string,
  start: Point,
  end: Point,
  lineStyle: LineStyle = "solid",
  tint: UnitAffiliation = "objective",
  points: Point[] = [start, end],
  brush?: BrushPreset,
  pathMode: ArrowPathMode = "smooth",
): ArrowObject {
  const width = brush?.arrowWidth ?? 10;
  return {
    id: createId("arrow"),
    layerId,
    type: "arrow",
    name: "推进箭头",
    start,
    end,
    points: points.map((point) => ({ ...point })),
    color: AFFILIATION_COLORS[tint],
    width,
    startWidth: brush?.startWidth ?? width,
    endWidth: brush?.endWidth ?? width,
    headSize: 34,
    headStyle: "psd",
    opacity: 0.94,
    lineStyle,
    tint,
    pathMode,
    dashed: false,
    animation: {
      enabled: true,
      delay: 0,
      duration: 1.2,
      repeat: 0,
    },
    label: "",
  };
}

export function createArrowPath(
  layerId: string,
  points: Point[],
  lineStyle: LineStyle = "solid",
  tint: UnitAffiliation = "objective",
  brush?: BrushPreset,
  pathMode: ArrowPathMode = "smooth",
): ArrowObject {
  const safePoints = points.map((point) => ({ ...point }));
  const start = safePoints[0] ?? { x: 0, y: 0 };
  const end = safePoints.at(-1) ?? start;
  return createArrow(
    layerId,
    start,
    end,
    lineStyle,
    tint,
    safePoints,
    brush,
    pathMode,
  );
}

export function createRegion(layerId: string, points: Point[]): RegionObject {
  return {
    id: createId("region"),
    layerId,
    type: "region",
    name: "行动区域",
    points: points.map((point) => ({ ...point })),
    closed: true,
    geometryLocked: false,
    shapePreset: "custom",
    lineStyle: "solid",
    lineDashCount: 24,
    fill: "#e3318d",
    stroke: "#e3318d",
    strokeWidth: 2,
    opacity: 0.22,
    label: "",
  };
}

export function createText(
  layerId: string,
  point: Point,
  text = "批注",
): TextObject {
  return {
    id: createId("text"),
    layerId,
    type: "text",
    name: "地图批注",
    x: point.x,
    y: point.y,
    scaleX: 1,
    scaleY: 1,
    text,
    color: "#1f2430",
    fontSize: 20,
    strokeEnabled: true,
    rotation: 0,
    opacity: 1,
  };
}

export function createFreehand(
  layerId: string,
  points: Point[],
  lineStyle: LineStyle = "solid",
  brush?: BrushPreset,
): FreehandObject {
  const strokeWidth = brush?.freehandWidth ?? 4;
  return {
    id: createId("freehand"),
    layerId,
    type: "freehand",
    name: "手绘线",
    points: points.map((point) => ({ ...point })),
    color: "#315c70",
    strokeWidth,
    startWidth: brush?.startWidth ?? strokeWidth,
    endWidth: brush?.endWidth ?? strokeWidth,
    opacity: 1,
    lineStyle,
    label: "",
  };
}

export function normalizeStrokeWidth(value: unknown, fallback: number): number {
  return clampWidth(typeof value === "number" ? value : fallback);
}

function offsetPoint(point: Point): Point {
  return { x: point.x + 12, y: point.y + 12 };
}

export function duplicateObject(object: SceneObject): SceneObject {
  const copy = structuredClone(object) as SceneObject;
  copy.id = createId(copy.type);

  switch (copy.type) {
    case "marker": {
      const offset = offsetPoint(copy);
      copy.x = offset.x;
      copy.y = offset.y;
      break;
    }
    case "arrow":
      copy.start = offsetPoint(copy.start);
      copy.end = offsetPoint(copy.end);
      copy.points = copy.points.map(offsetPoint);
      break;
    case "region":
      copy.points = copy.points.map(offsetPoint);
      break;
    case "text": {
      const offset = offsetPoint(copy);
      copy.x = offset.x;
      copy.y = offset.y;
      break;
    }
    case "freehand":
      copy.points = copy.points.map(offsetPoint);
      break;
  }

  return copy;
}
