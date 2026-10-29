import type {
  AnimationSpec,
  ArrowObject,
  SceneObject,
} from "./types";

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getAnimationEnd(arrow: ArrowObject): number {
  if (!arrow.animation.enabled) return 0;
  const end =
    arrow.animation.delay +
    arrow.animation.duration * (arrow.animation.repeat + 1);
  return Math.round(end * 1000) / 1000;
}

export function getTimelineDuration(objects: SceneObject[]): number {
  const duration = objects.reduce((longest, object) => {
    if (object.type !== "arrow") return longest;
    return Math.max(longest, getAnimationEnd(object));
  }, 0);

  return Math.round(duration * 1000) / 1000;
}

export function getArrowAnimationProgress(
  animation: AnimationSpec,
  time: number,
): number {
  if (!animation.enabled || animation.duration <= 0) return 1;

  const total = animation.duration * (animation.repeat + 1);
  const elapsed = time - animation.delay;
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 1;

  const cycleElapsed = elapsed % animation.duration;
  return clampProgress(cycleElapsed / animation.duration);
}

export function arrowDashState(
  length: number,
  progress: number,
): { dasharray: string; dashoffset: number } {
  const safeLength = Math.max(0, length);
  const safeProgress = clampProgress(progress);

  return {
    dasharray: `${safeLength} ${safeLength}`,
    dashoffset: safeLength * (1 - safeProgress),
  };
}
