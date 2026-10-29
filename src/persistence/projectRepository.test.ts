import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createBlankProject, createMarker } from "../model/project";
import {
  clearProject,
  loadProject,
  parseProjectFile,
  saveProject,
  serializeProject,
} from "./projectRepository";

afterEach(async () => {
  await clearProject();
});

describe("project repository", () => {
  it("round-trips a project through IndexedDB", async () => {
    const project = createBlankProject("测试");
    project.objects.push(createMarker(project.layers[0].id, { x: 10, y: 20 }));

    await saveProject(project);

    expect(await loadProject()).toEqual(project);
  });

  it("rejects invalid project JSON", () => {
    expect(() => parseProjectFile('{"hello":"world"}')).toThrow(
      "项目文件格式无效",
    );
  });

  it("serializes and parses a portable project", () => {
    const project = createBlankProject("北境防线");
    const text = serializeProject(project);

    expect(parseProjectFile(text)).toEqual(project);
  });
});
