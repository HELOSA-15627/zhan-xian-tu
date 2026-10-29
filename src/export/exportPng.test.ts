import { describe, expect, it } from "vitest";

import { createBlankProject, createText } from "../model/project";
import { buildSceneSvg, renderProjectToPng } from "./exportPng";

describe("png export", () => {
  it("serializes the scene at the native map dimensions", () => {
    const project = createBlankProject();
    project.width = 1280;
    project.height = 720;
    const text = createText(project.layers[0].id, { x: 40, y: 80 }, "导出");
    project.objects = [text];

    const svg = buildSceneSvg(project);

    expect(svg).toContain('width="1280"');
    expect(svg).toContain('height="720"');
    expect(svg).toContain("导出");
    expect(svg).not.toContain("selection-handle");
    expect(svg).not.toContain("selection-chrome");
  });

  it("rejects unsupported export scales", async () => {
    await expect(
      renderProjectToPng(createBlankProject(), 3 as never),
    ).rejects.toThrow("导出倍率必须是 1 或 2");
  });
});
