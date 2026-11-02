import { useEffect, useState } from "react";

import { ArrowDown } from "@phosphor-icons/react/ArrowDown";
import { ArrowUp } from "@phosphor-icons/react/ArrowUp";
import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";

import { useEditorStore } from "../store/editorStore";

export function MapPanel() {
  const project = useEditorStore((state) => state.project);
  const selectMap = useEditorStore((state) => state.selectMap);
  const renameMap = useEditorStore((state) => state.renameMap);
  const toggleMapVisibility = useEditorStore(
    (state) => state.toggleMapVisibility,
  );
  const moveMap = useEditorStore((state) => state.moveMap);
  const updateBackground = useEditorStore(
    (state) => state.updateBackground,
  );
  const activeMap = project.maps.find(
    (map) => map.id === project.activeMapId,
  );
  const [nameDraft, setNameDraft] = useState(activeMap?.name ?? "");

  useEffect(() => {
    setNameDraft(activeMap?.name ?? "");
  }, [activeMap?.id, activeMap?.name]);

  return (
    <section aria-label="已导入地图">
      <div className="panel-heading">
        <span>底图叠加栈</span>
        <span className="count-pill">
          {project.maps.filter((map) => map.visible !== false).length}/
          {project.maps.length} 显示
        </span>
      </div>
      {project.maps.length === 0 ? (
        <p className="panel-copy">
          从顶栏导入底图后，可在这里查看、选取和编辑。
        </p>
      ) : (
        <div className="map-list">
          {[...project.maps].reverse().map((map) => {
            const visible = map.visible !== false;
            return (
              <div
                className={`map-stack-row ${
                  map.id === project.activeMapId ? "is-active" : ""
                } ${visible ? "" : "is-hidden"}`}
                data-map-visible={visible}
                key={map.id}
              >
                <button
                  aria-label={`选取地图 ${map.name}`}
                  aria-pressed={map.id === project.activeMapId}
                  className="map-list-item"
                  onClick={() => selectMap(map.id)}
                  type="button"
                >
                  <img
                    alt=""
                    className="map-list-thumbnail"
                    height={44}
                    loading="lazy"
                    src={map.dataUrl}
                    width={74}
                  />
                  <span className="map-list-copy">
                    <strong>
                      {map.name}
                      {map.id === project.activeMapId ? (
                        <em className="map-active-badge">编辑中</em>
                      ) : null}
                    </strong>
                    <small>
                      {map.width} × {map.height}
                    </small>
                  </span>
                </button>
                <div className="map-stack-actions">
                  <button
                    aria-label={`${
                      visible ? "隐藏" : "显示"
                    }底图 ${map.name}`}
                    className="icon-button"
                    onClick={() => toggleMapVisibility(map.id)}
                    type="button"
                  >
                    {visible ? (
                      <Eye aria-hidden="true" size={14} />
                    ) : (
                      <EyeSlash aria-hidden="true" size={14} />
                    )}
                  </button>
                  <button
                    aria-label={`下移底图 ${map.name}`}
                    className="icon-button"
                    onClick={() => moveMap(map.id, -1)}
                    type="button"
                  >
                    <ArrowDown aria-hidden="true" size={13} />
                  </button>
                  <button
                    aria-label={`上移底图 ${map.name}`}
                    className="icon-button"
                    onClick={() => moveMap(map.id, 1)}
                    type="button"
                  >
                    <ArrowUp aria-hidden="true" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeMap ? (
        <div className="map-editor">
          <div className="map-editor-heading">
            <strong>当前编辑底图</strong>
            <span>{activeMap.name}</span>
          </div>
          <label className="field">
            <span>地图名称</span>
            <input
              aria-label="地图名称"
              autoComplete="off"
              onBlur={() => renameMap(activeMap.id, nameDraft)}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              value={nameDraft}
            />
          </label>
          <label className="field">
            <span>不透明度</span>
            <input
              aria-label="地图不透明度"
              max="1"
              min="0"
              onChange={(event) =>
                updateBackground({
                  opacity: Number(event.target.value),
                })
              }
              step="0.05"
              type="range"
              value={activeMap.opacity}
            />
          </label>
          <label className="field">
            <span>灰度</span>
            <input
              aria-label="地图灰度"
              max="100"
              min="0"
              onChange={(event) =>
                updateBackground({
                  grayscale: Number(event.target.value),
                })
              }
              type="range"
              value={activeMap.grayscale}
            />
          </label>
          <label className="field">
            <span>对比度</span>
            <input
              aria-label="地图对比度"
              max="2"
              min="0.4"
              onChange={(event) =>
                updateBackground({
                  contrast: Number(event.target.value),
                })
              }
              step="0.05"
              type="range"
              value={activeMap.contrast}
            />
          </label>
          <label className="field">
            <span>亮度</span>
            <input
              aria-label="地图亮度"
              max="2"
              min="0.4"
              onChange={(event) =>
                updateBackground({
                  brightness: Number(event.target.value),
                })
              }
              step="0.05"
              type="range"
              value={activeMap.brightness}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
