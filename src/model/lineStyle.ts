import type { LineStyle } from "./types";

export type LineStyleOption = {
  value: LineStyle;
  label: string;
  description: string;
};

export const LINE_STYLE_OPTIONS: LineStyleOption[] = [
  {
    value: "solid",
    label: "推进带",
    description: "宽色带实心推进",
  },
  {
    value: "dashed",
    label: "计划虚线",
    description: "短划表示预定路线",
  },
  {
    value: "double",
    label: "防线双轨",
    description: "双线表示防线或走廊",
  },
  {
    value: "dotted",
    label: "警戒点线",
    description: "点线表示监视或警戒范围",
  },
  {
    value: "phase",
    label: "阶段线",
    description: "长划表示阶段控制线",
  },
  {
    value: "dashdot",
    label: "边界点划",
    description: "长划与点交替表示行动边界",
  },
  {
    value: "ticked",
    label: "栅栏防线",
    description: "中心线加规则横齿表示防线",
  },
];

export function isLineStyle(value: unknown): value is LineStyle {
  return LINE_STYLE_OPTIONS.some((option) => option.value === value);
}

export function normalizeLineStyle(value: unknown): LineStyle {
  return isLineStyle(value) ? value : "solid";
}

export function lineStyleLabel(style: LineStyle): string {
  return (
    LINE_STYLE_OPTIONS.find((option) => option.value === style)?.label ??
    "推进带"
  );
}

export function lineDashArray(
  style: LineStyle,
  width: number,
  segmentCount?: number,
  pathLength?: number,
): string | undefined {
  const safeWidth = Math.max(1, width);

  if (
    pathLength &&
    pathLength > 0 &&
    typeof segmentCount === "number" &&
    Number.isFinite(segmentCount)
  ) {
    const count = Math.min(80, Math.max(4, Math.round(segmentCount)));
    const slot = pathLength / count;
    const round = (value: number) => Math.round(value * 1000) / 1000;
    switch (style) {
      case "dashed":
        return `${round(slot * 0.62)} ${round(slot * 0.38)}`;
      case "dotted": {
        const dot = Math.min(slot * 0.3, Math.max(1.5, safeWidth * 0.5));
        return `${round(dot)} ${round(Math.max(0.5, slot - dot))}`;
      }
      case "phase":
        return `${round(slot * 0.78)} ${round(slot * 0.22)}`;
      case "dashdot": {
        const dash = slot * 0.55;
        const gap = slot * 0.18;
        const dot = Math.min(slot * 0.09, Math.max(1.5, safeWidth * 0.3));
        return `${round(dash)} ${round(gap)} ${round(dot)} ${round(
          Math.max(0.5, slot - dash - gap - dot),
        )}`;
      }
      case "solid":
      case "double":
      case "ticked":
        return undefined;
    }
  }

  switch (style) {
    case "dashed":
      return `${Math.max(12, safeWidth * 2.4)} ${Math.max(7, safeWidth * 1.25)}`;
    case "dotted":
      return `${Math.max(1.5, safeWidth * 0.28)} ${Math.max(6, safeWidth * 1.4)}`;
    case "phase":
      return `${Math.max(22, safeWidth * 3.8)} ${Math.max(10, safeWidth * 1.8)}`;
    case "dashdot":
      return `${Math.max(18, safeWidth * 3)} ${Math.max(6, safeWidth)} ${Math.max(2, safeWidth * 0.3)} ${Math.max(6, safeWidth)}`;
    case "solid":
    case "double":
    case "ticked":
      return undefined;
  }
}
