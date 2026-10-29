import {
  ArrowClockwise,
  ArrowCounterClockwise,
  DownloadSimple,
  FolderOpen,
  MapTrifold,
} from "@phosphor-icons/react";

import { useEditorStore } from "../store/editorStore";

type TopBarProps = {
  saveState: string;
  onImportImage: () => void;
  onImportProject: () => void;
  onExportProject: () => void;
  onExportPng: () => void;
};

export function TopBar({
  saveState,
  onImportImage,
  onImportProject,
  onExportProject,
  onExportPng,
}: TopBarProps) {
  const project = useEditorStore((state) => state.project);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <MapTrifold aria-hidden="true" size={20} weight="duotone" />
        <div>
          <strong>战线图志</strong>
          <span>{project.title}</span>
        </div>
      </div>
      <div className="topbar-tools">
        <button
          aria-label="打开项目"
          className="icon-button"
          onClick={onImportProject}
          title="打开项目"
          type="button"
        >
          <FolderOpen aria-hidden="true" size={17} />
        </button>
        <button
          aria-label="撤销"
          className="icon-button"
          disabled={!canUndo}
          onClick={undo}
          type="button"
        >
          <ArrowCounterClockwise aria-hidden="true" size={17} />
        </button>
        <button
          aria-label="重做"
          className="icon-button"
          disabled={!canRedo}
          onClick={redo}
          type="button"
        >
          <ArrowClockwise aria-hidden="true" size={17} />
        </button>
      </div>
      <div className="topbar-actions">
        <span className="save-state">{saveState}</span>
        <button
          className="button button-quiet"
          onClick={onImportImage}
          type="button"
        >
          导入底图
        </button>
        <button
          className="button button-quiet"
          onClick={onExportProject}
          type="button"
        >
          项目文件
        </button>
        <button
          className="button button-primary"
          onClick={onExportPng}
          type="button"
        >
          <DownloadSimple aria-hidden="true" size={16} />
          导出 PNG
        </button>
      </div>
    </header>
  );
}
