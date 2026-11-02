import { useEffect, useState } from "react";

import { ArrowDown } from "@phosphor-icons/react/ArrowDown";
import { ArrowUp } from "@phosphor-icons/react/ArrowUp";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretUp } from "@phosphor-icons/react/CaretUp";
import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { FloppyDisk } from "@phosphor-icons/react/FloppyDisk";
import { FolderSimple } from "@phosphor-icons/react/FolderSimple";
import { LockSimple } from "@phosphor-icons/react/LockSimple";
import { LockSimpleOpen } from "@phosphor-icons/react/LockSimpleOpen";
import { Plus } from "@phosphor-icons/react/Plus";
import { Trash } from "@phosphor-icons/react/Trash";
import { TreeStructure } from "@phosphor-icons/react/TreeStructure";

import type { Layer, SceneObject } from "../model/types";
import {
  effectiveLayerVisible,
  flattenLayerRows,
} from "../model/layerTree";
import { useEditorStore } from "../store/editorStore";

function objectName(object: SceneObject): string {
  switch (object.type) {
    case "marker":
      return object.label || object.name;
    case "arrow":
      return object.label || object.name;
    case "region":
      return object.label || object.name;
    case "text":
      return object.text || object.name;
    case "freehand":
      return object.label || object.name;
  }
}

