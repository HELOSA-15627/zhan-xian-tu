import type { ChangeEvent, ReactNode } from "react";

import type {
  ArrowObject,
  FreehandObject,
  MarkerObject,
  RegionObject,
  SceneObjectPatch,
  TacticalSymbol,
  TextObject,
} from "../model/types";
import { useEditorStore } from "../store/editorStore";

const symbolOptions: Array<{ value: TacticalSymbol; label: string }> = [
  { value: "friendly", label: "友军" },
  { value: "hostile", label: "敌军" },
  { value: "headquarters", label: "指挥部" },
  { value: "defense", label: "防线" },
  { value: "nest", label: "巢穴" },
  { value: "objective", label: "目标" },
  { value: "armor", label: "装甲" },
  { value: "aviation", label: "航空" },
];

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
      max={max}
      min={min}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(Number(event.target.value))
      }
      step={step}
      type="number"
      value={value}
    />
  );
}

function markerFields(
  object: MarkerObject,
  update: (patch: SceneObjectPatch) => void,
) {
  return (
    <>
      <Field label="图标类型">
        <select
          aria-label="图标类型"
          onChange={(event) =>
            update({ symbol: event.target.value as TacticalSymbol })
          }
          value={object.symbol}
        >
          {symbolOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="地图批注">
        <input
          aria-label="图标批注"
          onChange={(event) => update({ label: event.target.value })}
          placeholder="例如：第 16 大队"
          value={object.label}
        />
      </Field>
      <Field label="颜色">
        <input
          aria-label="图标颜色"
          onChange={(event) => update({ color: event.target.value })}
          type="text"
          value={object.color}
        />
      </Field>
      <Field label="尺寸">
        <NumberInput
          label="图标尺寸"
          max={120}
          min={12}
          onChange={(size) => update({ size })}
          value={object.size}
        />
      </Field>
      <Field label="旋转角度">
        <NumberInput
          label="图标旋转角度"
          max={360}
          min={-360}
          onChange={(rotation) => update({ rotation })}
          value={object.rotation}
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
          onChange={(event) => update({ label: event.target.value })}
          value={object.label}
        />
      </Field>
      <Field label="颜色">
        <input
          aria-label="箭头颜色"
          onChange={(event) => update({ color: event.target.value })}
          type="text"
          value={object.color}
        />
      </Field>
      <Field label="线宽">
        <NumberInput
          label="箭头线宽"
          max={40}
          min={1}
          onChange={(width) => update({ width })}
          value={object.width}
        />
      </Field>
      <Field label="不透明度">
        <input
          aria-label="箭头不透明度"
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
          aria-label="使用虚线"
          checked={object.dashed}
          onChange={(event) => update({ dashed: event.target.checked })}
          type="checkbox"
        />
        使用虚线
      </label>
      <label className="check-field">
        <input
          aria-label="启用箭头绘制动画"
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
          onChange={(event) => update({ label: event.target.value })}
          value={object.label}
        />
      </Field>
      <Field label="填充颜色">
        <input
          aria-label="区域填充颜色"
          onChange={(event) => update({ fill: event.target.value })}
          type="text"
          value={object.fill}
        />
      </Field>
      <Field label="边框颜色">
        <input
          aria-label="区域边框颜色"
          onChange={(event) => update({ stroke: event.target.value })}
          type="text"
          value={object.stroke}
        />
      </Field>
      <Field label="边框宽度">
        <NumberInput
          label="区域边框宽度"
          max={30}
          min={0}
          onChange={(strokeWidth) => update({ strokeWidth })}
          value={object.strokeWidth}
        />
      </Field>
      <Field label="不透明度">
        <input
          aria-label="区域不透明度"
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
          onChange={(event) => update({ text: event.target.value })}
          rows={4}
          value={object.text}
        />
      </Field>
      <Field label="颜色">
        <input
          aria-label="文字颜色"
          onChange={(event) => update({ color: event.target.value })}
          type="text"
          value={object.color}
        />
      </Field>
      <Field label="字号">
        <NumberInput
          label="文字字号"
          max={120}
          min={8}
          onChange={(fontSize) => update({ fontSize })}
          value={object.fontSize}
        />
      </Field>
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
      <Field label="颜色">
        <input
          aria-label="手绘颜色"
          onChange={(event) => update({ color: event.target.value })}
          type="text"
          value={object.color}
        />
      </Field>
      <Field label="线宽">
        <NumberInput
          label="手绘线宽"
          max={40}
          min={1}
          onChange={(strokeWidth) => update({ strokeWidth })}
          value={object.strokeWidth}
        />
      </Field>
      <Field label="不透明度">
        <input
          aria-label="手绘不透明度"
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
  const object = project.objects.find(
    (item) => item.id === selectedIds[0],
  ) as SceneObjectPatch | undefined;

  if (!object) {
    return (
      <aside aria-label="属性检查器" className="inspector">
        <div className="panel-heading">
          <span>项目与底图</span>
          <span className="coordinate">
            {project.width} × {project.height}
          </span>
        </div>
        <Field label="地图名称">
          <input
            aria-label="地图名称"
            onChange={(event) => updateProjectTitle(event.target.value)}
            value={project.title}
          />
        </Field>
        <Field label="底图不透明度">
          <input
            aria-label="底图不透明度"
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
      {selected.type === "marker"
        ? markerFields(selected, update)
        : null}
      {selected.type === "arrow" ? arrowFields(selected, update) : null}
      {selected.type === "region" ? regionFields(selected, update) : null}
      {selected.type === "text" ? textFields(selected, update) : null}
      {selected.type === "freehand" ? freehandFields(selected, update) : null}
    </aside>
  );
}
