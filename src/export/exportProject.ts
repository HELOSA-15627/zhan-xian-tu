import type { AtlasProject } from "../model/types";
import { serializeProject } from "../persistence/projectRepository";

export function projectFileName(project: AtlasProject): string {
  const safeTitle = project.title
    .trim()
    .replace(/\s*[\\/:*?"<>|]+\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "");

  return `${safeTitle || "未命名战役"}.atlas.json`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadProject(
  project: AtlasProject,
  filename = projectFileName(project),
): void {
  const content = serializeProject(project);
  downloadBlob(
    new Blob([content], { type: "application/json;charset=utf-8" }),
    filename,
  );
}
