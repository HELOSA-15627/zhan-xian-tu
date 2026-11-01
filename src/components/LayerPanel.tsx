import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { LockSimple } from "@phosphor-icons/react/LockSimple";
import { LockSimpleOpen } from "@phosphor-icons/react/LockSimpleOpen";
import { Plus } from "@phosphor-icons/react/Plus";
import { Trash } from "@phosphor-icons/react/Trash";

import type { SceneObject } from "../model/types";
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

export function LayerPanel() {
  const project = useEditorStore((state) => state.project);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const addLayer = useEditorStore((state) => state.addLayer);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleLayer = useEditorStore((state) => state.toggleLayer);
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const removeObject = useEditorStore((state) => state.removeObject);

  return (
    <section aria-label="图层管理">
      <div className="panel-heading">
        <span>图层与对象</span>
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
        {project.layers.map((layer) => {
          const objects = project.objects.filter(
            (object) => object.layerId === layer.id,
          );

          return (
            <div
              className={`layer-group ${
                activeLayerId === layer.id ? "is-active" : ""
              } ${layer.visible ? "" : "is-hidden"}`}
              data-layer-visible={layer.visible}
              key={layer.id}
            >
              <div className="layer-row">
                <input
                  aria-label={`显示图层 ${layer.name}`}
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  type="checkbox"
                />
                <button
                  className="layer-name"
                  onClick={() => setActiveLayer(layer.id)}
                  type="button"
                >
                  {layer.name}
                  <span>{objects.length}</span>
                  {!layer.visible ? (
                    <span className="layer-hidden-state">已隐藏</span>
                  ) : null}
                </button>
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
                      <button
                        aria-label={`删除对象 ${objectName(object)}`}
                        className="object-delete"
                        onClick={() => removeObject(object.id)}
                        type="button"
                      >
                        <Trash aria-hidden="true" size={13} />
                      </button>
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
