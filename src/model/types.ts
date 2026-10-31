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

export type UnitAffiliation = "friendly" | "hostile" | "objective";
export type UnitArtworkSource = "psd" | "nato" | "flag" | "custom";

export type UnitArtworkId =
  | "friendly-fighter"
  | "hostile-fighter"
  | "friendly-naval"
  | "friendly-artillery"
  | "friendly-tank"
  | "friendly-helicopter"
  | "hostile-heavy"
  | "hostile-fortress"
  | "hostile-crawler"
  | "friendly-hovercraft"
  | "hostile-scout"
  | "hostile-crawler-biped"
  | "hostile-artillery"
  | "target-frame"
  | "arrow-head"
  | "friendly-fighter-clean"
  | "hostile-destroyed";

export type CustomArtworkId = "custom-nest";

export type NatoArtworkId =
  | "nato-infantry"
  | "nato-armor"
  | "nato-artillery"
  | "nato-recon"
  | "nato-rotary"
  | "nato-fixed-wing"
  | "nato-naval"
  | "nato-headquarters";

export type FlagArtworkId = `flag-${string}`;

export type MarkerArtworkId =
  | UnitArtworkId
  | CustomArtworkId
  | NatoArtworkId
  | FlagArtworkId;

export type LineStyle =
  | "solid"
  | "dashed"
  | "double"
  | "dotted"
  | "phase"
  | "dashdot"
  | "ticked";
export type SketchMode = "direct" | "polyline";
export type BrushPresetId =
  | "command"
  | "drafting"
  | "advance"
  | "taper";
export type ArrowHeadStyle = "psd" | "triangle" | "chevron" | "spear";
export type RegionShapePreset =
  | "custom"
  | "rectangle"
  | "ellipse"
  | "diamond";
export type RegionLineStyle = "solid" | "dashed" | "dotted";

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

export type TaperedStroke = {
  startWidth: number;
  endWidth: number;
};

export type FlagAttachmentPosition =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "center";

export type FlagAttachment = {
  artwork: FlagArtworkId;
  position: FlagAttachmentPosition;
  size: number;
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
  affiliation: UnitAffiliation;
  artwork: MarkerArtworkId;
  artworkSource: UnitArtworkSource;
  label: string;
  flagAttachment?: FlagAttachment;
};

export type ArrowObject = BaseObject &
  TaperedStroke & {
  type: "arrow";
  start: Point;
  end: Point;
  points: Point[];
  color: string;
  width: number;
  headSize: number;
  headStyle: ArrowHeadStyle;
  opacity: number;
  lineStyle: LineStyle;
  tint: UnitAffiliation;
  dashed: boolean;
  animation: AnimationSpec;
  label: string;
};

export type RegionObject = BaseObject & {
  type: "region";
  points: Point[];
  closed: boolean;
  geometryLocked: boolean;
  shapePreset: RegionShapePreset;
  lineStyle: RegionLineStyle;
  lineDashCount: number;
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

export type FreehandObject = BaseObject &
  TaperedStroke & {
  type: "freehand";
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  lineStyle: LineStyle;
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
  affiliation?: UnitAffiliation;
  artwork?: MarkerArtworkId;
  artworkSource?: UnitArtworkSource;
  label?: string;
  flagAttachment?: FlagAttachment | null;
  start?: Point;
  end?: Point;
  points?: Point[];
  width?: number;
  startWidth?: number;
  endWidth?: number;
  headSize?: number;
  headStyle?: ArrowHeadStyle;
  lineStyle?: LineStyle;
  tint?: UnitAffiliation;
  dashed?: boolean;
  animation?: AnimationSpec;
  closed?: boolean;
  geometryLocked?: boolean;
  shapePreset?: RegionShapePreset;
  lineDashCount?: number;
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
