import { describe, expect, it } from "vitest";

import {
  BRUSH_PRESETS,
  DEFAULT_BRUSH_PRESET_ID,
  brushPresetFor,
} from "./brushes";

describe("brush presets", () => {
  it("offers fine, drafting, broad and tapered brushes", () => {
    expect(BRUSH_PRESETS.map((preset) => preset.id)).toEqual([
      "command",
      "drafting",
      "advance",
      "taper",
    ]);
    expect(DEFAULT_BRUSH_PRESET_ID).toBe("advance");
  });

  it("defines independent endpoint widths for the tapered brush", () => {
    expect(brushPresetFor("taper")).toMatchObject({
      arrowWidth: 12,
      freehandWidth: 8,
      startWidth: 12,
      endWidth: 2,
    });
  });
});
