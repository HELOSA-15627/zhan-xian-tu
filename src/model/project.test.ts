import { describe, expect, it } from "vitest";

import {
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
});
