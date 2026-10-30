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
): string | undefined {
  const safeWidth = Math.max(1, width);

  switch (style) {
    case "dashed":
      return `${Math.max(12, safeWidth * 2.4)} ${Math.max(7, safeWidth * 1.25)}`;
    case "dotted":
      return `${Math.max(1.5, safeWidth * 0.28)} ${Math.max(6, safeWidth * 1.4)}`;
    case "solid":
    case "double":
      return undefined;
  }
}
