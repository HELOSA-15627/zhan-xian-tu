import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react/SlidersHorizontal";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";

import { AssetLibrary } from "./components/AssetLibrary";
import { Inspector } from "./components/Inspector";
import { LayerPanel } from "./components/LayerPanel";
import { MapCanvas } from "./components/MapCanvas";
import { Timeline } from "./components/Timeline";
import { ToolRail } from "./components/ToolRail";
import { TopBar } from "./components/TopBar";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { downloadProject } from "./export/exportProject";
import {
  readFileAsDataUrl,
  readImageSize,
  validateImageFile,
} from "./import/backgroundImport";
import { getTimelineDuration } from "./model/animation";
import {
  loadProject as loadSavedProject,
  parseProjectFile,
  saveProject,
} from "./persistence/projectRepository";
import { useEditorStore } from "./store/editorStore";

type LeftTab = "symbols" | "layers";

function fileTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "") || "未命名战役";
}

function App() {
  const project = useEditorStore((state) => state.project);
  const loadProject = useEditorStore((state) => state.loadProject);
  const applyBackground = useEditorStore((state) => state.applyBackground);
  const updateProjectTitle = useEditorStore(
    (state) => state.updateProjectTitle,
  );
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateSelected = useEditorStore(
    (state) => state.duplicateSelected,
  );
  const removeSelected = useEditorStore((state) => state.removeSelected);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("symbols");
  const [saveState, setSaveState] = useState("准备自动保存");
  const [notice, setNotice] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [openPanel, setOpenPanel] = useState<
    "resources" | "inspector" | null
  >(null);

  const duration = getTimelineDuration(project.objects);

  useEffect(() => {
    let active = true;

    loadSavedProject()
      .then((saved) => {
        if (!active) return;
        if (saved) {
          loadProject(saved);
          setSaveState("已恢复本地草稿");
        } else {
          setShowWelcome(true);
          setSaveState("本地草稿");
        }
      })
      .catch(() => {
        if (!active) return;
        setShowWelcome(true);
        setSaveState("无法自动保存");
        setNotice("当前无法读取本地草稿，请导出项目文件备份");
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, [loadProject]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("正在保存…");
    const timer = window.setTimeout(() => {
      saveProject(project)
        .then(() => setSaveState("已自动保存"))
        .catch(() => {
          setSaveState("自动保存失败");
          setNotice("当前无法自动保存，请导出项目文件备份");
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [hydrated, project]);

  useEffect(() => {
    if (!playing || duration <= 0) return;

    const from = animationTime ?? 0;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = from + (now - startedAt) / 1000;
      if (next >= duration) {
        setAnimationTime(duration);
        setPlaying(false);
        return;
      }
      setAnimationTime(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, playing]);

  useEffect(() => {
    if (duration === 0) {
      setAnimationTime(null);
      setPlaying(false);
    }
  }, [duration]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (
        saveState === "正在保存…" ||
        saveState === "自动保存失败" ||
        saveState === "无法自动保存"
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [saveState]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
        return;
      }

      const shortcuts: Record<string, typeof tool> = {
        v: "select",
        h: "pan",
        m: "marker",
        a: "arrow",
        r: "region",
        t: "text",
        p: "freehand",
      };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool) setTool(nextTool);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duplicateSelected, redo, removeSelected, setTool, tool, undo]);

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      validateImageFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      const size = await readImageSize(dataUrl);
      applyBackground(dataUrl, size.width, size.height);
      updateProjectTitle(fileTitle(file.name));
      setShowWelcome(false);
      setNotice("底图已导入");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "底图导入失败");
    }
  };

  const handleProjectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      loadProject(parseProjectFile(text));
      setShowWelcome(false);
      setNotice("项目文件已打开");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "项目文件打开失败");
    }
  };

  const handleExportPng = async () => {
    setNotice("正在生成 PNG…");
    try {
      const { downloadPng } = await import("./export/exportPng");
      await downloadPng(project, 1);
      setNotice("PNG 已导出");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PNG 导出失败");
    }
  };

  const togglePlayback = () => {
    if (duration <= 0) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (animationTime === null || animationTime >= duration) {
      setAnimationTime(0);
    }
    setPlaying(true);
  };

  return (
    <div
      className={`app-shell ${
        openPanel ? `${openPanel}-open` : ""
      }`}
    >
      <a className="skip-link" href="#main-workspace">
        跳到地图画布
      </a>
      <TopBar
        onExportPng={handleExportPng}
        onExportProject={() => downloadProject(project)}
        onImportImage={() => imageInputRef.current?.click()}
        onImportProject={() => projectInputRef.current?.click()}
        saveState={saveState}
      />
      <ToolRail />
      <aside aria-label="资源与图层" className="left-panel">
        <div aria-label="左侧面板" className="panel-tabs" role="tablist">
          <button
            aria-selected={leftTab === "symbols"}
            className="panel-tab"
            onClick={() => setLeftTab("symbols")}
            role="tab"
            type="button"
          >
            图标
          </button>
          <button
            aria-selected={leftTab === "layers"}
            className="panel-tab"
            onClick={() => setLeftTab("layers")}
            role="tab"
            type="button"
          >
            图层
          </button>
        </div>
        {leftTab === "symbols" ? <AssetLibrary /> : <LayerPanel />}
      </aside>
      <main
        aria-label="战术地图编辑器"
        className="workspace"
        id="main-workspace"
      >
        <h1 className="visually-hidden">战线图志战术地图编辑器</h1>
        <div className="mobile-panel-actions">
          <button
            aria-label="打开资源面板"
            className="canvas-action"
            onClick={() =>
              setOpenPanel(openPanel === "resources" ? null : "resources")
            }
            type="button"
          >
            <SquaresFour aria-hidden="true" size={17} />
          </button>
          <button
            aria-label="打开属性面板"
            className="canvas-action"
            onClick={() =>
              setOpenPanel(openPanel === "inspector" ? null : "inspector")
            }
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={17} />
          </button>
        </div>
        <MapCanvas animationTime={animationTime} />
      </main>
      <Inspector />
      <Timeline
        duration={duration}
        onReset={() => {
          setPlaying(false);
          setAnimationTime(0);
        }}
        onTimeChange={(time) => {
          setPlaying(false);
          setAnimationTime(time);
        }}
        onToggle={togglePlayback}
        playing={playing}
        time={animationTime ?? duration}
      />

      <input
        accept="image/png,image/jpeg,image/webp"
        aria-label="选择底图文件"
        className="visually-hidden"
        name="basemap-image"
        onChange={handleImageFile}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept=".json,.atlas.json,application/json"
        aria-label="选择项目文件"
        className="visually-hidden"
        name="atlas-project"
        onChange={handleProjectFile}
        ref={projectInputRef}
        type="file"
      />

      <WelcomeOverlay
        onClose={() => setShowWelcome(false)}
        onImport={() => imageInputRef.current?.click()}
        open={showWelcome}
      />

      {notice ? (
        <div
          aria-live="polite"
          className="toast"
          role="status"
        >
          <span>{notice}</span>
          <button
            aria-label="关闭提示"
            className="toast-close"
            onClick={() => setNotice(null)}
            type="button"
          >
            关闭
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
