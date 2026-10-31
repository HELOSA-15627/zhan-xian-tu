import { describe, expect, it } from "vitest";

import { buildTickMarks } from "./linePattern";

describe("line patterns", () => {
  it("builds repeated open cross ticks without closing the path", () => {
    const path = buildTickMarks(
      [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
      ],
      20,
      12,
    );

    expect(path.match(/M /g)?.length).toBeGreaterThan(4);
    expect(path).toContain("L");
    expect(path).not.toContain("Z");
  });
});
