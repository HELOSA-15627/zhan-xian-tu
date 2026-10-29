import type { PointerEvent as ReactPointerEvent } from "react";

import {
  arrowDashState,
  getArrowAnimationProgress,
} from "../model/animation";
import type {
  ArrowObject,
  AtlasProject,
  Layer,
  Point,
  SceneObject,
} from "../model/types";
import { TacticalSymbol } from "./TacticalSymbol";

type SceneSvgProps = {
  project: AtlasProject;
  selectedIds: string[];
  time: number | null;
  interactive: boolean;
  onObjectPointerDown?: (
    event: ReactPointerEvent<SVGGElement>,
    objectId: string,
  ) => void;
};

function lineLength(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function arrowHead(arrow: ArrowObject): string {
  const angle = Math.atan2(arrow.end.y - arrow.start.y, arrow.end.x - arrow.start.x);
  const size = Math.max(10, arrow.width * 1.9);

  const pointA = {
    x: arrow.end.x - Math.cos(angle - Math.PI / 7) * size,
    y: arrow.end.y - Math.sin(angle - Math.PI / 7) * size,
  };
  const pointB = {
    x: arrow.end.x - Math.cos(angle + Math.PI / 7) * size,
    y: arrow.end.y - Math.sin(angle + Math.PI / 7) * size,
  };

  return `${arrow.end.x},${arrow.end.y} ${pointA.x},${pointA.y} ${pointB.x},${pointB.y}`;
}

function objectPoints(object: SceneObject): Point[] {
  switch (object.type) {
    case "marker":
      return [
        { x: object.x - object.size / 2, y: object.y - object.size / 2 },
        { x: object.x + object.size / 2, y: object.y + object.size / 2 },
      ];
    case "arrow":
      return [object.start, object.end];
    case "region":
    case "freehand":
      return object.points;
    case "text":
      return [
        { x: object.x, y: object.y - object.fontSize },
        {
          x: object.x + Math.max(80, object.text.length * object.fontSize * 0.8),
          y: object.y + object.fontSize * 0.4,
        },
      ];
  }
}

function selectionBounds(object: SceneObject) {
  const points = objectPoints(object);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX - 8,
    y: minY - 8,
    width: Math.max(24, maxX - minX + 16),
    height: Math.max(24, maxY - minY + 16),
  };
}

function Label({
  text,
  x,
  y,
  dark = false,
}: {
  text: string;
  x: number;
  y: number;
  dark?: boolean;
}) {
  if (!text) return null;

  return (
    <text
      className="scene-label"
      fill={dark ? "#1f2430" : "#f2efe8"}
      fontFamily="'IBM Plex Sans', 'Microsoft YaHei', sans-serif"
      fontSize="13"
      fontWeight="600"
      paintOrder="stroke"
      stroke={dark ? "#d8ccb4" : "#0b0d12"}
      strokeWidth="4"
      textAnchor="middle"
      x={x}
      y={y}
    >
      {text}
    </text>
  );
}

