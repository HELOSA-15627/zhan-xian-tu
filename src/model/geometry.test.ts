import { describe, expect, it } from "vitest";

import {
  clampScale,
  fitViewport,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from "./geometry";

describe("map geometry", () => {
  it("round-trips a point through screen and world coordinates", () => {
    const viewport = { x: 120, y: 80, scale: 1.75 };
    const world = { x: 310, y: 240 };

    expect(screenToWorld(worldToScreen(world, viewport), viewport)).toEqual(
      world,
    );
  });

  it("fits the map inside a padded viewport", () => {
    expect(
      fitViewport(
        { width: 1600, height: 900 },
        { width: 1000, height: 700 },
        40,
      ),
    ).toEqual({ scale: 0.575, x: 40, y: 91.25 });
  });

  it("keeps the pointer world position fixed while zooming", () => {
    const viewport = { x: 0, y: 0, scale: 1 };
    const pointer = { x: 300, y: 200 };
    const before = screenToWorld(pointer, viewport);
    const next = zoomAt(viewport, pointer, 2);

    expect(screenToWorld(pointer, next)).toEqual(before);
  });

  it("clamps extreme zoom values", () => {
    expect(clampScale(0.001)).toBe(0.05);
    expect(clampScale(20)).toBe(8);
  });
});
