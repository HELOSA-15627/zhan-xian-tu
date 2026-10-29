import type {
  ArrowObject,
  AtlasProject,
  FreehandObject,
  Layer,
  MarkerObject,
  Point,
  RegionObject,
  SceneObject,
  TacticalSymbol,
  TextObject,
} from "./types";

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;

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
    layers: [layer],
    objects: [],
  };
}

export function createMarker(
  layerId: string,
  point: Point,
  symbol: TacticalSymbol = "friendly",
): MarkerObject {
  return {
    id: createId("marker"),
    layerId,
    type: "marker",
    name: "战役图标",
    x: point.x,
    y: point.y,
    size: 32,
    rotation: 0,
    opacity: 1,
    color: "#b9e253",
    symbol,
    label: "",
  };
}

export function createArrow(
  layerId: string,
  start: Point,
  end: Point,
): ArrowObject {
  return {
    id: createId("arrow"),
    layerId,
    type: "arrow",
    name: "推进箭头",
    start,
    end,
    color: "#e85a4f",
    width: 8,
    opacity: 0.9,
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

export function createRegion(layerId: string, points: Point[]): RegionObject {
  return {
    id: createId("region"),
    layerId,
    type: "region",
    name: "行动区域",
    points: points.map((point) => ({ ...point })),
    fill: "#e3318d",
    stroke: "#f2efe8",
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
    text,
    color: "#1f2430",
    fontSize: 20,
    rotation: 0,
    opacity: 1,
  };
}

export function createFreehand(
  layerId: string,
  points: Point[],
): FreehandObject {
  return {
    id: createId("freehand"),
    layerId,
    type: "freehand",
    name: "手绘线",
    points: points.map((point) => ({ ...point })),
    color: "#1f2430",
    strokeWidth: 3,
    opacity: 1,
    label: "",
  };
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
