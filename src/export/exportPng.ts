import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SceneSvg } from "../components/SceneSvg";
import type { AtlasProject } from "../model/types";
import { downloadBlob } from "./exportProject";

type ExportScale = 1 | 2;

export function buildSceneSvg(project: AtlasProject): string {
  const markup = renderToStaticMarkup(
    createElement(SceneSvg, {
      project,
      selectedIds: [],
      time: null,
      interactive: false,
    }),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>${markup}`;
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("地图图像渲染失败"));
    };
    image.src = url;
  });
}

export async function renderProjectToPng(
  project: AtlasProject,
  scale: ExportScale,
): Promise<Blob> {
  if (scale !== 1 && scale !== 2) {
    throw new Error("导出倍率必须是 1 或 2");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const image = await loadSvgImage(buildSceneSvg(project));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(project.width * scale));
  canvas.height = Math.max(1, Math.round(project.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持 PNG 导出");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("PNG 编码失败");
  return blob;
}

export async function downloadPng(
  project: AtlasProject,
  scale: ExportScale = 1,
): Promise<void> {
  const blob = await renderProjectToPng(project, scale);
  const baseName =
    project.title
      .trim()
      .replace(/\s*[\\/:*?"<>|]+\s*/g, "-")
      .replace(/\s+/g, " ") || "未命名战役";
  downloadBlob(blob, `${baseName}${scale === 2 ? "@2x" : ""}.png`);
}
