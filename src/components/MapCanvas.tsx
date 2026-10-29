import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";

import {
  fitViewport,
  screenToWorld,
  zoomAt,
} from "../model/geometry";
import {
  createArrow,
  createFreehand,
  createMarker,
  createRegion,
  createText,
} from "../model/project";
import type { Point, SceneObject } from "../model/types";
import { useEditorStore } from "../store/editorStore";
import { SceneSvg } from "./SceneSvg";

type MapCanvasProps = {
  animationTime?: number | null;
};

type ArrowDraft = {
  start: Point;
  end: Point;
};

type FreehandDraft = Point[];

type ObjectDrag = {
  objectId: string;
  start: Point;
  last: Point;
};

function localPoint(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function compactPoints(points: Point[]): Point[] {
  return points.filter(
    (point, index) =>
      index === 0 ||
      Math.hypot(
        point.x - points[index - 1].x,
        point.y - points[index - 1].y,
      ) > 1.5,
  );
}

export function MapCanvas({ animationTime = null }: MapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    start: Point;
    viewportX: number;
    viewportY: number;
  } | null>(null);
  const objectDragRef = useRef<ObjectDrag | null>(null);
  const [arrowDraft, setArrowDraft] = useState<ArrowDraft | null>(null);
  const [freehandDraft, setFreehandDraft] = useState<FreehandDraft>([]);
  const [regionDraft, setRegionDraft] = useState<Point[]>([]);

  const project = useEditorStore((state) => state.project);
  const viewport = useEditorStore((state) => state.viewport);
  const tool = useEditorStore((state) => state.tool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setTool = useEditorStore((state) => state.setTool);
  const setSelection = useEditorStore((state) => state.setSelection);
  const addObject = useEditorStore((state) => state.addObject);
  const updateObject = useEditorStore((state) => state.updateObject);

  const activeLayer = project.layers.find((layer) => layer.id === activeLayerId);
  const drawingEnabled = Boolean(
    activeLayer && activeLayer.visible && !activeLayer.locked,
  );

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const fit = () => {
      if (element.clientWidth <= 0 || element.clientHeight <= 0) return;
      setViewport(
        fitViewport(project, {
          width: element.clientWidth,
          height: element.clientHeight,
        }),
      );
    };

    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [project.width, project.height, setViewport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setArrowDraft(null);
        setFreehandDraft([]);
        setRegionDraft([]);
        setTool("select");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool]);

  const toWorld = (event: { clientX: number; clientY: number }): Point => {
    const element = viewportRef.current;
    if (!element) return { x: 0, y: 0 };
    return screenToWorld(localPoint(event, element), viewport);
  };

  const selectObject = (
    event: ReactPointerEvent<SVGGElement>,
    objectId: string,
  ) => {
    event.stopPropagation();
    setSelection([objectId]);
    if (tool === "select") {
      const point = toWorld(event);
      objectDragRef.current = {
        objectId,
        start: point,
        last: point,
      };
    }
  };

  const finishRegion = () => {
    const points = compactPoints(regionDraft);
    if (points.length >= 3 && drawingEnabled) {
      addObject(createRegion(activeLayerId, points));
    }
    setRegionDraft([]);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 1 || tool === "pan") {
      event.preventDefault();
      const point = localPoint(event, event.currentTarget);
      panRef.current = {
        start: point,
        viewportX: viewport.x,
        viewportY: viewport.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (event.button !== 0) return;
    const world = toWorld(event);

    if (!drawingEnabled) {
      setSelection([]);
      return;
    }

    if (tool === "marker") {
      addObject(createMarker(activeLayerId, world));
      return;
    }

    if (tool === "text") {
      addObject(createText(activeLayerId, world));
      return;
    }

    if (tool === "arrow") {
      setArrowDraft({ start: world, end: world });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (tool === "freehand") {
      setFreehandDraft([world]);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (tool === "region") {
      setRegionDraft((points) => [...points, world]);
      return;
    }

    if (tool === "select") {
      setSelection([]);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      const point = localPoint(event, event.currentTarget);
      const pan = panRef.current;
      setViewport({
        ...viewport,
        x: pan.viewportX + point.x - pan.start.x,
        y: pan.viewportY + point.y - pan.start.y,
      });
      return;
    }

    if (arrowDraft) {
      setArrowDraft({ ...arrowDraft, end: toWorld(event) });
      return;
    }

    if (freehandDraft.length > 0) {
      const next = toWorld(event);
      setFreehandDraft((points) => compactPoints([...points, next]));
      return;
    }

    if (objectDragRef.current) {
      objectDragRef.current.last = toWorld(event);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      panRef.current = null;
      return;
    }

    if (arrowDraft) {
      const end = toWorld(event);
      if (Math.hypot(end.x - arrowDraft.start.x, end.y - arrowDraft.start.y) > 4) {
        addObject(createArrow(activeLayerId, arrowDraft.start, end));
      }
      setArrowDraft(null);
      return;
    }

    if (freehandDraft.length >= 2) {
      addObject(createFreehand(activeLayerId, compactPoints(freehandDraft)));
      setFreehandDraft([]);
      return;
    }

    if (objectDragRef.current) {
      const drag = objectDragRef.current;
      const object = project.objects.find((item) => item.id === drag.objectId);
      const dx = drag.last.x - drag.start.x;
      const dy = drag.last.y - drag.start.y;
      if (object && Math.hypot(dx, dy) > 1) {
        const patch = moveObjectPatch(object, dx, dy);
        updateObject(object.id, patch);
      }
      objectDragRef.current = null;
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const point = localPoint(event, event.currentTarget);
    const nextScale = viewport.scale * Math.exp(-event.deltaY * 0.0012);
    setViewport(zoomAt(viewport, point, nextScale));
  };

  return (
    <section
      aria-label="地图绘制区域"
      className={`canvas-viewport tool-${tool}`}
      data-testid="map-canvas"
      onDoubleClick={() => {
        if (tool === "region") finishRegion();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      ref={viewportRef}
    >
      <div
        className="canvas-transform"
        style={{
          width: project.width,
          height: project.height,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <SceneSvg
          interactive
          onObjectPointerDown={selectObject}
          project={project}
          selectedIds={selectedIds}
          time={animationTime}
        />
        <svg
          aria-hidden="true"
          className="draft-layer"
          height={project.height}
          viewBox={`0 0 ${project.width} ${project.height}`}
          width={project.width}
        >
          {arrowDraft ? (
            <line
              stroke="#e3318d"
              strokeDasharray="9 6"
              strokeWidth="4"
              x1={arrowDraft.start.x}
              x2={arrowDraft.end.x}
              y1={arrowDraft.start.y}
              y2={arrowDraft.end.y}
            />
          ) : null}
          {freehandDraft.length > 1 ? (
            <polyline
              fill="none"
              points={freehandDraft
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              stroke="#e3318d"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ) : null}
          {regionDraft.length > 0 ? (
            <>
              <polyline
                fill="rgba(227, 49, 141, 0.12)"
                points={regionDraft
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                stroke="#e3318d"
                strokeDasharray="8 5"
                strokeWidth="2"
              />
              {regionDraft.map((point, index) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="#f2efe8"
                  key={index}
                  r="4"
                  stroke="#e3318d"
                  strokeWidth="2"
                />
              ))}
            </>
          ) : null}
        </svg>
      </div>
      <div className="canvas-coordinates" aria-live="polite">
        {Math.round(viewport.scale * 100)}%
      </div>
      {project.objects.length === 0 ? (
        <div className="canvas-empty-note">
          <strong>导入底图或直接开始绘制</strong>
          <span>滚轮缩放，中键或平移工具移动画布。</span>
        </div>
      ) : null}
    </section>
  );
}

function moveObjectPatch(
  object: SceneObject,
  dx: number,
  dy: number,
): Record<string, unknown> {
  switch (object.type) {
    case "marker":
    case "text":
      return { x: object.x + dx, y: object.y + dy };
    case "arrow":
      return {
        start: { x: object.start.x + dx, y: object.start.y + dy },
        end: { x: object.end.x + dx, y: object.end.y + dy },
      };
    case "region":
    case "freehand":
      return {
        points: object.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        })),
      };
  }
}
