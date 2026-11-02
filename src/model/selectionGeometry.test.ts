import { describe, expect, it } from "vitest";

import { createMarker, createRegion } from "./project";
import {
  flipObject,
  objectBounds,
  resizeObjectFromDelta,
  rotateObjectAroundCenter,
} from "./selectionGeometry";

describe("selection geometry", () => {
  it("measures scaled markers on both axes", () => {
    const marker = createMarker("layer", { x: 100, y: 80 });
    marker.scaleX = 2;
    marker.scaleY = 0.5;

    expect(objectBounds(marker)).toEqual({
      x: 12,
      y: 58,
      width: 176,
      height: 44,
    });
  });

  it("resizes both axes from a southeast corner while keeping the northwest corner fixed", () => {
    const region = createRegion("layer", [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ]);

    const resized = resizeObjectFromDelta(region, "se", 50, 30);

    expect(resized.type).toBe("region");
    if (resized.type === "region") {
      expect(resized.points).toEqual([
        { x: 100, y: 100 },
        { x: 250, y: 100 },
        { x: 250, y: 230 },
        { x: 100, y: 230 },
      ]);
    }
  });

  it("keeps the southeast corner fixed from a northwest resize", () => {
    const region = createRegion("layer", [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ]);

    const resized = resizeObjectFromDelta(region, "nw", -20, 10);

    expect(resized.type).toBe("region");
    if (resized.type === "region") {
      expect(resized.points).toEqual([
        { x: 80, y: 110 },
        { x: 200, y: 110 },
        { x: 200, y: 200 },
        { x: 80, y: 200 },
      ]);
    }
  });

  it("rotates geometry around the selection center", () => {
    const region = createRegion("layer", [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ]);

    const rotated = rotateObjectAroundCenter(region, Math.PI / 2);

    expect(rotated.type).toBe("region");
    if (rotated.type === "region") {
      expect(rotated.points).toEqual([
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
        { x: 100, y: 100 },
      ]);
    }
  });

  it("flips badges and tracks the mirror transform", () => {
    const marker = createMarker("layer", { x: 100, y: 80 });
    marker.rotation = 30;

    const flipped = flipObject(marker, "horizontal");

    expect(flipped).toMatchObject({
      type: "marker",
      flipX: true,
      flipY: false,
      rotation: -30,
    });
  });
});
