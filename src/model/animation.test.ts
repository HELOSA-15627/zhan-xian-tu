import { describe, expect, it } from "vitest";

import { createArrow } from "./project";
import {
  arrowDashState,
  getAnimationEnd,
  getArrowAnimationProgress,
  getTimelineDuration,
} from "./animation";

describe("arrow animation", () => {
  it("returns a clamped progress for delayed arrows", () => {
    const animation = {
      enabled: true,
      delay: 1,
      duration: 2,
      repeat: 0,
    };

    expect(getArrowAnimationProgress(animation, 0.5)).toBe(0);
    expect(getArrowAnimationProgress(animation, 2)).toBe(0.5);
    expect(getArrowAnimationProgress(animation, 4)).toBe(1);
  });

  it("returns to the beginning for a repeated cycle", () => {
    const animation = {
      enabled: true,
      delay: 0,
      duration: 2,
      repeat: 1,
    };

    expect(getArrowAnimationProgress(animation, 2.5)).toBe(0.25);
    expect(getArrowAnimationProgress(animation, 5)).toBe(1);
  });

  it("finds the longest arrow animation", () => {
    const arrow = createArrow("layer", { x: 0, y: 0 }, { x: 1, y: 1 });
    arrow.animation.delay = 3;
    const nested = createArrow("layer", { x: 0, y: 0 }, { x: 2, y: 2 });
    nested.animation.delay = 1;
    nested.animation.duration = 2;
    nested.animation.repeat = 2;

    expect(getAnimationEnd(arrow)).toBe(4.2);
    expect(getTimelineDuration([arrow, nested])).toBe(7);
  });

  it("anchors the dash offset to reveal the line from its start", () => {
    expect(arrowDashState(200, 0)).toEqual({
      dasharray: "200 200",
      dashoffset: 200,
    });
    expect(arrowDashState(200, 0.5)).toEqual({
      dasharray: "200 200",
      dashoffset: 100,
    });
  });
});
