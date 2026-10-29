import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createMarker } from "../model/project";
import { useEditorStore } from "../store/editorStore";
import { MapCanvas } from "./MapCanvas";

describe("map canvas", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("places a marker when clicking with the marker tool", () => {
    useEditorStore.getState().setTool("marker");
    render(<MapCanvas />);

    fireEvent.pointerDown(screen.getByTestId("map-canvas"), {
      button: 0,
      clientX: 120,
      clientY: 90,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      x: 120,
      y: 90,
    });
  });

  it("creates an arrow from pointer down to pointer up", () => {
    useEditorStore.getState().setTool("arrow");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 260,
      clientY: 180,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 260,
      clientY: 180,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "arrow",
      start: { x: 100, y: 100 },
      end: { x: 260, y: 180 },
    });
  });

  it("starts an arrow even when its origin overlaps an existing object", () => {
    const store = useEditorStore.getState();
    const layerId = store.project.layers[0].id;
    store.addObject(createMarker(layerId, { x: 100, y: 100 }));
    store.setTool("arrow");
    const { container } = render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");
    const marker = container.querySelector("[data-object-id]");
    if (!marker) throw new Error("Marker SVG was not rendered");

    fireEvent.pointerDown(marker, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 240,
      clientY: 180,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 240,
      clientY: 180,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects).toHaveLength(2);
    expect(useEditorStore.getState().project.objects[1]).toMatchObject({
      type: "arrow",
      start: { x: 100, y: 100 },
      end: { x: 240, y: 180 },
    });
  });

  it("zooms around the pointer without changing the world point", () => {
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");
    const viewportBefore = useEditorStore.getState().viewport;

    fireEvent.wheel(canvas, { clientX: 300, clientY: 200, deltaY: -120 });

    const viewportAfter = useEditorStore.getState().viewport;
    expect(viewportAfter.scale).toBeGreaterThan(viewportBefore.scale);
    expect(viewportAfter.x).toBeLessThan(viewportBefore.x);
  });
});
