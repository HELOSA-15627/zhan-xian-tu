import { describe, expect, it } from "vitest";

import { buildAlignmentGuides } from "./alignmentGuides";

describe("alignment guides", () => {
  it("reports the nearest horizontal and vertical pixel gaps", () => {
    const guides = buildAlignmentGuides(
      { x: 100, y: 100, width: 80, height: 40 },
      [
        {
          id: "neighbor",
          bounds: { x: 220, y: 90, width: 60, height: 60 },
        },
      ],
      80,
    );

    expect(guides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          axis: "x",
          distance: 40,
          from: 180,
          to: 220,
        }),
      ]),
    );
  });

  it("ignores distant neighbors", () => {
    const guides = buildAlignmentGuides(
      { x: 0, y: 0, width: 20, height: 20 },
      [
        {
          id: "far",
          bounds: { x: 300, y: 300, width: 20, height: 20 },
        },
      ],
      20,
    );

    expect(guides).toEqual([]);
  });
});
