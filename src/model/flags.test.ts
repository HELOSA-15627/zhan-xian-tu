import { describe, expect, it } from "vitest";

import {
  FLAG_ASSETS,
  FLAG_ASSETS_BY_ID,
  defaultFlagArtwork,
  flagArtworkName,
} from "./flags";

describe("flag catalog", () => {
  it("contains all 47 flags extracted from the map footer", () => {
    expect(FLAG_ASSETS).toHaveLength(47);
    expect(new Set(FLAG_ASSETS.map((flag) => flag.id)).size).toBe(47);
    expect(FLAG_ASSETS.every((flag) => Boolean(flag.url))).toBe(true);
  });

  it("uses Chinese country names while preserving original names", () => {
    expect(flagArtworkName("flag-north-point")).toBe("北角");
    expect(flagArtworkName("flag-yuktobania")).toBe("尤克托巴尼亚");
    expect(FLAG_ASSETS_BY_ID.get("flag-north-point")).toMatchObject({
      englishName: "North Point",
      chineseName: "北角",
    });
  });

  it("provides a deterministic default flag", () => {
    expect(defaultFlagArtwork()).toBe("flag-adamas");
  });
});
