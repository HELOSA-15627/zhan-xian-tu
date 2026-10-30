import { describe, expect, it } from "vitest";

import {
  AFFILIATION_COLORS,
  NATO_ASSETS,
  NATO_TINTS,
  UNIT_ASSETS,
  UNIT_TINTS,
  arrowHeadAssetForTint,
  unitArtworkAssetFor,
} from "./unitAssets";

const natoSvgSources = import.meta.glob("../assets/nato/*.svg", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("unit artwork catalog", () => {
  it("contains all 17 PSD layers in three clean color variants", () => {
    expect(UNIT_ASSETS).toHaveLength(17);
    expect(
      UNIT_ASSETS.map((asset) => asset.sourceLayer).sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(UNIT_TINTS).toEqual(["friendly", "hostile", "objective"]);

    for (const asset of UNIT_ASSETS) {
      expect(Object.keys(asset.variants).sort()).toEqual(
        [...UNIT_TINTS].sort(),
      );
      for (const tint of UNIT_TINTS) {
        expect(asset.variants[tint]).toBeTruthy();
      }
    }
  });

  it("includes the three newly supplied self-made badges", () => {
    expect(
      UNIT_ASSETS.filter((asset) =>
        [
          "friendly-fighter-clean",
          "hostile-destroyed",
        ].includes(asset.id),
      ).map((asset) => [asset.id, asset.label]),
    ).toEqual([
      ["friendly-fighter-clean", "新式飞行器"],
      ["hostile-destroyed", "击毁目标"],
    ]);
  });

  it("provides standard affiliation colors and objective arrow art", () => {
    expect(AFFILIATION_COLORS).toMatchObject({
      friendly: "#92cf00",
      hostile: "#9b351f",
      objective: "#00d9e0",
    });
    expect(unitArtworkAssetFor("friendly-tank", "hostile")).toBeTruthy();
    expect(arrowHeadAssetForTint("objective")).toBeTruthy();
  });

  it("imports eight NATO unit assets independently of PSD artwork", () => {
    expect(NATO_ASSETS).toHaveLength(8);
    expect(NATO_TINTS).toEqual(["friendly", "hostile"]);
    expect(NATO_ASSETS.every((asset) => asset.id.startsWith("nato-"))).toBe(
      true,
    );
    expect(
      NATO_ASSETS.every(
        (asset) =>
          Boolean(asset.variants.friendly) &&
          Boolean(asset.variants.hostile),
      ),
    ).toBe(true);
  });

  it("renders NATO affiliation fills fully opaque", () => {
    const sources = Object.values(natoSvgSources);

    expect(sources).toHaveLength(16);
    expect(
      sources.every((source) => !source.includes('fill-opacity="0.24"')),
    ).toBe(true);
  });
});
