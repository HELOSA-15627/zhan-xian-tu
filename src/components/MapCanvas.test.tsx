import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createMarker, createRegion } from "../model/project";
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
    fireEvent.pointerUp(screen.getByTestId("map-canvas"), {
      button: 0,
      clientX: 122,
      clientY: 91,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      x: 120,
      y: 90,
    });
  });

  it("ignores a dragged placement gesture", () => {
    useEditorStore.getState().setTool("marker");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      button: 0,
      clientX: 120,
      clientY: 112,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects).toHaveLength(0);
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
    const arrow = useEditorStore.getState().project.objects[0];
    expect(arrow?.type === "arrow" ? arrow.points.length : 0).toBeGreaterThan(2);
  });

  it("keeps freehand paths open after pointer release", () => {
    useEditorStore.getState().setTool("freehand");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 130,
      clientY: 110,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 180,
      clientY: 150,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 210,
      clientY: 140,
      pointerId: 1,
    });

    const line = useEditorStore.getState().project.objects[0];
    expect(line?.type).toBe("freehand");
    if (line?.type === "freehand") {
      expect(line.points.length).toBeGreaterThan(2);
      expect(line.points[0]).not.toEqual(line.points.at(-1));
    }
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

  it("drags a marker as one completed history action", () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, {
      x: 100,
      y: 100,
    });
    store.addObject(marker);
    const historyBefore = useEditorStore.getState().past.length;
    const { container } = render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");
    const markerNode = container.querySelector(
      `[data-object-id="${marker.id}"]`,
    );
    if (!markerNode) throw new Error("Marker SVG was not rendered");

    fireEvent.pointerDown(markerNode, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 130,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 170,
      clientY: 150,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 170,
      clientY: 150,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      x: 170,
      y: 150,
    });
    expect(useEditorStore.getState().past).toHaveLength(historyBefore + 1);
  });

  it("drags a locked closed region without changing its shape", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 130 },
    ]);
    region.geometryLocked = true;
    store.addObject(region);
    const { container } = render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");
    const regionNode = container.querySelector(
      `[data-object-id="${region.id}"]`,
    );
    if (!regionNode) throw new Error("Region SVG was not rendered");

    fireEvent.pointerDown(regionNode, {
      button: 0,
      clientX: 100,
      clientY: 75,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 140,
      clientY: 105,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 140,
      clientY: 105,
      pointerId: 1,
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "region",
      geometryLocked: true,
      points: [
        { x: 90, y: 80 },
        { x: 190, y: 80 },
        { x: 140, y: 160 },
      ],
    });
  });

  it("inserts a node into a selected unlocked region with the region tool", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([region.id]);
    store.setTool("region");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 70,
      clientY: 22,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      button: 0,
      clientX: 70,
      clientY: 22,
      pointerId: 1,
    });

    const result = useEditorStore.getState().project.objects[0];
    expect(result.type).toBe("region");
    if (result.type === "region") {
      expect(result.points).toHaveLength(4);
      expect(result.points[1]).toMatchObject({ x: 70, y: 20 });
      expect(result.closed).toBe(true);
    }
    expect(useEditorStore.getState().project.objects).toHaveLength(1);
  });

  it("blocks node insertion when a selected region is locked", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.geometryLocked = true;
    store.addObject(region);
    store.setSelection([region.id]);
    store.setTool("region");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 70,
      clientY: 22,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      button: 0,
      clientX: 70,
      clientY: 22,
      pointerId: 1,
    });

    const result = useEditorStore.getState().project.objects[0];
    expect(result.type).toBe("region");
    if (result.type === "region") {
      expect(result.points).toHaveLength(3);
      expect(result.geometryLocked).toBe(true);
    }
  });

  it("selects an existing closed region when clicking its interior with the region tool", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([]);
    store.setTool("region");
    render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 70,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      button: 0,
      clientX: 70,
      clientY: 50,
      pointerId: 1,
    });

    expect(useEditorStore.getState().selectedIds).toEqual([region.id]);
    expect(useEditorStore.getState().project.objects).toHaveLength(1);
  });

  it("previews regions with straight edges and no vertex dots", () => {
    useEditorStore.getState().setTool("region");
    const { container } = render(<MapCanvas />);
    const canvas = screen.getByTestId("map-canvas");

    for (const point of [
      { x: 40, y: 40 },
      { x: 120, y: 40 },
      { x: 80, y: 100 },
    ]) {
      fireEvent.pointerDown(canvas, {
        button: 0,
        clientX: point.x,
        clientY: point.y,
        pointerId: 1,
      });
      fireEvent.pointerUp(canvas, {
        button: 0,
        clientX: point.x,
        clientY: point.y,
        pointerId: 1,
      });
    }

    expect(container.querySelector("[data-region-preview]")).toBeInTheDocument();
    expect(
      container.querySelector('[data-line-role="preview-boundary"]'),
    ).toHaveAttribute("stroke-linejoin", "miter");
    expect(
      container.querySelector('[data-line-role="preview-boundary"]'),
    ).not.toHaveAttribute("stroke-dasharray");
    expect(
      container.querySelectorAll("[data-region-preview] circle"),
    ).toHaveLength(0);
  });

  it("uses the adjustable stabilization strength while drawing", () => {
    const drawOnce = (damping: number) => {
      useEditorStore.getState().createNewProject();
      useEditorStore.getState().setStrokeDamping(damping);
      useEditorStore.getState().setTool("freehand");
      const view = render(<MapCanvas />);
      const canvas = screen.getByTestId("map-canvas");

      fireEvent.pointerDown(canvas, {
        button: 0,
        clientX: 0,
        clientY: 0,
        pointerId: 1,
      });
      fireEvent.pointerMove(canvas, {
        clientX: 100,
        clientY: 0,
        pointerId: 1,
      });
      fireEvent.pointerUp(canvas, {
        clientX: 100,
        clientY: 0,
        pointerId: 1,
      });

      const line = useEditorStore.getState().project.objects[0];
      view.unmount();
      if (line?.type !== "freehand") {
        throw new Error("Expected a freehand line");
      }
      return line;
    };

    const responsive = drawOnce(0);
    const damped = drawOnce(1);

    expect(damped.points[1].x).toBeLessThan(responsive.points[1].x);
  });
});
