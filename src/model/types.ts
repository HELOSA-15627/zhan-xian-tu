export type Point = {
  x: number;
  y: number;
};

export type TacticalSymbol =
  | "friendly"
  | "hostile"
  | "headquarters"
  | "defense"
  | "nest"
  | "objective"
  | "armor"
  | "aviation";

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
};

export type AnimationSpec = {
  enabled: boolean;
  delay: number;
  duration: number;
  repeat: number;
};

export type BaseObject = {
  id: string;
  layerId: string;
  name: string;
};

export type MarkerObject = BaseObject & {
  type: "marker";
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
  symbol: TacticalSymbol;
  label: string;
};

export type ArrowObject = BaseObject & {
  type: "arrow";
  start: Point;
  end: Point;
  color: string;
  width: number;
  opacity: number;
  dashed: boolean;
  animation: AnimationSpec;
  label: string;
};

export type RegionObject = BaseObject & {
  type: "region";
  points: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  label: string;
};

export type TextObject = BaseObject & {
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  rotation: number;
  opacity: number;
};

export type FreehandObject = BaseObject & {
  type: "freehand";
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  label: string;
};

export type SceneObject =
  | MarkerObject
  | ArrowObject
  | RegionObject
  | TextObject
  | FreehandObject;

export type SceneObjectPatch = {
  name?: string;
  layerId?: string;
  x?: number;
  y?: number;
  size?: number;
  rotation?: number;
  opacity?: number;
  color?: string;
  symbol?: TacticalSymbol;
  label?: string;
  start?: Point;
  end?: Point;
  width?: number;
  dashed?: boolean;
  animation?: AnimationSpec;
  points?: Point[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
};

export type BackgroundSettings = {
  dataUrl: string | null;
  opacity: number;
  grayscale: number;
  contrast: number;
  brightness: number;
};

export type AtlasProject = {
  version: 1;
  id: string;
  title: string;
  width: number;
  height: number;
  updatedAt: string;
  background: BackgroundSettings;
  layers: Layer[];
  objects: SceneObject[];
};

export type EditorTool =
  | "select"
  | "pan"
  | "marker"
  | "arrow"
  | "region"
  | "text"
  | "freehand";
