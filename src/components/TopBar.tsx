import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { CopySimple } from "@phosphor-icons/react/CopySimple";
import { DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { FolderOpen } from "@phosphor-icons/react/FolderOpen";
import { MapTrifold } from "@phosphor-icons/react/MapTrifold";
import { Trash } from "@phosphor-icons/react/Trash";

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
  const hasSelection = useEditorStore((state) => state.selectedIds.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateSelected = useEditorStore(
    (state) => state.duplicateSelected,
  );
  const removeSelected = useEditorStore((state) => state.removeSelected);

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <MapTrifold aria-hidden="true" size={20} weight="duotone" />
        <div>
          <strong>战线图志</strong>
          <span>{project.title}</span>
          <small>LOCAL CAMPAIGN MAP</small>
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
        <button
          aria-label="复制所选"
          className="icon-button"
          disabled={!hasSelection}
          onClick={duplicateSelected}
          type="button"
        >
          <CopySimple aria-hidden="true" size={16} />
        </button>
        <button
          aria-label="删除所选"
          className="icon-button"
          disabled={!hasSelection}
          onClick={removeSelected}
          type="button"
        >
          <Trash aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="topbar-actions">
        <span aria-live="polite" className="save-state" role="status">
          {saveState}
        </span>
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
