import type { BrushPresetId } from "./types";

export type BrushPreset = {
  id: BrushPresetId;
  label: string;
  description: string;
  arrowWidth: number;
  freehandWidth: number;
  startWidth: number;
  endWidth: number;
};

export const BRUSH_PRESETS: BrushPreset[] = [
  {
    id: "command",
    label: "指挥细笔",
    description: "细而清晰的指挥标记",
    arrowWidth: 3,
    freehandWidth: 2,
    startWidth: 3,
    endWidth: 3,
  },
  {
    id: "drafting",
    label: "标绘笔",
    description: "日常标图使用的均衡笔触",
    arrowWidth: 6,
    freehandWidth: 4,
    startWidth: 6,
    endWidth: 6,
  },
  {
    id: "advance",
    label: "推进宽笔",
    description: "宽色带与明显行动轴线",
    arrowWidth: 12,
    freehandWidth: 6,
    startWidth: 12,
    endWidth: 12,
  },
  {
    id: "taper",
    label: "渐细笔",
    description: "从宽线头收束到细线尾",
    arrowWidth: 12,
    freehandWidth: 8,
    startWidth: 12,
    endWidth: 2,
  },
];

export const DEFAULT_BRUSH_PRESET_ID: BrushPresetId = "advance";

export const BRUSH_PRESETS_BY_ID = new Map(
  BRUSH_PRESETS.map((preset) => [preset.id, preset]),
);

export function brushPresetFor(id: BrushPresetId): BrushPreset {
  return (
    BRUSH_PRESETS_BY_ID.get(id) ??
    (BRUSH_PRESETS_BY_ID.get(DEFAULT_BRUSH_PRESET_ID) as BrushPreset)
  );
}
