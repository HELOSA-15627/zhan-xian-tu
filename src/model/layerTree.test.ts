import { describe, expect, it } from "vitest";

import {
  createBlankProject,
  createLayer,
  createMarker,
} from "./project";
import {
  descendantLayerIds,
  effectiveLayerOpacity,
  effectiveLayerVisible,
  flattenLayerRows,
} from "./layerTree";

describe("layer tree", () => {
  it("hides every descendant when a group is hidden", () => {
    const project = createBlankProject();
    const group = {
      ...createLayer("作战群组"),
      kind: "group" as const,
      parentId: null,
      expanded: true,
    };
    const child = {
      ...createLayer("单位图层"),
      parentId: group.id,
      expanded: true,
    };
    group.visible = false;
    project.layers = [group, child];

    expect(descendantLayerIds(project.layers, group.id)).toEqual([child.id]);
    expect(effectiveLayerVisible(project.layers, child.id)).toBe(false);
  });

  it("multiplies opacity through nested groups", () => {
    const project = createBlankProject();
    const group = {
      ...createLayer("半透明群组"),
      kind: "group" as const,
      parentId: null,
      expanded: true,
      opacity: 0.5,
    };
    const child = {
      ...createLayer("单位图层"),
      parentId: group.id,
      expanded: true,
      opacity: 0.4,
    };
    project.layers = [group, child];

    expect(effectiveLayerOpacity(project.layers, child.id)).toBeCloseTo(0.2);
  });

  it("keeps object ownership on leaf layers", () => {
    const project = createBlankProject();
    const leaf = project.layers[0];
    const marker = createMarker(leaf.id, { x: 0, y: 0 });

    expect(marker.layerId).toBe(leaf.id);
  });

  it("flattens groups in visual front-to-back order", () => {
    const project = createBlankProject();
    const group = {
      ...createLayer("群组"),
      id: "group",
      kind: "group" as const,
      parentId: null,
      expanded: true,
    };
    const child = {
      ...createLayer("子层"),
      id: "child",
      parentId: group.id,
      expanded: true,
    };
    const top = {
      ...createLayer("顶层"),
      id: "top",
      parentId: null,
      expanded: true,
    };
    project.layers = [group, child, top];

    expect(flattenLayerRows(project.layers)).toEqual([
      { layer: top, depth: 0 },
      { layer: group, depth: 0 },
      { layer: child, depth: 1 },
    ]);
  });
});
