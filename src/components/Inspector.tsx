import { useState, type ChangeEvent, type ReactNode } from "react";
import { Trash } from "@phosphor-icons/react/Trash";

import type {
  ArrowHeadStyle,
  ArrowObject,
  FlagArtworkId,
  FreehandObject,
  LineStyle,
  MarkerArtworkId,
  MarkerObject,
  RegionObject,
  RegionShapePreset,
  SceneObjectPatch,
  TextObject,
  UnitAffiliation,
  UnitArtworkSource,
} from "../model/types";
import { LINE_STYLE_OPTIONS } from "../model/lineStyle";
import { buildTaperedRibbon } from "../model/strokeGeometry";
import { generateContourPathsFromImage } from "../model/contours";
import { applyRegionShapePreset } from "../model/regionGeometry";
import {
  flipObject,
  objectGeometryPatch,
  rotateObjectAroundCenter,
} from "../model/selectionGeometry";
import {
  CUSTOM_ASSETS,
} from "../model/customAssets";
import {
  DEFAULT_FLAG_ATTACHMENT_SIZE,
  FLAG_ATTACHMENT_POSITIONS,
  FLAG_ASSETS,
  MAX_FLAG_ATTACHMENT_SIZE,
  MIN_FLAG_ATTACHMENT_SIZE,
  defaultFlagArtwork,
} from "../model/flags";
import {
  AFFILIATION_COLORS,
  AFFILIATION_LABELS,
  defaultArtworkForSymbol,
  defaultNatoArtworkForSymbol,
  NATO_ASSETS,
  NATO_TINTS,
  UNIT_ASSETS,
  UNIT_TINTS,
} from "../model/unitAssets";
import { useEditorStore } from "../store/editorStore";

const COMMON_FONT_FAMILIES = [
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
  "KaiTi",
  "FangSong",
  "IBM Plex Sans",
  "Noto Sans SC",
  "Arial",
  "Segoe UI",
  "Times New Roman",
];

type LocalFontData = {
  family: string;
};

