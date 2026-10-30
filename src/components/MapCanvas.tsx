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
  createArrowPath,
  createFreehand,
  createMarker,
  createRegion,
  createText,
} from "../model/project";
import { lineDashArray } from "../model/lineStyle";
import {
  appendStabilizedPoint,
  finalAngle,
  measurePath,
  smoothPathData,
  trimPathEnd,
} from "../model/path";
import {
  canInsertRegionVertex,
  insertRegionVertex,
  nearestRegionBoundaryPoint,
  regionContainsPoint,
} from "../model/regionGeometry";
import { buildOpenOffsetPath } from "../model/strokeGeometry";
import type {
  LineStyle,
  Point,
  SceneObject,
  UnitAffiliation,
} from "../model/types";
import {
  arrowHeadAssetForTint,
  AFFILIATION_COLORS,
} from "../model/unitAssets";
import { useEditorStore } from "../store/editorStore";
import { SceneSvg } from "./SceneSvg";

type MapCanvasProps = {
  animationTime?: number | null;
};

type ArrowDraft = Point[];

type FreehandDraft = Point[];

type ObjectDrag = {
  objectId: string;
  start: Point;
  last: Point;
};

type ClickPlacement = {
  tool: "marker" | "text" | "region";
  start: Point;
  pointerId: number;
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

function DraftArrow({
  draft,
  lineStyle,
  tint,
}: {
  draft: ArrowDraft;
  lineStyle: LineStyle;
  tint: UnitAffiliation;
}) {
  if (draft.length < 2) return null;
  const dash = lineDashArray(lineStyle, 8);
  const end = draft.at(-1) as Point;
  const angle = finalAngle(draft);
  const headSize = 34;
  const shaft = trimPathEnd(draft, headSize);
  const color = AFFILIATION_COLORS[tint];

  return (
    <g data-line-style={lineStyle}>
      {lineStyle === "double" ? (
        [-1, 1].map((direction) => (
          <path
            d={buildOpenOffsetPath(shaft, direction * 5)}
            fill="none"
            key={direction}
            stroke={color}
            strokeDasharray={dash}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeWidth="3"
          />
        ))
      ) : (
        <path
          d={smoothPathData(shaft)}
          fill="none"
          stroke={color}
          strokeDasharray={dash}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeWidth="8"
        />
      )}
      <image
        data-arrow-head-preview="true"
        height={headSize}
        href={arrowHeadAssetForTint(tint)}
        transform={`translate(${end.x} ${end.y}) rotate(${(angle * 180) / Math.PI + 90})`}
        width={headSize}
        x={-headSize / 2}
        y={0}
      />
    </g>
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
  const clickPlacementRef = useRef<ClickPlacement | null>(null);
  const [arrowDraft, setArrowDraft] = useState<ArrowDraft | null>(null);
  const [freehandDraft, setFreehandDraft] = useState<FreehandDraft>([]);
  const [regionDraft, setRegionDraft] = useState<Point[]>([]);

  const project = useEditorStore((state) => state.project);
  const viewport = useEditorStore((state) => state.viewport);
  const tool = useEditorStore((state) => state.tool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const activeSymbol = useEditorStore((state) => state.activeSymbol);
  const activeAffiliation = useEditorStore(
    (state) => state.activeAffiliation,
  );
  const activeArtwork = useEditorStore((state) => state.activeArtwork);
  const activeArtworkSource = useEditorStore(
    (state) => state.activeArtworkSource,
  );
  const activeLineStyle = useEditorStore((state) => state.activeLineStyle);
  const strokeDamping = useEditorStore((state) => state.strokeDamping);
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

    if (tool === "region" && selectedIds.length === 1) {
      const region = project.objects.find(
        (object) =>
          object.id === selectedIds[0] && object.type === "region",
      );
      if (region?.type === "region") {
        const hit = nearestRegionBoundaryPoint(region, world);
        if (hit.distance <= 12 / Math.max(0.25, viewport.scale)) {
          if (canInsertRegionVertex(region)) {
            const next = insertRegionVertex(region, world);
            updateObject(region.id, { points: next.points });
          }
          return;
        }
      }
    }

    if (tool === "region") {
      const hitRegion = [...project.objects]
        .reverse()
        .find((object) => {
          if (object.type !== "region") return false;
          const layer = project.layers.find(
            (item) => item.id === object.layerId,
          );
          return Boolean(
            layer?.visible &&
              !layer.locked &&
              regionContainsPoint(object, world),
          );
        });
      if (hitRegion) {
        setSelection([hitRegion.id]);
        return;
      }
    }

    if (tool === "marker" || tool === "text" || tool === "region") {
      clickPlacementRef.current = {
        tool,
        start: world,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (tool === "arrow") {
      setArrowDraft([world]);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (tool === "freehand") {
      setFreehandDraft([world]);
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
      const coalesced = event.nativeEvent.getCoalescedEvents?.();
      const samples =
        coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent];
      setArrowDraft((points) =>
        samples.reduce(
          (next, sample) =>
            appendStabilizedPoint(next, toWorld(sample), {
              smoothing: Math.max(0.08, 1 - strokeDamping),
            }),
          points ?? [],
        ),
      );
      return;
    }

    if (freehandDraft.length > 0) {
      const coalesced = event.nativeEvent.getCoalescedEvents?.();
      const samples =
        coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent];
      setFreehandDraft((points) =>
        samples.reduce(
          (next, sample) =>
            appendStabilizedPoint(next, toWorld(sample), {
              smoothing: Math.max(0.08, 1 - strokeDamping),
            }),
          points,
        ),
      );
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

    if (clickPlacementRef.current) {
      const placement = clickPlacementRef.current;
      clickPlacementRef.current = null;
      const end = toWorld(event);
      const moved = Math.hypot(
        end.x - placement.start.x,
        end.y - placement.start.y,
      );
      if (moved > 4) return;

      if (placement.tool === "marker") {
        addObject(
          createMarker(activeLayerId, placement.start, activeSymbol, {
            affiliation: activeAffiliation,
            artwork: activeArtwork,
            artworkSource: activeArtworkSource,
          }),
        );
      } else if (placement.tool === "text") {
        addObject(createText(activeLayerId, placement.start));
      } else {
        setRegionDraft((points) =>
          appendStabilizedPoint(points, placement.start, {
            minDistance: 3,
            smoothing: 0.8,
          }),
        );
      }
      return;
    }

    if (arrowDraft) {
      const end = toWorld(event);
      const points = [...arrowDraft, end];
      if (measurePath(points) > 4) {
        addObject(
          createArrowPath(
            activeLayerId,
            points,
            activeLineStyle,
            activeAffiliation,
          ),
        );
      }
      setArrowDraft(null);
      return;
    }

    if (freehandDraft.length >= 2) {
      const end = toWorld(event);
      addObject(
        createFreehand(
          activeLayerId,
          [...freehandDraft, end],
          activeLineStyle,
        ),
      );
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
      aria-describedby="canvas-keyboard-help"
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
      tabIndex={0}
    >
      <span className="visually-hidden" id="canvas-keyboard-help">
        使用鼠标或手写笔绘制。按 V 选择、H 平移、M 图标、A 箭头、R 区域、T
        文字、P 手绘，Esc 取消当前绘制。
      </span>
      <div
        className="canvas-transform"
        style={{
          width: project.width,
          height: project.height,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <SceneSvg
          interactive={tool === "select"}
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
            <DraftArrow
              draft={arrowDraft}
              lineStyle={activeLineStyle}
              tint={activeAffiliation}
            />
          ) : null}
          {freehandDraft.length > 1 ? (
            <path
              data-line-style={activeLineStyle}
              fill="none"
              d={smoothPathData(freehandDraft)}
              stroke="#315c70"
              strokeDasharray={lineDashArray(activeLineStyle, 4)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ) : null}
          {regionDraft.length > 0 ? (
            <g data-region-preview="true">
              <polyline
                data-line-role="preview-boundary"
                fill="none"
                points={regionDraft
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                stroke={AFFILIATION_COLORS.objective}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>
      </div>
      <div className="canvas-coordinates" aria-live="polite">
        {Math.round(viewport.scale * 100)}%
      </div>
      <div className="canvas-object-count" data-testid="object-count">
        {project.objects.length} 个对象
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
        points: object.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        })),
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
