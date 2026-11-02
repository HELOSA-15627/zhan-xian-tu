import { beforeEach, describe, expect, it } from "vitest";

import { createArrow, createMarker } from "../model/project";
import { descendantLayerIds } from "../model/layerTree";
import { useEditorStore } from "./editorStore";

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("adds an object and undoes it", () => {
    const store = useEditorStore.getState();
    const layerId = store.project.layers[0].id;
    const marker = createMarker(layerId, { x: 50, y: 50 });

    store.addObject(marker);
    expect(useEditorStore.getState().project.objects).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().project.objects).toHaveLength(0);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().project.objects).toHaveLength(1);
  });

  it("updates an object without recording viewport changes", () => {
    const layerId = useEditorStore.getState().project.layers[0].id;
    const marker = createMarker(layerId, { x: 0, y: 0 });
    useEditorStore.getState().addObject(marker);
    const historyLength = useEditorStore.getState().past.length;

    useEditorStore.getState().updateObject(marker.id, { x: 80 });
    useEditorStore.getState().setViewport({ x: 20, y: 20, scale: 2 });

    expect(useEditorStore.getState().past).toHaveLength(historyLength + 1);
    expect(useEditorStore.getState().viewport).toEqual({
      x: 20,
      y: 20,
      scale: 2,
    });
  });

  it("deletes selected objects and clears the selection", () => {
    const layerId = useEditorStore.getState().project.layers[0].id;
    const marker = createMarker(layerId, { x: 0, y: 0 });
    useEditorStore.getState().addObject(marker);
    useEditorStore.getState().setSelection([marker.id]);

    useEditorStore.getState().removeSelected();

    expect(useEditorStore.getState().project.objects).toHaveLength(0);
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it("duplicates the selected object with an offset", () => {
    const layerId = useEditorStore.getState().project.layers[0].id;
    const marker = createMarker(layerId, { x: 15, y: 25 });
    useEditorStore.getState().addObject(marker);
    useEditorStore.getState().setSelection([marker.id]);

    useEditorStore.getState().duplicateSelected();

    expect(useEditorStore.getState().project.objects).toHaveLength(2);
    expect(useEditorStore.getState().project.objects[1]).toMatchObject({
      type: "marker",
      x: 27,
      y: 37,
    });
  });

  it("toggles layer visibility and supports undo", () => {
    const layerId = useEditorStore.getState().project.layers[0].id;
    useEditorStore.getState().toggleLayer(layerId);

    expect(useEditorStore.getState().project.layers[0].visible).toBe(false);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().project.layers[0].visible).toBe(true);
  });

  it("reorders layers, changes opacity and moves objects between layers", () => {
    const store = useEditorStore.getState();
    const lowerLayer = store.project.layers[0];
    store.addLayer("上层");
    const upperLayer =
      useEditorStore.getState().project.layers[1];
    const first = createMarker(lowerLayer.id, { x: 10, y: 10 });
    first.label = "A";
    const second = createMarker(lowerLayer.id, { x: 20, y: 20 });
    second.label = "B";
    store.addObject(first);
    store.addObject(second);

    useEditorStore.getState().moveObjectInLayer(second.id, -1);
    expect(
      useEditorStore.getState().project.objects.map((object) => object.id),
    ).toEqual([second.id, first.id]);

    useEditorStore.getState().moveObjectToLayer(second.id, upperLayer.id);
    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      id: second.id,
      layerId: upperLayer.id,
    });

    useEditorStore.getState().moveLayer(upperLayer.id, -1);
    expect(useEditorStore.getState().project.layers[0].id).toBe(
      upperLayer.id,
    );

    useEditorStore.getState().setLayerOpacity(upperLayer.id, 0.35);
    expect(useEditorStore.getState().project.layers[0].opacity).toBe(0.35);
  });

  it("selects a tactical symbol without creating history", () => {
    const historyLength = useEditorStore.getState().past.length;

    useEditorStore.getState().setActiveSymbol("aviation");

    expect(useEditorStore.getState().activeSymbol).toBe("aviation");
    expect(useEditorStore.getState().past).toHaveLength(historyLength);
  });

  it("switches arrow, region and brush settings without creating history", () => {
    const historyLength = useEditorStore.getState().past.length;
    const store = useEditorStore.getState();

    store.setArrowDrawMode("polyline");
    store.setRegionDrawMode("direct");
    store.setActiveBrush("taper");

    expect(useEditorStore.getState()).toMatchObject({
      arrowDrawMode: "polyline",
      regionDrawMode: "direct",
      activeBrush: "taper",
    });
    expect(localStorage.getItem("tactical-atlas:arrow-draw-mode")).toBe(
      "polyline",
    );
    expect(localStorage.getItem("tactical-atlas:region-draw-mode")).toBe(
      "direct",
    );
    expect(localStorage.getItem("tactical-atlas:active-brush")).toBe("taper");
    expect(useEditorStore.getState().past).toHaveLength(historyLength);
  });

  it("replaces the background and map dimensions together", () => {
    useEditorStore
      .getState()
      .applyBackground("data:image/png;base64,AAAA", 1200, 800);

    expect(useEditorStore.getState().project).toMatchObject({
      width: 1200,
      height: 800,
      background: {
        dataUrl: "data:image/png;base64,AAAA",
      },
    });
  });

  it("keeps imported maps in a selectable list", () => {
    const store = useEditorStore.getState();
    store.applyBackground(
      "data:image/png;base64,AAAA",
      1200,
      800,
      "北线地图",
    );
    const firstId = useEditorStore.getState().project.activeMapId;
    store.applyBackground(
      "data:image/png;base64,BBBB",
      800,
      600,
      "南线地图",
    );

    expect(useEditorStore.getState().project.maps).toHaveLength(2);
    expect(useEditorStore.getState().project).toMatchObject({
      width: 800,
      height: 600,
      background: { dataUrl: "data:image/png;base64,BBBB" },
    });

    if (!firstId) throw new Error("First map was not activated");
    useEditorStore.getState().selectMap(firstId);

    expect(useEditorStore.getState().project).toMatchObject({
      width: 1200,
      height: 800,
      activeMapId: firstId,
      background: { dataUrl: "data:image/png;base64,AAAA" },
    });
  });

  it("keeps an independent layer and object tree for each basemap", () => {
    const store = useEditorStore.getState();
    store.applyBackground(
      "data:image/png;base64,AAAA",
      1200,
      800,
      "A 图",
    );
    const mapA = useEditorStore.getState().project.activeMapId!;
    const layerA = useEditorStore.getState().project.layers[0].id;
    useEditorStore
      .getState()
      .addObject(createMarker(layerA, { x: 30, y: 40 }));

    useEditorStore
      .getState()
      .applyBackground(
        "data:image/png;base64,BBBB",
        900,
        600,
        "B 图",
      );
    const mapB = useEditorStore.getState().project.activeMapId!;
    expect(useEditorStore.getState().project.objects).toHaveLength(0);
    expect(useEditorStore.getState().activeLayerId).toBe(
      useEditorStore.getState().project.layers[0].id,
    );
    const layerB = useEditorStore.getState().project.layers[0].id;
    useEditorStore
      .getState()
      .addObject(createMarker(layerB, { x: 70, y: 80 }));

    useEditorStore.getState().selectMap(mapA);
    expect(useEditorStore.getState().project.objects).toHaveLength(1);
    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      x: 30,
      y: 40,
    });

    useEditorStore.getState().selectMap(mapB);
    expect(useEditorStore.getState().project.objects).toHaveLength(1);
    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      x: 70,
      y: 80,
    });
  });

  it("groups the active layer and hides the child through the group", () => {
    const store = useEditorStore.getState();
    const childId = store.project.layers[0].id;
    store.createGroupFromActiveLayer("北线编组");
    const next = useEditorStore.getState();
    const group = next.project.layers.find((layer) => layer.kind === "group");

    expect(group).toBeDefined();
    expect(
      next.project.layers.find((layer) => layer.id === childId)?.parentId,
    ).toBe(group?.id);

    next.toggleLayer(group!.id);
    expect(
      useEditorStore.getState().project.layers.find(
        (layer) => layer.id === group!.id,
      )?.visible,
    ).toBe(false);
    expect(
      useEditorStore.getState().project.layers.find(
        (layer) => layer.id === childId,
      )?.visible,
    ).toBe(true);
  });

  it("creates a child layer directly below the annotation layer", () => {
    const store = useEditorStore.getState();
    const parentId = store.project.layers[0].id;

    store.addLayer("单位子层", parentId);

    expect(
      useEditorStore
        .getState()
        .project.layers.find((layer) => layer.name === "单位子层"),
    ).toMatchObject({
      parentId,
      kind: "layer",
    });
  });

  it("saves and recalls a layer tree as a named reusable graphic", () => {
    const store = useEditorStore.getState();
    const layerId = store.project.layers[0].id;
    const marker = createMarker(layerId, { x: 30, y: 40 });
    marker.label = "存档单位";
    store.addObject(marker);

    useEditorStore
      .getState()
      .saveLayerAsGraphic(layerId, "北线突击群");
    const saved = useEditorStore.getState().project.savedGraphics[0];
    expect(saved).toMatchObject({
      name: "北线突击群",
      objects: [
        expect.objectContaining({
          type: "marker",
          label: "存档单位",
        }),
      ],
    });

    useEditorStore.getState().insertSavedGraphic(saved.id);
    const project = useEditorStore.getState().project;
    expect(project.objects).toHaveLength(2);
    expect(project.objects[1].layerId).not.toBe(layerId);
    expect(
      project.layers.some(
        (layer) => layer.kind === "group" && layer.name === "北线突击群",
      ),
    ).toBe(true);
  });

  it("normalizes adjustable outline and dash controls", () => {
    const store = useEditorStore.getState();
    const layerId = store.project.layers[0].id;
    const marker = createMarker(layerId, { x: 0, y: 0 });
    const arrow = createArrow(
      layerId,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    store.addObject(marker);
    store.addObject(arrow);

    useEditorStore.getState().updateObject(marker.id, { strokeWidth: 40 });
    useEditorStore.getState().updateObject(arrow.id, {
      headSize: 0,
      lineDashCount: 2,
    });

    expect(
      useEditorStore.getState().project.objects[0],
    ).toMatchObject({ strokeWidth: 16 });
    expect(useEditorStore.getState().project.objects[1]).toMatchObject({
      headSize: 0,
      lineDashCount: 4,
    });
  });

  it("groups and archives nested sublayers below the annotation tree", () => {
    const store = useEditorStore.getState();
    const leafId = store.project.layers[0].id;
    store.createGroupFromActiveLayer("一级编组");
    useEditorStore.getState().createGroupFromActiveLayer("二级编组");
    const project = useEditorStore.getState().project;
    const nestedGroup = project.layers.find(
      (layer) => layer.name === "二级编组",
    )!;

    expect(
      descendantLayerIds(project.layers, nestedGroup.id),
    ).toEqual(expect.arrayContaining([leafId]));
    useEditorStore
      .getState()
      .saveLayerAsGraphic(nestedGroup.id, "深层编组存档");
    expect(
      useEditorStore.getState().project.savedGraphics.at(-1),
    ).toMatchObject({
      name: "深层编组存档",
      layers: expect.arrayContaining([
        expect.objectContaining({ name: "一级编组" }),
        expect.objectContaining({ name: "二级编组" }),
      ]),
    });
  });
});
