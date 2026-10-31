import {
  useId,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { getArrowAnimationProgress } from "../model/animation";
import { flagArtworkAssetFor } from "../model/flags";
import { lineDashArray, normalizeLineStyle } from "../model/lineStyle";
import { buildTickMarks } from "../model/linePattern";
import {
  polylinePathData,
  smoothPathData,
  trimPathEnd,
} from "../model/path";
import {
  buildOpenOffsetPath,
  buildTaperedRibbon,
  clipPathToProgress,
  pathFrameAtProgress,
  sampleSmoothPath,
} from "../model/strokeGeometry";
import { buildRegionDashArray } from "../model/regionGeometry";
import {
  selectionBounds,
  selectionHandlePoints,
  type SelectionHandle,
} from "../model/selectionGeometry";
import type {
  ArrowObject,
  ArrowHeadStyle,
  AtlasProject,
  FlagAttachment,
  Layer,
  Point,
  SceneObject,
} from "../model/types";
import { arrowHeadAssetForTint } from "../model/unitAssets";
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
  onResizePointerDown?: (
    event: ReactPointerEvent<SVGRectElement>,
    objectId: string,
    handle: SelectionHandle,
  ) => void;
};

function arrowPoints(arrow: ArrowObject): Point[] {
  return arrow.points?.length >= 2
    ? arrow.points
    : [arrow.start, arrow.end];
}

function pointMetadata(point: Point): string {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return `${round(point.x)},${round(point.y)}`;
}

function attachedFlagGeometry(attachment: FlagAttachment, markerSize: number) {
  const width = attachment.size;
  const height = width * (60 / 109);
  const gap = 4;
  const halfMarker = markerSize / 2;

  switch (attachment.position) {
    case "top":
      return { x: 0, y: -halfMarker - height / 2 - gap, width, height };
    case "right":
      return { x: halfMarker + width / 2 + gap, y: 0, width, height };
    case "bottom":
      return { x: 0, y: halfMarker + height / 2 + gap, width, height };
    case "left":
      return { x: -halfMarker - width / 2 - gap, y: 0, width, height };
    case "center":
      return { x: 0, y: 0, width, height };
  }
}

function AttachedFlag({
  attachment,
  markerSize,
}: {
  attachment: FlagAttachment;
  markerSize: number;
}) {
  const { x, y, width, height } = attachedFlagGeometry(
    attachment,
    markerSize,
  );

  return (
    <g
      data-attached-flag="true"
      data-flag-position={attachment.position}
      data-flag-size={attachment.size}
      transform={`translate(${x} ${y})`}
    >
      <image
        height={height}
        href={flagArtworkAssetFor(attachment.artwork)}
        preserveAspectRatio="xMidYMid meet"
        width={width}
        x={-width / 2}
        y={-height / 2}
      />
    </g>
  );
}

function arrowHeadPath(style: ArrowHeadStyle, size: number): string {
  switch (style) {
    case "triangle":
      return `M 0 0 L ${-size * 0.55} ${size} L ${size * 0.55} ${size} Z`;
    case "chevron":
      return `M 0 0 L ${-size * 0.58} ${size * 0.68} L ${-size * 0.24} ${size * 0.8} L 0 ${size * 0.55} L ${size * 0.24} ${size * 0.8} L ${size * 0.58} ${size * 0.68} Z`;
    case "spear":
      return `M 0 0 L ${-size * 0.46} ${size * 0.72} L ${-size * 0.12} ${size * 0.6} L ${-size * 0.12} ${size} L ${size * 0.12} ${size} L ${size * 0.12} ${size * 0.6} L ${size * 0.46} ${size * 0.72} Z`;
    case "psd":
      return "";
  }
}

function arrowHeadConnectionLength(
  style: ArrowHeadStyle,
  size: number,
): number {
  if (style === "chevron") return size * 0.56;
  if (style === "psd") return size;
  return size;
}

