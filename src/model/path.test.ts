import { describe, expect, it } from "vitest";

import {
  appendStabilizedPoint,
  measurePath,
  smoothPathData,
  stabilizePoint,
  trimPathEnd,
} from "./path";

describe("natural brush path", () => {
  it("damps pointer jitter instead of snapping to the raw pointer", () => {
    expect(
      stabilizePoint({ x: 0, y: 0 }, { x: 100, y: 40 }, 0.35),
    ).toEqual({ x: 35, y: 14 });
  });

  it("follows input direction without closing the path", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 40, y: 10 },
      { x: 80, y: 50 },
      { x: 130, y: 30 },
    ];
    const path = smoothPathData(points);

    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path).toContain("C");
    expect(path).not.toContain("Z");
    expect(path).toContain("130 30");
  });

  it("reports path length and trims only the terminal shaft segment", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];

    expect(measurePath(points)).toBe(100);
    expect(trimPathEnd(points, 20)).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
    ]);
  });

  it("keeps an open path free of duplicate closure points", () => {
    const points = appendStabilizedPoint(
      [
        { x: 0, y: 0 },
        { x: 20, y: 10 },
      ],
      { x: 20, y: 10 },
    );

    expect(points).toHaveLength(2);
    expect(points.at(0)).not.toEqual(points.at(-1));
  });
});
