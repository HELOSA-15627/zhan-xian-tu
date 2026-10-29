import { beforeEach, describe, expect, it } from "vitest";

import { createMarker } from "../model/project";
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

  it("selects a tactical symbol without creating history", () => {
    const historyLength = useEditorStore.getState().past.length;

    useEditorStore.getState().setActiveSymbol("aviation");

    expect(useEditorStore.getState().activeSymbol).toBe("aviation");
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
});