function ObjectNode({
  object,
  time,
}: {
  object: SceneObject;
  time: number | null;
}) {
  switch (object.type) {
    case "marker":
      return (
        <g
          data-object-id={object.id}
          data-object-type="marker"
          opacity={object.opacity}
          transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`}
        >
          <circle
            cx="0"
            cy="0"
            fill={object.color}
            opacity="0.18"
            r={object.size * 0.82}
          />
          <circle
            cx="0"
            cy="0"
            fill="none"
            opacity="0.58"
            r={object.size * 0.58}
            stroke={object.color}
            strokeDasharray="2 4"
            strokeWidth="1"
          />
          <g transform={`translate(${-object.size / 2} ${-object.size / 2})`}>
            <TacticalSymbol
              color={object.color}
              size={object.size}
              symbol={object.symbol}
            />
          </g>
          <Label
            text={object.label}
            x={0}
            y={object.size / 2 + 18}
          />
        </g>
      );
    case "arrow": {
      const length = lineLength(object.start, object.end);
      const progress =
        time === null
          ? 1
          : getArrowAnimationProgress(object.animation, time);
      const animatedDash = arrowDashState(length, progress);
      const dashProps =
        time === null
          ? object.dashed
            ? { strokeDasharray: "14 9" }
            : {}
          : {
              strokeDasharray: animatedDash.dasharray,
              strokeDashoffset: animatedDash.dashoffset,
            };

      return (
        <g
          data-object-id={object.id}
          data-object-type="arrow"
          opacity={object.opacity}
        >
          <line
            {...dashProps}
            stroke={object.color}
            strokeLinecap="round"
            strokeWidth={object.width}
            x1={object.start.x}
            x2={object.end.x}
            y1={object.start.y}
            y2={object.end.y}
          />
          <polygon
            fill={object.color}
            opacity={progress > 0.92 ? 1 : 0}
            points={arrowHead(object)}
          />
          <Label
            text={object.label}
            x={(object.start.x + object.end.x) / 2}
            y={(object.start.y + object.end.y) / 2 - object.width - 8}
          />
        </g>
      );
    }
    case "region":
      return (
        <g data-object-id={object.id} data-object-type="region" opacity={object.opacity}>
          <polygon
            fill={object.fill}
            points={object.points.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
          />
          {object.label ? (
            <Label
              text={object.label}
              x={
                object.points.reduce((total, point) => total + point.x, 0) /
                object.points.length
              }
              y={
                object.points.reduce((total, point) => total + point.y, 0) /
                object.points.length
              }
            />
          ) : null}
        </g>
      );
    case "text":
      return (
        <g
          data-object-id={object.id}
          data-object-type="text"
          opacity={object.opacity}
          transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})`}
        >
          {object.text.split("\n").map((line, index) => (
            <text
              fill={object.color}
              fontFamily="'IBM Plex Sans', 'Microsoft YaHei', sans-serif"
              fontSize={object.fontSize}
              fontWeight="600"
              key={`${line}-${index}`}
              paintOrder="stroke"
              stroke="#d8ccb4"
              strokeWidth="3"
              x="0"
              y={index * object.fontSize * 1.3}
            >
              {line}
            </text>
          ))}
        </g>
      );
    case "freehand":
      return (
        <g
          data-object-id={object.id}
          data-object-type="freehand"
          opacity={object.opacity}
        >
          <polyline
            fill="none"
            points={object.points.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={object.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={object.strokeWidth}
          />
        </g>
      );
  }
}

function Backdrop({ project }: { project: AtlasProject }) {
  const { background } = project;

  return (
    <>
      <rect fill="#d8ccb4" height={project.height} width={project.width} />
      {background.dataUrl ? (
        <image
          height={project.height}
          href={background.dataUrl}
          opacity={background.opacity}
          preserveAspectRatio="xMidYMid slice"
          style={{
            filter: `grayscale(${background.grayscale}%) contrast(${background.contrast}) brightness(${background.brightness})`,
          }}
          width={project.width}
          x="0"
          y="0"
        />
      ) : (
        <g opacity="0.28">
          <rect
            fill="url(#paper-grid)"
            height={project.height}
            width={project.width}
          />
          <path
            d="M-40 640 C220 520 300 590 520 470 S920 390 1160 510 S1450 490 1680 380"
            fill="none"
            stroke="#6d675a"
            strokeWidth="1"
          />
          <path
            d="M-30 700 C250 610 340 670 590 540 S970 470 1210 570 S1490 560 1700 460"
            fill="none"
            stroke="#6d675a"
            strokeWidth="1"
          />
          <path
            d="M-20 770 C280 690 390 740 650 620 S1030 550 1280 640 S1520 650 1710 550"
            fill="none"
            stroke="#6d675a"
            strokeWidth="1"
          />
        </g>
      )}
      <rect
        fill="none"
        height={project.height - 2}
        opacity="0.14"
        stroke="#1f2430"
        width={project.width - 2}
        x="1"
        y="1"
      />
    </>
  );
}

export function SceneSvg({
  project,
  selectedIds,
  time,
  interactive,
  onObjectPointerDown,
}: SceneSvgProps) {
  const selected = new Set(selectedIds);
  const layerById = new Map<string, Layer>(
    project.layers.map((layer) => [layer.id, layer]),
  );

  return (
    <svg
      aria-label="战术地图内容"
      className="scene-svg"
      height={project.height}
      role="img"
      viewBox={`0 0 ${project.width} ${project.height}`}
      width={project.width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          height="48"
          id="paper-grid"
          patternUnits="userSpaceOnUse"
          width="48"
        >
          <path
            d="M48 0H0V48"
            fill="none"
            stroke="#6d675a"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <Backdrop project={project} />
      {project.layers.map((layer) =>
        layer.visible ? (
          <g
            data-layer-id={layer.id}
            key={layer.id}
            opacity={layer.opacity}
          >
            {project.objects
              .filter((object) => object.layerId === layer.id)
              .map((object) => (
                <g
                  key={object.id}
                  onPointerDown={
                    interactive && !layer.locked && onObjectPointerDown
                      ? (event) => onObjectPointerDown(event, object.id)
                      : undefined
                  }
                  style={{
                    cursor:
                      interactive && !layer.locked ? "pointer" : "default",
                  }}
                >
                  <ObjectNode object={object} time={time} />
                  {interactive && selected.has(object.id) ? (
                    <g
                      className="selection-chrome"
                      data-selection="true"
                      pointerEvents="none"
                    >
                      {(() => {
                        const bounds = selectionBounds(object);
                        return (
                          <>
                            <rect
                              className="selection-box"
                              fill="none"
                              height={bounds.height}
                              stroke="#e3318d"
                              strokeDasharray="5 4"
                              strokeWidth="1.5"
                              width={bounds.width}
                              x={bounds.x}
                              y={bounds.y}
                            />
                            {[
                              [bounds.x, bounds.y],
                              [bounds.x + bounds.width, bounds.y],
                              [bounds.x, bounds.y + bounds.height],
                              [
                                bounds.x + bounds.width,
                                bounds.y + bounds.height,
                              ],
                            ].map(([x, y], index) => (
                              <rect
                                className="selection-handle"
                                fill="#f2efe8"
                                height="7"
                                key={index}
                                stroke="#e3318d"
                                strokeWidth="1.5"
                                width="7"
                                x={x - 3.5}
                                y={y - 3.5}
                              />
                            ))}
                          </>
                        );
                      })()}
                    </g>
                  ) : null}
                </g>
              ))}
          </g>
        ) : null,
      )}
    </svg>
  );
}
