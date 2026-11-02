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

export type CustomArtworkId =
  | "custom-nest"
  | `custom-asset-${string}`;

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
export type ArrowPathMode = "smooth" | "sharp";
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
  parentId: string | null;
  kind: "layer" | "group";
  expanded: boolean;
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
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
  rotation: number;
  opacity: number;
  color: string;
  strokeEnabled: boolean;
  strokeWidth: number;
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
  pathMode: ArrowPathMode;
  dashed: boolean;
  animation: AnimationSpec;
  label: string;
  lineDashCount: number;
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
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
  text: string;
  color: string;
  fontSize: number;
  strokeEnabled: boolean;
  rotation: number;
  opacity: number;
  fontFamily: string;
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
  lineDashCount: number;
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
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  opacity?: number;
  color?: string;
  strokeEnabled?: boolean;
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
  pathMode?: ArrowPathMode;
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
  fontFamily?: string;
};

export type BackgroundSettings = {
  dataUrl: string | null;
  opacity: number;
  grayscale: number;
  contrast: number;
  brightness: number;
  blur: number;
  noise: number;
  contourEnabled: boolean;
  contourLevels: number;
  contourOpacity: number;
  contourPaths: string[];
  contourImage: string | null;
  excludeBlue: boolean;
};

export type ImportedMap = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  opacity: number;
  grayscale: number;
  contrast: number;
  brightness: number;
  blur: number;
  noise: number;
  contourEnabled: boolean;
  contourLevels: number;
  contourOpacity: number;
  contourPaths: string[];
  contourImage: string | null;
  excludeBlue: boolean;
  visible: boolean;
  layers: Layer[];
  objects: SceneObject[];
};

export type UserArtworkAsset = {
  id: `custom-asset-${string}`;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  affiliation: UnitAffiliation;
};

export type SavedGraphic = {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  objects: SceneObject[];
};

export type AtlasProject = {
  version: 1;
  id: string;
  title: string;
  width: number;
  height: number;
  updatedAt: string;
  background: BackgroundSettings;
  maps: ImportedMap[];
  activeMapId: string | null;
  layers: Layer[];
  objects: SceneObject[];
  customAssets: UserArtworkAsset[];
  savedGraphics: SavedGraphic[];
};

export type EditorTool =
  | "select"
  | "pan"
  | "marker"
  | "arrow"
  | "region"
  | "text"
  | "freehand";
