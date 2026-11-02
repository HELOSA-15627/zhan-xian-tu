import { describe, expect, it } from "vitest";

import {
  buildBasemapCssFilter,
  hasBasemapEffects,
} from "./basemapEffects";

describe("basemap effects", () => {
  it("omits the filter entirely for identity settings", () => {
    expect(
      buildBasemapCssFilter({
        grayscale: 0,
        contrast: 1,
        brightness: 1,
        blur: 0,
      }),
    ).toBeUndefined();
  });

  it("includes only requested effects", () => {
    expect(
      buildBasemapCssFilter({
        grayscale: 30,
        contrast: 1.2,
        brightness: 1,
        blur: 6,
      }),
    ).toBe("grayscale(30%) contrast(1.2) blur(6px)");
  });

  it("treats noise as a basemap effect that needs preprocessing", () => {
    expect(
      hasBasemapEffects({
        grayscale: 0,
        contrast: 1,
        brightness: 1,
        blur: 0,
        noise: 0.24,
      }),
    ).toBe(true);
  });
});
