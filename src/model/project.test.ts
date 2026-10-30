import { describe, expect, it } from "vitest";

import {
  DEFAULT_MARKER_SIZE,
  createArrow,
  createBlankProject,
  createFreehand,
  createMarker,
  createRegion,
  createText,
  duplicateObject,
} from "./project";

describe("project factories", () => {
  it("creates a project with one editable annotation layer", () => {
    const project = createBlankProject("测试地图");

    expect(project.title).toBe("测试地图");
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0].locked).toBe(false);
  });

  it("creates every object type on the requested layer", () => {
    const layerId = "layer-1";
    const point = { x: 40, y: 80 };
    const objects = [
      createMarker(layerId, point),
      createArrow(layerId, point, { x: 240, y: 180 }),
      createRegion(layerId, [point, { x: 100, y: 100 }]),
      createText(layerId, point, "指挥部"),
      createFreehand(layerId, [point, { x: 60, y: 90 }]),
    ];

    expect(objects.map((object) => object.type)).toEqual([
      "marker",
      "arrow",
      "region",
      "text",
      "freehand",
    ]);
    expect(objects.every((object) => object.layerId === layerId)).toBe(true);
  });

  it("duplicates with a fresh identity and offset position", () => {
    const marker = createMarker("layer-1", { x: 10, y: 20 });
    const copy = duplicateObject(marker);

    expect(copy.id).not.toBe(marker.id);
    expect(copy.type).toBe("marker");
    if (copy.type === "marker") {
      expect(copy.x).toBe(22);
      expect(copy.y).toBe(32);
    }
  });

  it("creates solid arrow and freehand strokes by default", () => {
    const arrow = createArrow("layer-1", { x: 0, y: 0 }, { x: 120, y: 60 });
    const freehand = createFreehand("layer-1", [
      { x: 0, y: 0 },
      { x: 40, y: 20 },
    ]);

    expect(arrow.lineStyle).toBe("solid");
    expect(freehand.lineStyle).toBe("solid");
  });

  it("creates arrows and freehand lines with uniform endpoint widths", () => {
    const arrow = createArrow("layer-1", { x: 0, y: 0 }, { x: 100, y: 0 });
    const freehand = createFreehand("layer-1", [
      { x: 0, y: 0 },
      { x: 40, y: 10 },
    ]);

    expect(arrow).toMatchObject({
      width: 10,
      startWidth: 10,
      endWidth: 10,
      headSize: 34,
      headStyle: "psd",
    });
    expect(freehand).toMatchObject({
      strokeWidth: 4,
      startWidth: 4,
      endWidth: 4,
    });
  });

  it("creates regions closed and geometry-unlocked by default", () => {
    const region = createRegion("layer-1", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ]);

    expect(region.closed).toBe(true);
    expect(region.geometryLocked).toBe(false);
    expect(region.shapePreset).toBe("custom");
    expect(region.lineStyle).toBe("solid");
    expect(region.lineDashCount).toBe(24);
    expect(region.fill).toBe(region.stroke);
  });

  it("creates fully opaque markers by default", () => {
    const marker = createMarker("layer-1", { x: 0, y: 0 });

    expect(marker.opacity).toBe(1);
  });

  it("places flag markers without a default annotation", () => {
    const marker = createMarker(
      "layer-1",
      { x: 0, y: 0 },
      "friendly",
      {
        affiliation: "friendly",
        artwork: "flag-north-point",
        artworkSource: "flag",
      },
    );

    expect(marker).toMatchObject({
      artwork: "flag-north-point",
      artworkSource: "flag",
      label: "",
    });
  });

  it("uses one uniform default unit badge size", () => {
    const markers = [
      createMarker("layer-1", { x: 0, y: 0 }, "friendly"),
      createMarker("layer-1", { x: 0, y: 0 }, "hostile"),
      createMarker("layer-1", { x: 0, y: 0 }, "objective"),
    ];

    expect(markers.map((marker) => marker.size)).toEqual([
      DEFAULT_MARKER_SIZE,
      DEFAULT_MARKER_SIZE,
      DEFAULT_MARKER_SIZE,
    ]);
    expect(markers.every((marker) => marker.artworkSource === "psd")).toBe(true);
  });

  it("stores a natural arrow path and target tint", () => {
    const arrow = createArrow(
      "layer-1",
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      "solid",
      "objective",
      [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
        { x: 100, y: 50 },
      ],
    );

    expect(arrow.points).toHaveLength(3);
    expect(arrow.tint).toBe("objective");
  });
});