function LayerNameField({
  active,
  layer,
  onActivate,
  onRename,
}: {
  active: boolean;
  layer: Layer;
  onActivate: () => void;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState(layer.name);

  useEffect(() => {
    setDraft(layer.name);
  }, [layer.id, layer.name]);

  return (
    <input
      aria-label={`图层名称 ${layer.name}`}
      className={`layer-name-input ${active ? "is-active" : ""}`}
      onBlur={() => onRename(draft)}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      value={draft}
    />
  );
}

export function LayerPanel() {
  const project = useEditorStore((state) => state.project);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const addLayer = useEditorStore((state) => state.addLayer);
  const createGroupFromActiveLayer = useEditorStore(
    (state) => state.createGroupFromActiveLayer,
  );
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setSelection = useEditorStore((state) => state.setSelection);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const setLayerOpacity = useEditorStore((state) => state.setLayerOpacity);
  const moveLayer = useEditorStore((state) => state.moveLayer);
  const toggleLayer = useEditorStore((state) => state.toggleLayer);
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const toggleLayerExpanded = useEditorStore(
    (state) => state.toggleLayerExpanded,
  );
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const removeObject = useEditorStore((state) => state.removeObject);
  const moveObjectInLayer = useEditorStore(
    (state) => state.moveObjectInLayer,
  );
  const moveObjectToLayer = useEditorStore(
    (state) => state.moveObjectToLayer,
  );
  const saveLayerAsGraphic = useEditorStore(
    (state) => state.saveLayerAsGraphic,
  );

  return (
    <section aria-label="图层管理">
      <div className="panel-heading">
        <span>图层与对象</span>
        <button
          aria-label="编组当前图层"
          className="icon-button"
          onClick={() => createGroupFromActiveLayer()}
          type="button"
        >
          <FolderSimple aria-hidden="true" size={16} />
        </button>
        <button
          aria-label="新建子图层"
          className="icon-button"
          onClick={() => addLayer(undefined, activeLayerId)}
          type="button"
        >
          <TreeStructure aria-hidden="true" size={16} />
        </button>
        <button
          aria-label="新建图层"
          className="icon-button"
          onClick={() => addLayer()}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="layer-list">
        {flattenLayerRows(project.layers).map(({ layer, depth }) => {
          const objects = project.objects.filter(
            (object) => object.layerId === layer.id,
          ).reverse();
          const hasChildren = project.layers.some(
            (candidate) => candidate.parentId === layer.id,
          );
          const visible = effectiveLayerVisible(project.layers, layer.id);

          return (
            <div
              className={`layer-group ${
                activeLayerId === layer.id ? "is-active" : ""
              } ${visible ? "" : "is-hidden"}`}
              data-layer-depth={depth}
              data-layer-kind={layer.kind}
              data-layer-visible={layer.visible}
              key={layer.id}
            >
              <div
                className="layer-row"
                style={{ paddingLeft: `${depth * 16}px` }}
              >
                {layer.kind === "group" || hasChildren ? (
                  <button
                    aria-label={`${layer.expanded ? "折叠" : "展开"}图层组 ${
                      layer.name
                    }`}
                    className="icon-button layer-expand-button"
                    onClick={() => toggleLayerExpanded(layer.id)}
                    type="button"
                  >
                    {layer.expanded ? (
                      <CaretDown aria-hidden="true" size={13} />
                    ) : (
                      <CaretUp aria-hidden="true" size={13} />
                    )}
                  </button>
                ) : null}
                {layer.kind === "group" ? (
                  <FolderSimple
                    aria-hidden="true"
                    className="layer-kind-icon"
                    size={15}
                  />
                ) : null}
                <input
                  aria-label={`显示图层 ${layer.name}`}
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  type="checkbox"
                />
                <div className="layer-name">
                  <LayerNameField
                    active={activeLayerId === layer.id}
                    layer={layer}
                    onActivate={() => setActiveLayer(layer.id)}
                    onRename={(name) => renameLayer(layer.id, name)}
                  />
                  <span>{objects.length}</span>
                  {!visible ? (
                    <span className="layer-hidden-state">
                      {layer.visible ? "上级隐藏" : "已隐藏"}
                    </span>
                  ) : null}
                </div>
                <button
                  aria-label={`${layer.visible ? "隐藏" : "显示"}图层 ${
                    layer.name
                  }`}
                  className="icon-button"
                  onClick={() => toggleLayer(layer.id)}
                  title={layer.visible ? "隐藏此图层" : "显示此图层"}
                  type="button"
                >
                  {layer.visible ? (
                    <Eye aria-hidden="true" size={15} />
                  ) : (
                    <EyeSlash aria-hidden="true" size={15} />
                  )}
                </button>
                <button
                  aria-label={`${layer.locked ? "解锁" : "锁定"}图层 ${
                    layer.name
                  }`}
                  className="icon-button"
                  onClick={() => toggleLayerLock(layer.id)}
                  type="button"
                >
                  {layer.locked ? (
                    <LockSimple aria-hidden="true" size={15} />
                  ) : (
                    <LockSimpleOpen aria-hidden="true" size={15} />
                  )}
                </button>
                <button
                  aria-label={`删除图层 ${layer.name}`}
                  className="icon-button"
                  disabled={project.layers.length <= 1}
                  onClick={() => deleteLayer(layer.id)}
                  type="button"
                >
                  <Trash aria-hidden="true" size={15} />
                </button>
              </div>
              <div className="layer-actions">
                <label className="layer-opacity">
                  <span>不透明度</span>
                  <input
                    aria-label={`图层不透明度 ${layer.name}`}
                    max="1"
                    min="0"
                    onChange={(event) =>
                      setLayerOpacity(
                        layer.id,
                        Number(event.target.value),
                      )
                    }
                    step="0.05"
                    type="range"
                    value={layer.opacity}
                  />
                </label>
                <button
                  aria-label={`保存图层 ${layer.name} 为图形素材`}
                  className="icon-button"
                  onClick={() => saveLayerAsGraphic(layer.id, layer.name)}
                  title="保存为图形素材"
                  type="button"
                >
                  <FloppyDisk aria-hidden="true" size={14} />
                </button>
                <button
                  aria-label={`后移图层 ${layer.name}`}
                  className="icon-button"
                  onClick={() => moveLayer(layer.id, -1)}
                  title="后移图层"
                  type="button"
                >
                  <ArrowDown aria-hidden="true" size={14} />
                </button>
                <button
                  aria-label={`前移图层 ${layer.name}`}
                  className="icon-button"
                  onClick={() => moveLayer(layer.id, 1)}
                  title="前移图层"
                  type="button"
                >
                  <ArrowUp aria-hidden="true" size={14} />
                </button>
              </div>
              <div className="object-list">
                {objects.length === 0 ? (
                  <span className="muted-line">此图层还没有标注</span>
                ) : (
                  objects.map((object) => (
                    <div className="object-row-wrap" key={object.id}>
                      <button
                        className={`object-row ${
                          selectedIds.includes(object.id) ? "is-selected" : ""
                        }`}
                        onClick={() => setSelection([object.id])}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={`object-type type-${object.type}`}
                        />
                        <span>{objectName(object)}</span>
                      </button>
                      <div className="object-row-actions">
                        <button
                          aria-label={`后移对象 ${objectName(object)}`}
                          className="object-delete"
                          onClick={() =>
                            moveObjectInLayer(object.id, -1)
                          }
                          title="后移对象"
                          type="button"
                        >
                          <ArrowDown aria-hidden="true" size={13} />
                        </button>
                        <button
                          aria-label={`前移对象 ${objectName(object)}`}
                          className="object-delete"
                          onClick={() =>
                            moveObjectInLayer(object.id, 1)
                          }
                          title="前移对象"
                          type="button"
                        >
                          <ArrowUp aria-hidden="true" size={13} />
                        </button>
                        <button
                          aria-label={`删除对象 ${objectName(object)}`}
                          className="object-delete"
                          onClick={() => removeObject(object.id)}
                          type="button"
                        >
                          <Trash aria-hidden="true" size={13} />
                        </button>
                      </div>
                      <label className="object-layer-select">
                        <span>所在图层</span>
                        <select
                          aria-label={`移动对象 ${objectName(object)} 到图层`}
                          onChange={(event) =>
                            moveObjectToLayer(
                              object.id,
                              event.target.value,
                            )
                          }
                          value={object.layerId}
                        >
                          {project.layers
                            .filter(
                              (targetLayer) =>
                                targetLayer.kind !== "group",
                            )
                            .map((targetLayer) => (
                            <option
                              key={targetLayer.id}
                              value={targetLayer.id}
                            >
                              {targetLayer.name}
                            </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
