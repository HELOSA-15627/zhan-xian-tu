import { describe, expect, it } from "vitest";

import { LINE_STYLE_OPTIONS, lineDashArray } from "./lineStyle";

describe("line styles", () => {
  it("adds phase, boundary dash-dot and ticked defense styles", () => {
    expect(LINE_STYLE_OPTIONS.map((option) => option.value)).toEqual([
      "solid",
      "dashed",
      "double",
      "dotted",
      "phase",
      "dashdot",
      "ticked",
    ]);
  });

  it("uses distinct long-dash and dash-dot patterns", () => {
    expect(lineDashArray("phase", 6)).not.toBe(lineDashArray("dashed", 6));
    expect(lineDashArray("dashdot", 6)).toContain(" ");
    expect(lineDashArray("ticked", 6)).toBeUndefined();
  });
});
