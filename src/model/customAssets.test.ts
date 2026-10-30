import { describe, expect, it } from "vitest";

import { CUSTOM_ASSETS, customArtworkAssetFor } from "./customAssets";

describe("custom artwork catalog", () => {
  it("contains the original nest artwork", () => {
    expect(CUSTOM_ASSETS).toHaveLength(1);
    expect(CUSTOM_ASSETS[0]).toMatchObject({
      id: "custom-nest",
      label: "巢穴",
    });
    expect(customArtworkAssetFor("custom-nest")).toBeTruthy();
  });
});
