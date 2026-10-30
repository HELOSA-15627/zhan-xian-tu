import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { ImageSquare } from "@phosphor-icons/react/ImageSquare";
import { X } from "@phosphor-icons/react/X";
import { useEffect } from "react";

type WelcomeOverlayProps = {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
};

export function WelcomeOverlay({
  open,
  onClose,
  onImport,
}: WelcomeOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="welcome-backdrop">
      <section
        aria-describedby="welcome-description"
        aria-labelledby="welcome-title"
        aria-modal="true"
        className="welcome-dialog"
        role="dialog"
      >
        <button
          aria-label="关闭欢迎窗口"
          className="icon-button welcome-close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
        <div className="welcome-rule" aria-hidden="true" />
        <p className="welcome-kicker">本地战术地图工作台</p>
        <h1 id="welcome-title">从一张底图开始整理战线</h1>
        <p className="welcome-copy" id="welcome-description">
          导入自己的地图，放置战役图标、推进箭头和批注。所有项目保存在当前浏览器中，并随时可以导出 PNG。
        </p>
        <div className="welcome-actions">
          <button
            className="button button-primary welcome-primary"
            onClick={onImport}
            type="button"
          >
            <ImageSquare aria-hidden="true" size={17} />
            导入底图
          </button>
          <button
            className="button button-quiet"
            onClick={onClose}
            type="button"
          >
            直接开始绘制
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
        <div aria-hidden="true" className="welcome-legend">
          <span className="legend-friendly">
            <i />
            FRIENDLY LINE
          </span>
          <span className="legend-hostile">
            <i />
            BETA ROUTE
          </span>
          <span className="legend-warning">
            <i />
            DEFENCE AXIS
          </span>
        </div>
        <p className="welcome-note">
          支持 PNG、JPG 和 WebP。底图只在本地处理。
        </p>
      </section>
    </div>
  );
}
