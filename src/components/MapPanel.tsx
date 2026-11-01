import { useEffect, useState } from "react";

import { useEditorStore } from "../store/editorStore";

export function MapPanel() {
  const project = useEditorStore((state) => state.project);
  const selectMap = useEditorStore((state) => state.selectMap);
  const renameMap = useEditorStore((state) => state.renameMap);
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
        <span>已导入地图</span>
        <span className="count-pill">{project.maps.length} 张</span>
      </div>
      {project.maps.length === 0 ? (
        <p className="panel-copy">
          从顶栏导入底图后，可在这里查看、选取和编辑。
        </p>
      ) : (
        <div className="map-list">
          {project.maps.map((map) => (
            <button
              aria-label={`选取地图 ${map.name}`}
              aria-pressed={map.id === project.activeMapId}
              className={`map-list-item ${
                map.id === project.activeMapId ? "is-active" : ""
              }`}
              key={map.id}
              onClick={() => selectMap(map.id)}
              type="button"
            >
              <img
                alt=""
                className="map-list-thumbnail"
                src={map.dataUrl}
              />
              <span className="map-list-copy">
                <strong>{map.name}</strong>
                <small>
                  {map.width} × {map.height}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      {activeMap ? (
        <div className="map-editor">
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
