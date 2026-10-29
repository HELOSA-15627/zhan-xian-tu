import { describe, expect, it } from "vitest";

import { createBlankProject } from "../model/project";
import { projectFileName } from "./exportProject";

describe("project export", () => {
  it("creates a safe portable project filename", () => {
    const project = createBlankProject("第21号作战 / 横滨");

    expect(projectFileName(project)).toBe("第21号作战-横滨.atlas.json");
  });
});
