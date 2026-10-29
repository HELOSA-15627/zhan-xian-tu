import type { TacticalSymbol as TacticalSymbolName } from "../model/types";
import { useEditorStore } from "../store/editorStore";
import { TacticalSymbol } from "./TacticalSymbol";

const symbolItems: Array<{
  symbol: TacticalSymbolName;
  label: string;
  color: string;
}> = [
  { symbol: "friendly", label: "友军", color: "#b9e253" },
  { symbol: "hostile", label: "敌军", color: "#e85a4f" },
  { symbol: "headquarters", label: "指挥部", color: "#e8b34a" },
  { symbol: "defense", label: "防线", color: "#b9e253" },
  { symbol: "nest", label: "巢穴", color: "#e3318d" },
  { symbol: "objective", label: "目标", color: "#e8b34a" },
  { symbol: "armor", label: "装甲", color: "#5cc7d8" },
  { symbol: "aviation", label: "航空", color: "#5cc7d8" },
];

export function AssetLibrary() {
  const activeSymbol = useEditorStore((state) => state.activeSymbol);
  const setActiveSymbol = useEditorStore((state) => state.setActiveSymbol);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <section aria-label="战役图标库">
      <div className="panel-heading">
        <span>战役图标</span>
        <span className="count-pill">8 个</span>
      </div>
      <p className="panel-copy">选择一种符号后，在地图上点击落位。</p>
      <div className="symbol-grid">
        {symbolItems.map(({ symbol, label, color }) => (
          <button
            aria-label={`${label}图标`}
            aria-pressed={activeSymbol === symbol}
            className="symbol-card"
            key={symbol}
            onClick={() => {
              setActiveSymbol(symbol);
              setTool("marker");
            }}
            type="button"
          >
            <TacticalSymbol color={color} size={28} symbol={symbol} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
