import { describe, expect, it } from "vitest";

import { createRegion } from "./project";
import {
  applyRegionShapePreset,
  buildRegionDashArray,
  canDragRegion,
  canInsertRegionVertex,
  insertRegionVertex,
  nearestRegionBoundaryPoint,
  regionContainsPoint,
} from "./regionGeometry";

describe("region geometry", () => {
  it("lets a locked closed region move without accepting new vertices", () => {
    const region = createRegion("layer", [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.geometryLocked = true;

    expect(canInsertRegionVertex(region)).toBe(false);
    expect(canDragRegion(region)).toBe(true);
  });

  it("projects a boundary click onto the nearest segment", () => {
    const region = createRegion("layer", [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);

    expect(nearestRegionBoundaryPoint(region, { x: 70, y: 28 })).toMatchObject({
      point: { x: 70, y: 20 },
      segmentIndex: 0,
      distance: 8,
    });
  });

  it("inserts a vertex after unlocking while keeping the region closed", () => {
    const region = createRegion("layer", [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);

    const result = insertRegionVertex(region, { x: 70, y: 22 });

    expect(result.points).toHaveLength(4);
    expect(result.points[1]).toEqual({ x: 70, y: 20 });
    expect(result.closed).toBe(true);
    expect(result.shapePreset).toBe("custom");
    expect(region.points).toHaveLength(3);
  });

  it("does not alter locked geometry", () => {
    const region = createRegion("layer", [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.geometryLocked = true;

    const result = insertRegionVertex(region, { x: 70, y: 22 });

    expect(result).toEqual(region);
  });

  it("recognizes clicks inside a closed region", () => {
    const region = createRegion("layer", [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);

    expect(regionContainsPoint(region, { x: 70, y: 50 })).toBe(true);
    expect(regionContainsPoint(region, { x: 10, y: 50 })).toBe(false);
  });

  it("builds rectangle and diamond presets from the current bounds", () => {
    const region = createRegion("layer", [
      { x: 0, y: 20 },
      { x: 100, y: 0 },
      { x: 60, y: 80 },
    ]);

    expect(applyRegionShapePreset(region, "rectangle").points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ]);
    expect(applyRegionShapePreset(region, "diamond").points).toEqual([
      { x: 50, y: 0 },
      { x: 100, y: 40 },
      { x: 50, y: 80 },
      { x: 0, y: 40 },
    ]);
  });

  it("builds a smooth closed ellipse preset inside the bounds", () => {
    const region = createRegion("layer", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ]);

    const ellipse = applyRegionShapePreset(region, "ellipse");

    expect(ellipse.shapePreset).toBe("ellipse");
    expect(ellipse.closed).toBe(true);
    expect(ellipse.points.length).toBeGreaterThanOrEqual(24);
    expect(
      ellipse.points.every(
        (point) =>
          point.x >= 0 &&
          point.x <= 100 &&
          point.y >= 0 &&
          point.y <= 80,
      ),
    ).toBe(true);
  });

  it("derives dash segments from the boundary perimeter and requested count", () => {
    const region = createRegion("layer", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]);
    region.lineStyle = "dashed";
    region.lineDashCount = 8;

    expect(buildRegionDashArray(region)).toBe("31 19");

    region.lineDashCount = 16;
    expect(buildRegionDashArray(region)).toBe("15.5 9.5");
  });
});