function Label({
  text,
  x,
  y,
  dark = true,
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
      fontSize="11.5"
      fontWeight="600"
      paintOrder="stroke"
      stroke={dark ? "#d8ccb4" : "#0b0d12"}
      strokeWidth="3.2"
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
  const arrowHeadId = useId().replace(/:/g, "");
  const arrowHeadFilterId = `arrow-head-color-${arrowHeadId}`;
  const arrowHeadClipId = `arrow-head-clip-${arrowHeadId}`;

  switch (object.type) {
    case "marker": {
      const scaleX = object.scaleX ?? 1;
      const scaleY = object.scaleY ?? 1;
      const scaleTransform =
        scaleX === 1 && scaleY === 1
          ? ""
          : ` scale(${scaleX} ${scaleY})`;
      return (
        <g
          data-marker-style="atlas"
          data-object-id={object.id}
          data-object-type="marker"
          opacity={object.opacity}
          transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})${scaleTransform}`}
        >
          <g transform={`translate(${-object.size / 2} ${-object.size / 2})`}>
            <TacticalSymbol
              affiliation={object.affiliation}
              artwork={object.artwork}
              artworkSource={object.artworkSource}
              color={object.color}
              size={object.size}
              symbol={object.symbol}
            />
          </g>
          {object.flagAttachment ? (
            <AttachedFlag
              attachment={object.flagAttachment}
              markerSize={object.size}
            />
          ) : null}
          <Label
            text={object.label}
            x={0}
            y={object.size / 2 + 16}
          />
        </g>
      );
    }
    case "arrow": {
      const points = arrowPoints(object);
      const style = normalizeLineStyle(object.lineStyle);
      const pathMode =
        object.pathMode === "sharp" ? "sharp" : "smooth";
      const progress =
        time === null
          ? 1
          : getArrowAnimationProgress(object.animation, time);
      const headSize = object.headSize;
      const effectiveEndWidth =
        object.startWidth +
        (object.endWidth - object.startWidth) * progress;
      const controlWidth = Math.max(
        object.width,
        (object.startWidth + effectiveEndWidth) / 2,
      );
      const headConnectionLength = arrowHeadConnectionLength(
        object.headStyle,
        headSize,
      );
      const headFrame = pathFrameAtProgress(
        points,
        progress,
        16,
        pathMode,
      );
      const visiblePath = clipPathToProgress(
        points,
        progress,
        16,
        pathMode,
      );
      const shaft = trimPathEnd(visiblePath, headConnectionLength);
      const shaftPath =
        pathMode === "sharp"
          ? polylinePathData(shaft)
          : smoothPathData(shaft);
      const lineEnd = shaft.at(-1) ?? headFrame.point;
      const headBasePoint = lineEnd;
      const headAngle = (headFrame.angle * 180) / Math.PI + 90;
      const shaftClipPath =
        object.headStyle === "psd"
          ? `url(#${arrowHeadClipId})`
          : undefined;
      const hasVisibleShaft = shaft.length >= 2;
      const labelPoint =
        points[Math.min(points.length - 1, Math.floor(points.length / 2))] ??
        object.end;
      const dash = lineDashArray(
        style,
        (object.startWidth + effectiveEndWidth) / 2,
      );
      const dashProps = dash ? { strokeDasharray: dash } : {};

      return (
        <g
          data-line-style={style}
          data-object-id={object.id}
          data-object-type="arrow"
          data-path-mode={pathMode}
          data-path-points={points.length}
          opacity={object.opacity}
        >
          {object.headStyle === "psd" ? (
            <defs>
              <clipPath
                clipPathUnits="userSpaceOnUse"
                data-arrow-head-clip="psd"
                id={arrowHeadClipId}
              >
                <rect
                  height="200000"
                  transform={`translate(${headFrame.point.x} ${headFrame.point.y}) rotate(${headAngle})`}
                  width="200000"
                  x="-100000"
                  y={headSize - 0.25}
                />
              </clipPath>
            </defs>
          ) : null}
          <g
            clipPath={shaftClipPath}
            data-arrow-shaft-clip={
              object.headStyle === "psd" ? "psd" : undefined
            }
          >
            {style === "double" ? (
              <>
                {[-1, 1].map((direction) => {
                  const rail = buildOpenOffsetPath(
                    shaft,
                    direction * Math.max(3, controlWidth * 0.5),
                    pathMode,
                  );
                  return (
                    <path
                      {...dashProps}
                      data-line-end={pointMetadata(lineEnd)}
                      data-line-role="rail"
                      d={rail}
                      fill="none"
                      key={direction}
                      stroke={object.color}
                      strokeLinecap="butt"
                      strokeLinejoin="miter"
                      strokeWidth={Math.max(
                        1.5,
                        controlWidth * 0.19,
                      )}
                    />
                  );
                })}
              </>
            ) : hasVisibleShaft &&
              style === "solid" &&
              object.startWidth !== effectiveEndWidth ? (
              <path
                data-line-end={pointMetadata(lineEnd)}
                data-line-role="shaft"
                data-width-shape="tapered"
                d={buildTaperedRibbon(
                  shaft,
                  object.startWidth,
                  effectiveEndWidth,
                )}
                fill={object.color}
                stroke="none"
              />
            ) : hasVisibleShaft ? (
              <path
                {...dashProps}
                data-line-end={pointMetadata(lineEnd)}
                data-line-role="shaft"
                data-width-shape="uniform"
                d={shaftPath}
                fill="none"
                stroke={object.color}
                strokeLinecap={style === "dotted" ? "round" : "butt"}
                strokeLinejoin="miter"
                strokeWidth={Math.max(
                  1,
                  (object.startWidth + effectiveEndWidth) / 2,
                )}
              />
            ) : null}
            {style === "ticked" && hasVisibleShaft ? (
              <path
                data-line-role="tick"
                d={buildTickMarks(
                  shaft,
                  Math.max(14, controlWidth * 2.4),
                  Math.max(8, controlWidth * 1.8),
                )}
                fill="none"
                stroke={object.color}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeWidth={Math.max(1.5, controlWidth * 0.32)}
              />
            ) : null}
          </g>
          <g
            data-arrow-head="true"
            data-arrow-head-point={pointMetadata(headFrame.point)}
            data-head-base-point={pointMetadata(headBasePoint)}
            data-head-origin="base"
            data-head-size={headSize}
            data-head-style={object.headStyle}
            opacity="1"
            transform={`translate(${headFrame.point.x} ${headFrame.point.y}) rotate(${headAngle})`}
          >
            {object.headStyle === "psd" ? (
              <>
                <defs>
                  <filter
                    data-arrow-head-filter="line-color"
                    id={arrowHeadFilterId}
                  >
                    <feFlood floodColor={object.color} />
                    <feComposite
                      in2="SourceAlpha"
                      operator="in"
                    />
                  </filter>
                </defs>
                <rect
                  data-arrow-head-connector="psd"
                  fill={object.color}
                  height={
                    headConnectionLength +
                    Math.max(2, controlWidth * 0.5) -
                    headSize * 0.86
                  }
                  width={Math.max(1, controlWidth)}
                  x={-Math.max(1, controlWidth) / 2}
                  y={headSize * 0.86}
                />
                <image
                  data-arrow-head-image="psd"
                  filter={`url(#${arrowHeadFilterId})`}
                  height={headSize}
                  href={arrowHeadAssetForTint(object.tint)}
                  preserveAspectRatio="xMidYMid meet"
                  width={headSize}
                  x={-headSize / 2}
                  y={0}
                />
              </>
            ) : (
              <path
                data-arrow-head-fill="true"
                d={arrowHeadPath(object.headStyle, headSize)}
                fill={object.color}
                stroke="none"
              />
            )}
          </g>
          <Label
            text={object.label}
            x={labelPoint.x}
            y={labelPoint.y - object.width - 8}
          />
        </g>
      );
    }
    case "region":
      return (
        <g
          data-object-id={object.id}
          data-object-type="region"
          data-region-shape={object.shapePreset}
        >
          {object.closed ? (
            <polygon
              data-line-role="hit"
              fill="transparent"
              points={object.points
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              pointerEvents="all"
            />
          ) : (
            <polyline
              data-line-role="hit"
              fill="none"
              points={object.points
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              pointerEvents="stroke"
              stroke="transparent"
              strokeWidth={Math.max(12, object.strokeWidth + 8)}
            />
          )}
          {object.closed ? (
            <polygon
              data-line-role="boundary"
              data-region-closed="true"
              data-region-line-style={object.lineStyle}
              fill={object.stroke}
              fillOpacity={object.opacity}
              points={object.points.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke={object.stroke}
              strokeDasharray={buildRegionDashArray(object)}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth={object.strokeWidth}
            />
          ) : (
            <polyline
              data-line-role="boundary"
              data-region-closed="false"
              data-region-line-style={object.lineStyle}
              fill="none"
              points={object.points.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke={object.stroke}
              strokeDasharray={buildRegionDashArray(object)}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth={object.strokeWidth}
            />
          )}
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
    case "text": {
      const scaleX = object.scaleX ?? 1;
      const scaleY = object.scaleY ?? 1;
      const scaleTransform =
        scaleX === 1 && scaleY === 1
          ? ""
          : ` scale(${scaleX} ${scaleY})`;
      return (
        <g
          data-object-id={object.id}
          data-object-type="text"
          opacity={object.opacity}
          transform={`translate(${object.x} ${object.y}) rotate(${object.rotation})${scaleTransform}`}
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
    }
    case "freehand":
      {
        const style = normalizeLineStyle(object.lineStyle);
        const averageWidth = (object.startWidth + object.endWidth) / 2;
        const controlWidth = Math.max(object.strokeWidth, averageWidth);
        const dash = lineDashArray(style, averageWidth);
        const path = smoothPathData(object.points);
        const sampledPath = sampleSmoothPath(object.points);
      return (
        <g
          data-line-style={style}
          data-object-id={object.id}
          data-object-type="freehand"
          opacity={object.opacity}
        >
          {style === "double" ? (
            <>
              {[-1, 1].map((direction) => (
                <path
                  data-line-role="rail"
                  d={buildOpenOffsetPath(
                    object.points,
                    direction * Math.max(3, controlWidth * 0.8),
                  )}
                  fill="none"
                  key={direction}
                  stroke={object.color}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeWidth={Math.max(1.5, controlWidth * 0.35)}
                />
              ))}
            </>
          ) : style === "solid" &&
            object.startWidth !== object.endWidth ? (
            <path
              data-line-role="band"
              data-width-shape="tapered"
              d={buildTaperedRibbon(
                object.points,
                object.startWidth,
                object.endWidth,
              )}
              fill={object.color}
              stroke="none"
            />
          ) : (
            <path
              data-line-role="band"
              data-width-shape="uniform"
              d={path}
              fill="none"
              stroke={object.color}
              strokeDasharray={dash}
              strokeLinecap={style === "dotted" ? "round" : "butt"}
              strokeLinejoin="miter"
              strokeWidth={Math.max(1, averageWidth)}
            />
          )}
          {style === "ticked" ? (
            <path
              data-line-role="tick"
              d={buildTickMarks(
                sampledPath,
                Math.max(12, controlWidth * 2.2),
                Math.max(7, controlWidth * 1.6),
              )}
              fill="none"
              stroke={object.color}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth={Math.max(1.5, controlWidth * 0.28)}
            />
          ) : null}
        </g>
      );
      }
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
  onResizePointerDown,
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
                              pointerEvents="none"
                              width={bounds.width}
                              x={bounds.x}
                              y={bounds.y}
                            />
                            {selectionHandlePoints(bounds).map(
                              ({ handle, x, y }) => (
                                <rect
                                  className="selection-handle"
                                  data-resize-handle={handle}
                                  fill="#f2efe8"
                                  height="7"
                                  key={handle}
                                  onPointerDown={(event) => {
                                    if (
                                      !interactive ||
                                      layer.locked ||
                                      !onResizePointerDown
                                    ) {
                                      return;
                                    }
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onResizePointerDown(
                                      event,
                                      object.id,
                                      handle,
                                    );
                                  }}
                                  pointerEvents={
                                    interactive && !layer.locked
                                      ? "all"
                                      : "none"
                                  }
                                  stroke="#e3318d"
                                  strokeWidth="1.5"
                                  style={{
                                    cursor:
                                      handle === "nw" || handle === "se"
                                        ? "nwse-resize"
                                        : "nesw-resize",
                                  }}
                                  width="7"
                                  x={x - 3.5}
                                  y={y - 3.5}
                                />
                              ),
                            )}
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