type FontAccessWindow = Window & {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      aria-label={label}
      autoComplete="off"
      max={max}
      min={min}
      name={label}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(Number(event.target.value))
      }
      step={step}
      type="number"
      value={value}
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";

  return (
    <div className="field color-field">
      <span>{label}</span>
      <div className="color-field__controls">
        <input
          aria-label={`${label}选择器`}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={pickerValue}
        />
        <input
          aria-label={label}
          autoComplete="off"
          name={label}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          type="text"
          value={value}
        />
      </div>
      <div aria-label={`${label}快捷色`} className="color-swatches" role="group">
        {UNIT_TINTS.map((tint) => (
          <button
            aria-label={`设置${label}为${AFFILIATION_LABELS[tint]}色`}
            className="color-swatch"
            key={tint}
            onClick={() => onChange(AFFILIATION_COLORS[tint])}
            style={{ backgroundColor: AFFILIATION_COLORS[tint] }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function LineStyleSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LineStyle;
  onChange: (value: LineStyle) => void;
}) {
  return (
    <Field label="线型">
      <select
        aria-label={label}
        name={label}
        onChange={(event) => onChange(event.target.value as LineStyle)}
        value={value}
      >
        {LINE_STYLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function SystemFontSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [fonts, setFonts] = useState(COMMON_FONT_FAMILIES);
  const [status, setStatus] = useState("使用内置系统字体列表");

  const loadLocalFonts = async () => {
    const queryLocalFonts = (window as FontAccessWindow).queryLocalFonts;
    if (!queryLocalFonts) {
      setStatus("当前浏览器不支持读取本机字体，可手动填写字体名");
      return;
    }
    try {
      const available = await queryLocalFonts();
      const families = Array.from(
        new Set(available.map((font) => font.family).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "zh-CN"));
      setFonts(
        Array.from(new Set([...COMMON_FONT_FAMILIES, ...families])),
      );
      setStatus(`已读取 ${families.length} 个本机字体`);
    } catch {
      setStatus("读取本机字体被拒绝，可继续使用内置字体");
    }
  };

  return (
    <div className="font-picker">
      <Field label="字体">
        <select
          aria-label="文字字体"
          name="text-font-family"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {!fonts.includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </Field>
      <div className="font-picker__actions">
        <button
          className="button button-quiet"
          onClick={loadLocalFonts}
          type="button"
        >
          读取本机字体
        </button>
        <span>{status}</span>
      </div>
      <Field label="字体名称">
        <input
          aria-label="自定义字体名称"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          placeholder="例如：Source Han Sans SC"
          value={value}
        />
      </Field>
    </div>
  );
}

function StrokePreview({
  color,
  endWidth,
  startWidth,
  testId,
}: {
  color: string;
  endWidth: number;
  startWidth: number;
  testId: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className="stroke-preview"
      data-preview-color={color}
      data-testid={testId}
      viewBox="-10 -34 180 68"
    >
      <path
        d={buildTaperedRibbon(
          [
            { x: 4, y: 0 },
            { x: 156, y: 0 },
          ],
          startWidth,
          endWidth,
        )}
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

function markerFields(
  object: MarkerObject,
  customAssets: Array<{
    id: MarkerArtworkId;
    name: string;
  }>,
  update: (patch: SceneObjectPatch) => void,
) {
  const availableAffiliation =
    object.artworkSource === "nato" ? NATO_TINTS : UNIT_TINTS;
  const availableArtwork =
    object.artworkSource === "flag"
      ? FLAG_ASSETS.map((flag) => ({
          id: flag.id,
          label: flag.chineseName,
          shortLabel: flag.englishName,
        }))
      : object.artworkSource === "custom"
        ? [
            ...CUSTOM_ASSETS,
            ...customAssets.map((asset) => ({
              id: asset.id,
              label: asset.name,
              shortLabel: "自定义",
            })),
          ]
        : object.artworkSource === "nato"
          ? NATO_ASSETS
          : UNIT_ASSETS.filter((asset) => asset.kind === "unit");

  return (
    <>
      <Field label="素材组">
        <select
          aria-label="兵牌素材组"
          name="marker-artwork-source"
          onChange={(event) => {
            const artworkSource = event.target.value as UnitArtworkSource;
            if (artworkSource === "nato") {
              const affiliation =
                object.affiliation === "hostile" ? "hostile" : "friendly";
              update({
                artworkSource,
                affiliation,
                artwork: defaultNatoArtworkForSymbol(object.symbol),
                color: AFFILIATION_COLORS[affiliation],
              });
              return;
            }

            if (artworkSource === "flag") {
              const artwork = defaultFlagArtwork();
              update({
                artworkSource,
                affiliation: "friendly",
                artwork,
                color: AFFILIATION_COLORS.friendly,
              });
              return;
            }

            if (artworkSource === "custom") {
              update({
                artworkSource,
                affiliation: "hostile",
                artwork: "custom-nest",
                color: AFFILIATION_COLORS.hostile,
                symbol: "nest",
              });
              return;
            }

            update({
              artworkSource,
              artwork: defaultArtworkForSymbol(
                object.symbol,
                object.affiliation,
              ),
            });
          }}
          value={object.artworkSource}
        >
          <option value="psd">PSD 原画</option>
          <option value="nato">NATO 兵牌</option>
          <option value="flag">国旗</option>
          <option value="custom">原图</option>
        </select>
      </Field>
      {object.artworkSource !== "flag" &&
      object.artworkSource !== "custom" ? (
        <Field label="阵营">
          <select
            aria-label="兵牌阵营"
            name="marker-affiliation"
            onChange={(event) => {
              const affiliation = event.target.value as UnitAffiliation;
              update({
                affiliation,
                color: AFFILIATION_COLORS[affiliation],
              });
            }}
            value={object.affiliation}
          >
            {availableAffiliation.map((affiliation) => (
              <option key={affiliation} value={affiliation}>
                {AFFILIATION_LABELS[affiliation]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="兵牌素材">
        <select
          aria-label="兵牌素材"
          name="unit-artwork"
          onChange={(event) =>
            update(
              object.artworkSource === "flag"
                ? {
                    artwork: event.target.value as MarkerArtworkId,
                  }
                : {
                    artwork: event.target.value as MarkerArtworkId,
                  },
            )
          }
          value={object.artwork}
        >
          {availableArtwork.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.shortLabel} {asset.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="地图批注">
        <input
          aria-label="图标批注"
          autoComplete="off"
          name="marker-label"
          onChange={(event) => update({ label: event.target.value })}
          placeholder="例如：第 16 大队"
          value={object.label}
        />
      </Field>
      {object.artworkSource !== "flag" &&
      object.artworkSource !== "custom" ? (
        <ColorField
          label="图标颜色"
          onChange={(color) => update({ color })}
          value={object.color}
        />
      ) : null}
      <Field label="尺寸">
        <NumberInput
          label="图标尺寸"
          max={180}
          min={24}
          onChange={(size) => update({ size })}
          value={object.size}
        />
      </Field>
      <Field label="兵牌不透明度">
        <input
          aria-label="兵牌不透明度"
          name="marker-opacity"
          max="1"
          min="0"
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          step="0.05"
          type="range"
          value={object.opacity}
        />
        <output
          aria-label="兵牌不透明度值"
          className="field-value"
        >
          {Math.round(object.opacity * 100)}%
        </output>
      </Field>
      {object.artworkSource === "psd" ||
      object.artworkSource === "nato" ? (
        <>
          <label className="check-field">
            <input
              aria-label="启用兵牌描边"
              checked={object.strokeEnabled}
              name="marker-stroke-enabled"
              onChange={(event) =>
                update({ strokeEnabled: event.target.checked })
              }
              type="checkbox"
            />
            启用兵牌描边
          </label>
          <Field label="描边宽度">
            <NumberInput
              label="兵牌描边宽度"
              max={16}
              min={0}
              onChange={(strokeWidth) => update({ strokeWidth })}
              step={0.5}
              value={object.strokeWidth}
            />
          </Field>
        </>
      ) : null}
      <Field label="旋转角度">
        <NumberInput
          label="图标旋转角度"
          max={360}
          min={-360}
          onChange={(rotation) => update({ rotation })}
          value={object.rotation}
        />
      </Field>
      <Field label="挂靠国旗">
        <select
          aria-label="挂靠国旗"
          name="marker-attached-flag"
          onChange={(event) => {
            const artwork = event.target.value;
            update({
              flagAttachment: artwork
                ? {
                    artwork: artwork as FlagArtworkId,
                    position: object.flagAttachment?.position ?? "top",
                    size:
                      object.flagAttachment?.size ??
                      DEFAULT_FLAG_ATTACHMENT_SIZE,
                  }
                : null,
            });
          }}
          value={object.flagAttachment?.artwork ?? ""}
        >
          <option value="">无</option>
          {FLAG_ASSETS.map((flag) => (
            <option key={flag.id} value={flag.id}>
              {flag.chineseName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="国旗挂靠位置">
        <select
          aria-label="国旗挂靠位置"
          disabled={!object.flagAttachment}
          name="marker-flag-position"
          onChange={(event) => {
            if (!object.flagAttachment) return;
            update({
              flagAttachment: {
                ...object.flagAttachment,
                position: event.target.value as
                  | "top"
                  | "right"
                  | "bottom"
                  | "left"
                  | "center",
              },
            });
          }}
          value={object.flagAttachment?.position ?? "top"}
        >
          {FLAG_ATTACHMENT_POSITIONS.map((position) => (
            <option key={position.value} value={position.value}>
              {position.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="挂靠国旗大小">
        <NumberInput
          label="挂靠国旗大小"
          max={MAX_FLAG_ATTACHMENT_SIZE}
          min={MIN_FLAG_ATTACHMENT_SIZE}
          onChange={(size) => {
            if (!object.flagAttachment) return;
            update({
              flagAttachment: {
                ...object.flagAttachment,
                size,
              },
            });
          }}
          value={object.flagAttachment?.size ?? DEFAULT_FLAG_ATTACHMENT_SIZE}
        />
      </Field>
    </>
  );
}

function arrowFields(
  object: ArrowObject,
  update: (patch: SceneObjectPatch) => void,
) {
  return (
    <>
      <Field label="批注">
        <input
          aria-label="箭头批注"
          autoComplete="off"
          name="arrow-label"
          onChange={(event) => update({ label: event.target.value })}
          value={object.label}
        />
      </Field>
      <ColorField
        label="箭头颜色"
        onChange={(color) => update({ color })}
        value={object.color}
      />
      <Field label="线宽">
        <NumberInput
          label="箭头线宽"
          max={64}
          min={0}
          onChange={(width) =>
            update({ width, startWidth: width, endWidth: width })
          }
          value={object.width}
        />
      </Field>
      <Field label="线起点大小">
        <NumberInput
          label="线起点大小"
          max={64}
          min={0}
          onChange={(startWidth) => update({ startWidth })}
          value={object.startWidth}
        />
      </Field>
      <Field label="线终点大小">
        <NumberInput
          label="线终点大小"
          max={64}
          min={0}
          onChange={(endWidth) => update({ endWidth })}
          value={object.endWidth}
        />
      </Field>
      <Field label="箭头大小">
        <NumberInput
          label="箭头大小"
          max={160}
          min={0}
          onChange={(headSize) => update({ headSize })}
          value={object.headSize}
        />
      </Field>
      <Field label="箭头样式">
        <select
          aria-label="箭头样式"
          name="arrow-head-style"
          onChange={(event) =>
            update({ headStyle: event.target.value as ArrowHeadStyle })
          }
          value={object.headStyle}
        >
          <option value="psd">PSD 箭头</option>
          <option value="triangle">三角箭头</option>
          <option value="chevron">燕尾箭头</option>
          <option value="spear">枪尖箭头</option>
        </select>
      </Field>
      <StrokePreview
        color={object.color}
        endWidth={object.endWidth}
        startWidth={object.startWidth}
        testId="arrow-stroke-preview"
      />
      <LineStyleSelect
        label="箭头线型"
        onChange={(lineStyle) => update({ lineStyle })}
        value={object.lineStyle}
      />
      {["dashed", "dotted", "phase", "dashdot"].includes(
        object.lineStyle,
      ) ? (
        <Field label="虚线密度">
          <input
            aria-label="箭头虚线段数"
            max="80"
            min="4"
            name="arrow-line-dash-count"
            onChange={(event) =>
              update({ lineDashCount: Number(event.target.value) })
            }
            step="1"
            type="range"
            value={object.lineDashCount}
          />
        </Field>
      ) : null}
      <Field label="箭头分色">
        <select
          aria-label="箭头分色"
          name="arrow-tint"
          onChange={(event) => {
            const tint = event.target.value as UnitAffiliation;
            update({ tint, color: AFFILIATION_COLORS[tint] });
          }}
          value={object.tint}
        >
          {UNIT_TINTS.map((tint) => (
            <option key={tint} value={tint}>
              {AFFILIATION_LABELS[tint]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="不透明度">
        <input
          aria-label="箭头不透明度"
          name="arrow-opacity"
          max="1"
          min="0"
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          step="0.05"
          type="range"
          value={object.opacity}
        />
      </Field>
      <label className="check-field">
        <input
          aria-label="启用箭头绘制动画"
          name="arrow-animation-enabled"
          checked={object.animation.enabled}
          onChange={(event) =>
            update({
              animation: {
                ...object.animation,
                enabled: event.target.checked,
              },
            })
          }
          type="checkbox"
        />
        启用绘制动画
      </label>
      {object.animation.enabled ? (
        <>
          <Field label="开始延迟（秒）">
            <NumberInput
              label="动画延迟"
              max={60}
              min={0}
              onChange={(delay) =>
                update({ animation: { ...object.animation, delay } })
              }
              step={0.1}
              value={object.animation.delay}
            />
          </Field>
          <Field label="持续时间（秒）">
            <NumberInput
              label="动画持续时间"
              max={60}
              min={0.1}
              onChange={(duration) =>
                update({ animation: { ...object.animation, duration } })
              }
              step={0.1}
              value={object.animation.duration}
            />
          </Field>
        </>
      ) : null}
    </>
  );
}

function regionFields(
  object: RegionObject,
  update: (patch: SceneObjectPatch) => void,
) {
  return (
    <>
      <Field label="区域批注">
        <input
          aria-label="区域批注"
          autoComplete="off"
          name="region-label"
          onChange={(event) => update({ label: event.target.value })}
          value={object.label}
        />
      </Field>
      <ColorField
        label="区域颜色"
        onChange={(color) => update({ fill: color, stroke: color })}
        value={object.stroke}
      />
      <Field label="区域形状">
        <select
          aria-label="区域形状预设"
          disabled={object.geometryLocked}
          name="region-shape-preset"
          onChange={(event) => {
            const shapePreset = event.target.value as RegionShapePreset;
            const next = applyRegionShapePreset(object, shapePreset);
            update({
              points: next.points,
              closed: next.closed,
              shapePreset,
            });
          }}
          value={object.shapePreset}
        >
          <option value="custom">自定义多边形</option>
          <option value="rectangle">矩形</option>
          <option value="ellipse">椭圆</option>
          <option value="diamond">菱形</option>
        </select>
      </Field>
      <Field label="区域线型">
        <select
          aria-label="区域线型"
          name="region-line-style"
          onChange={(event) =>
            update({
              lineStyle: event.target.value as "solid" | "dashed" | "dotted",
            })
          }
          value={object.lineStyle}
        >
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </Field>
      {object.lineStyle !== "solid" ? (
        <Field label="区域段数">
          <input
            aria-label="区域段数"
            max="80"
            min="4"
            name="region-line-dash-count"
            onChange={(event) =>
              update({ lineDashCount: Number(event.target.value) })
            }
            step="1"
            type="range"
            value={object.lineDashCount}
          />
        </Field>
      ) : null}
      <Field label="边框宽度">
        <NumberInput
          label="区域边框宽度"
          max={30}
          min={0}
          onChange={(strokeWidth) => update({ strokeWidth })}
          value={object.strokeWidth}
        />
      </Field>
      <label className="check-field">
        <input
          aria-label="完整闭合区域"
          name="region-closed"
          checked={object.closed}
          onChange={(event) =>
            update({
              closed: event.target.checked,
              geometryLocked: event.target.checked
                ? object.geometryLocked
                : false,
            })
          }
          type="checkbox"
        />
        完整闭合区域
      </label>
      <label className="check-field">
        <input
          aria-label="闭锁区域形状"
          disabled={!object.closed}
          name="region-geometry-locked"
          checked={object.geometryLocked}
          onChange={(event) =>
            update({ geometryLocked: event.target.checked })
          }
          type="checkbox"
        />
        闭锁区域形状（仍可整体拖动）
      </label>
      <Field label="区域填充不透明度">
        <input
          aria-label="区域填充不透明度"
          name="region-opacity"
          max="1"
          min="0"
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          step="0.05"
          type="range"
          value={object.opacity}
        />
      </Field>
    </>
  );
}

function textFields(
  object: TextObject,
  update: (patch: SceneObjectPatch) => void,
) {
  return (
    <>
      <Field label="批注内容">
        <textarea
          aria-label="文字批注"
          name="text-content"
          onChange={(event) => update({ text: event.target.value })}
          rows={4}
          value={object.text}
        />
      </Field>
      <ColorField
        label="文字颜色"
        onChange={(color) => update({ color })}
        value={object.color}
      />
      <Field label="字号">
        <NumberInput
          label="文字字号"
          max={120}
          min={8}
          onChange={(fontSize) => update({ fontSize })}
          value={object.fontSize}
        />
      </Field>
      <SystemFontSelect
        onChange={(fontFamily) => update({ fontFamily })}
        value={object.fontFamily}
      />
      <label className="check-field">
        <input
          aria-label="启用批注描边"
          checked={object.strokeEnabled}
          name="text-stroke-enabled"
          onChange={(event) =>
            update({ strokeEnabled: event.target.checked })
          }
          type="checkbox"
        />
        启用批注描边
      </label>
      <Field label="旋转角度">
        <NumberInput
          label="文字旋转角度"
          max={360}
          min={-360}
          onChange={(rotation) => update({ rotation })}
          value={object.rotation}
        />
      </Field>
    </>
  );
}

function freehandFields(
  object: FreehandObject,
  update: (patch: SceneObjectPatch) => void,
) {
  return (
    <>
      <ColorField
        label="手绘颜色"
        onChange={(color) => update({ color })}
        value={object.color}
      />
      <Field label="线宽">
        <NumberInput
          label="手绘线宽"
          max={64}
          min={0}
          onChange={(strokeWidth) =>
            update({
              strokeWidth,
              startWidth: strokeWidth,
              endWidth: strokeWidth,
            })
          }
          value={object.strokeWidth}
        />
      </Field>
      <Field label="手绘起点大小">
        <NumberInput
          label="手绘起点大小"
          max={64}
          min={0}
          onChange={(startWidth) => update({ startWidth })}
          value={object.startWidth}
        />
      </Field>
      <Field label="手绘终点大小">
        <NumberInput
          label="手绘终点大小"
          max={64}
          min={0}
          onChange={(endWidth) => update({ endWidth })}
          value={object.endWidth}
        />
      </Field>
      <StrokePreview
        color={object.color}
        endWidth={object.endWidth}
        startWidth={object.startWidth}
        testId="freehand-stroke-preview"
      />
      <LineStyleSelect
        label="手绘线型"
        onChange={(lineStyle) => update({ lineStyle })}
        value={object.lineStyle}
      />
      {["dashed", "dotted", "phase", "dashdot"].includes(
        object.lineStyle,
      ) ? (
        <Field label="虚线密度">
          <input
            aria-label="手绘虚线段数"
            max="80"
            min="4"
            name="freehand-line-dash-count"
            onChange={(event) =>
              update({ lineDashCount: Number(event.target.value) })
            }
            step="1"
            type="range"
            value={object.lineDashCount}
          />
        </Field>
      ) : null}
      <Field label="不透明度">
        <input
          aria-label="手绘不透明度"
          name="freehand-opacity"
          max="1"
          min="0"
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          step="0.05"
          type="range"
          value={object.opacity}
        />
      </Field>
    </>
  );
}

export function Inspector() {
  const project = useEditorStore((state) => state.project);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateObject = useEditorStore((state) => state.updateObject);
  const updateProjectTitle = useEditorStore((state) => state.updateProjectTitle);
  const updateBackground = useEditorStore((state) => state.updateBackground);
  const removeSelected = useEditorStore((state) => state.removeSelected);
  const strokeDamping = useEditorStore((state) => state.strokeDamping);
  const setStrokeDamping = useEditorStore((state) => state.setStrokeDamping);
  const [contourStatus, setContourStatus] = useState<string | null>(null);
  const object = project.objects.find(
    (item) => item.id === selectedIds[0],
  ) as SceneObjectPatch | undefined;

  const generateContours = async () => {
    if (!project.background.dataUrl) {
      setContourStatus("请先导入底图");
      return;
    }
    setContourStatus("正在采样并生成…");
    try {
      const result = await generateContourPathsFromImage(
        project.background.dataUrl,
        project.background.contourLevels,
        {
          x: 0,
          y: 0,
          width: project.width,
          height: project.height,
        },
        {
          excludeBlue: project.background.excludeBlue,
        },
      );
      updateBackground({
        contourPaths: [],
        contourImage: result.rasterImage,
        contourEnabled: true,
      });
      setContourStatus(
        `已缓存栅格等高线（采样 ${result.sampleWidth}×${result.sampleHeight}）`,
      );
    } catch (error) {
      setContourStatus(
        error instanceof Error ? error.message : "等高线生成失败",
      );
    }
  };

  if (!object) {
    return (
      <aside aria-label="属性检查器" className="inspector">
        <div className="panel-heading">
          <span>项目与底图</span>
          <span className="coordinate">
            {project.width} × {project.height}
          </span>
        </div>
        <p className="panel-copy">
          正在编辑：
          {project.maps.find((map) => map.id === project.activeMapId)?.name ??
            "项目画布"}
        </p>
        <Field label="项目名称">
          <input
            aria-label="项目名称"
            autoComplete="off"
            name="map-title"
            onChange={(event) => updateProjectTitle(event.target.value)}
            value={project.title}
          />
        </Field>
        <Field label="底图不透明度">
          <input
            aria-label="底图不透明度"
            name="background-opacity"
            max="1"
            min="0"
            onChange={(event) =>
              updateBackground({ opacity: Number(event.target.value) })
            }
            step="0.05"
            type="range"
            value={project.background.opacity}
          />
        </Field>
        <Field label="灰度">
          <input
            aria-label="底图灰度"
            name="background-grayscale"
            max="100"
            min="0"
            onChange={(event) =>
              updateBackground({ grayscale: Number(event.target.value) })
            }
            type="range"
            value={project.background.grayscale}
          />
        </Field>
        <Field label="对比度">
          <input
            aria-label="底图对比度"
            name="background-contrast"
            max="2"
            min="0.4"
            onChange={(event) =>
              updateBackground({ contrast: Number(event.target.value) })
            }
            step="0.05"
            type="range"
            value={project.background.contrast}
          />
        </Field>
        <Field label="亮度">
          <input
            aria-label="底图亮度"
            name="background-brightness"
            max="2"
            min="0.4"
            onChange={(event) =>
              updateBackground({ brightness: Number(event.target.value) })
            }
            step="0.05"
            type="range"
            value={project.background.brightness}
          />
        </Field>
        <Field label="底图虚化">
          <input
            aria-label="底图虚化"
            max="24"
            min="0"
            name="background-blur"
            onChange={(event) =>
              updateBackground({ blur: Number(event.target.value) })
            }
            step="0.5"
            type="range"
            value={project.background.blur}
          />
        </Field>
        <Field label="底图噪点">
          <input
            aria-label="底图噪点"
            max="1"
            min="0"
            name="background-noise"
            onChange={(event) =>
              updateBackground({ noise: Number(event.target.value) })
            }
            step="0.02"
            type="range"
            value={project.background.noise}
          />
        </Field>
        <div className="inspector-section">
          <div className="panel-heading panel-heading--compact">
            <span>自动等高线</span>
          </div>
          <label className="check-field">
            <input
              aria-label="显示自动等高线"
              checked={project.background.contourEnabled}
              name="background-contour-enabled"
              onChange={(event) =>
                updateBackground({
                  contourEnabled: event.target.checked,
                })
              }
              type="checkbox"
            />
            显示亮度等值线
          </label>
          <label className="check-field">
            <input
              aria-label="排除蓝色水系"
              checked={project.background.excludeBlue}
              name="background-contour-exclude-blue"
              onChange={(event) =>
                updateBackground({
                  excludeBlue: event.target.checked,
                })
              }
              type="checkbox"
            />
            排除蓝色河流与水体
          </label>
          <Field label="等高线层数">
            <input
              aria-label="等高线层数"
              max="24"
              min="3"
              name="background-contour-levels"
              onChange={(event) =>
                updateBackground({
                  contourLevels: Number(event.target.value),
                })
              }
              step="1"
              type="range"
              value={project.background.contourLevels}
            />
          </Field>
          <Field label="等高线透明度">
            <input
              aria-label="等高线透明度"
              max="1"
              min="0.05"
              name="background-contour-opacity"
              onChange={(event) =>
                updateBackground({
                  contourOpacity: Number(event.target.value),
                })
              }
              step="0.05"
              type="range"
              value={project.background.contourOpacity}
            />
          </Field>
          <div className="contour-actions">
            <button
              className="button button-quiet"
              onClick={generateContours}
              type="button"
            >
              生成或更新等高线
            </button>
            <span>
              {contourStatus ??
                (project.background.contourImage ||
                project.background.contourPaths.length > 0
                  ? "已缓存等高线图层"
                  : "首次使用需手动生成")}
            </span>
          </div>
        </div>
        <div className="inspector-section">
          <div className="panel-heading panel-heading--compact">
            <span>绘制设置</span>
          </div>
          <Field label="绘制防抖强度">
            <input
              aria-label="绘制防抖强度"
              max="1"
              min="0"
              name="stroke-damping"
              onChange={(event) =>
                setStrokeDamping(Number(event.target.value))
              }
              step="0.05"
              type="range"
              value={strokeDamping}
            />
          </Field>
          <p className="field-help">
            数值越高，线条越稳定；0 为原始输入跟随。
          </p>
        </div>
      </aside>
    );
  }

  const selected = project.objects.find((item) => item.id === selectedIds[0]);
  if (!selected) return null;
  const update = (patch: SceneObjectPatch) => updateObject(selected.id, patch);

  return (
    <aside aria-label="属性检查器" className="inspector">
      <div className="panel-heading">
        <span>
          {selected.type === "marker"
            ? "图标属性"
            : selected.type === "arrow"
              ? "箭头属性"
              : selected.type === "region"
                ? "区域属性"
                : selected.type === "text"
                  ? "文字属性"
                  : "手绘属性"}
        </span>
        <span className="coordinate">{selected.type}</span>
      </div>
      <div
        aria-label="对象变换"
        className="transform-actions"
        role="group"
      >
        <button
          aria-label="向左旋转 90 度"
          className="button button-quiet"
          onClick={() =>
            update(
              objectGeometryPatch(
                rotateObjectAroundCenter(selected, -Math.PI / 2),
              ),
            )
          }
          type="button"
        >
          左转 90°
        </button>
        <button
          aria-label="向右旋转 90 度"
          className="button button-quiet"
          onClick={() =>
            update(
              objectGeometryPatch(
                rotateObjectAroundCenter(selected, Math.PI / 2),
              ),
            )
          }
          type="button"
        >
          右转 90°
        </button>
        <button
          aria-label="水平翻转所选"
          className="button button-quiet"
          onClick={() =>
            update(
              objectGeometryPatch(flipObject(selected, "horizontal")),
            )
          }
          type="button"
        >
          水平翻转
        </button>
        <button
          aria-label="垂直翻转所选"
          className="button button-quiet"
          onClick={() =>
            update(
              objectGeometryPatch(flipObject(selected, "vertical")),
            )
          }
          type="button"
        >
          垂直翻转
        </button>
      </div>
      {selected.type === "marker"
        ? markerFields(
            selected,
            project.customAssets.map((asset) => ({
              id: asset.id,
              name: asset.name,
            })),
            update,
          )
        : null}
      {selected.type === "arrow" ? arrowFields(selected, update) : null}
      {selected.type === "region" ? regionFields(selected, update) : null}
      {selected.type === "text" ? textFields(selected, update) : null}
      {selected.type === "freehand" ? freehandFields(selected, update) : null}
      <button
        className="button danger-button inspector-delete"
        onClick={removeSelected}
        type="button"
      >
        <Trash aria-hidden="true" size={16} />
        删除所选
      </button>
    </aside>
  );

}
