import {
  ArrowUpRight,
  Cursor,
  Hand,
  MapPin,
  Path,
  Polygon,
  TextT,
} from "@phosphor-icons/react";

import type { EditorTool } from "../model/types";
import { useEditorStore } from "../store/editorStore";

const tools: Array<{
  tool: EditorTool;
  label: string;
  icon: typeof Cursor;
  shortcut: string;
}> = [
  { tool: "select", label: "选择", icon: Cursor, shortcut: "V" },
  { tool: "pan", label: "平移", icon: Hand, shortcut: "H" },
  { tool: "marker", label: "图标", icon: MapPin, shortcut: "M" },
  { tool: "arrow", label: "箭头", icon: ArrowUpRight, shortcut: "A" },
  { tool: "region", label: "区域", icon: Polygon, shortcut: "R" },
  { tool: "text", label: "文字", icon: TextT, shortcut: "T" },
  { tool: "freehand", label: "手绘", icon: Path, shortcut: "P" },
];

export function ToolRail() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <aside aria-label="绘图工具" className="tool-rail">
      {tools.map(({ tool: item, label, icon: Icon, shortcut }) => (
        <button
          aria-label={label}
          aria-pressed={tool === item}
          className="tool-button"
          key={item}
          onClick={() => setTool(item)}
          title={`${label} (${shortcut})`}
          type="button"
        >
          <Icon aria-hidden="true" size={20} />
        </button>
      ))}
    </aside>
  );
}
