import { describe, expect, it } from "vitest";

import {
  buildOpenOffsetPath,
  buildTaperedRibbon,
  buildTaperedRibbonPoints,
  clipSmoothPathToProgress,
  pathFrameAtProgress,
} from "./strokeGeometry";

describe("stroke geometry", () => {
  it("moves the brush head along the real path length", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];

    expect(pathFrameAtProgress(path, 0).point).toEqual({ x: 0, y: 0 });
    expect(pathFrameAtProgress(path, 0.5).point).toMatchObject({
      x: 50,
      y: 0,
    });
    expect(pathFrameAtProgress(path, 1).point).toEqual({ x: 100, y: 0 });
  });

  it("returns the tangent that controls arrow rotation", () => {
    const frame = pathFrameAtProgress(
      [
        { x: 10, y: 20 },
        { x: 10, y: 120 },
      ],
      0.5,
    );

    expect(frame.angle).toBeCloseTo(Math.PI / 2, 5);
  });

  it("clips an animated path exactly at its current head", () => {
    const clipped = clipSmoothPathToProgress(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0.35,
    );

    expect(clipped[0]).toEqual({ x: 0, y: 0 });
    expect(clipped.at(-1)).toMatchObject({ x: 35, y: 0 });
  });

  it("builds a wedge from different start and end widths", () => {
    const sides = buildTaperedRibbonPoints(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0,
      20,
    );

    expect(sides.left[0]).toMatchObject({ x: 0, y: 0 });
    expect(sides.right[0]).toMatchObject({ x: 0, y: 0 });
    expect(sides.left.at(-1)).toMatchObject({ x: 100, y: -10 });
    expect(sides.right.at(-1)).toMatchObject({ x: 100, y: 10 });

    const ribbon = buildTaperedRibbon(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0,
      20,
    );
    expect(ribbon).toContain("M");
    expect(ribbon).toContain("Z");
  });

  it("keeps each double rail as an independent open path", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 40, y: 20 },
      { x: 100, y: 0 },
    ];

    const upper = buildOpenOffsetPath(points, 4);
    const lower = buildOpenOffsetPath(points, -4);

    expect(upper).not.toContain("Z");
    expect(lower).not.toContain("Z");
    expect(upper).not.toBe(lower);
  });
});
