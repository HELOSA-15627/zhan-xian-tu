import { describe, expect, it } from "vitest";

import {
  buildLuminanceContours,
  isBlueWaterPixel,
} from "./contours";

describe("luminance contours", () => {
  it("builds multiple levels through a luminance gradient", () => {
    const luminance = [
      [0, 0, 0.25, 0.5, 0.75, 1],
      [0, 0, 0.25, 0.5, 0.75, 1],
      [0, 0, 0.25, 0.5, 0.75, 1],
    ];
    const levels = buildLuminanceContours(luminance, 4, {
      x: 100,
      y: 80,
      width: 500,
      height: 240,
    });

    expect(levels).toHaveLength(4);
    expect(levels.every((paths) => paths.length > 0)).toBe(true);
    expect(levels[0][0]).toMatch(/^M/);
  });

  it("returns no contour segments for a flat image", () => {
    const levels = buildLuminanceContours(
      [
        [0.5, 0.5],
        [0.5, 0.5],
      ],
      4,
      { x: 0, y: 0, width: 100, height: 100 },
    );

    expect(levels.every((paths) => paths.length === 0)).toBe(true);
  });

  it("recognizes blue water while keeping green land and gray paper", () => {
    expect(isBlueWaterPixel(20, 100, 220, 255)).toBe(true);
    expect(isBlueWaterPixel(80, 150, 180, 255)).toBe(true);
    expect(isBlueWaterPixel(70, 170, 70, 255)).toBe(false);
    expect(isBlueWaterPixel(150, 150, 150, 255)).toBe(false);
  });

  it("does not generate contours through water-mask cells", () => {
    const levels = buildLuminanceContours(
      [
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
      ],
      4,
      { x: 0, y: 0, width: 300, height: 200 },
      [
        [false, true, true, false],
        [false, true, true, false],
        [false, true, true, false],
      ],
    );

    expect(levels.flat()).toHaveLength(0);
  });
});
