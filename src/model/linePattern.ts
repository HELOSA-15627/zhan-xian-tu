import type { Point } from "./types";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildTickMarks(
  points: Point[],
  spacing: number,
  tickLength: number,
): string {
  if (points.length < 2) return "";

  const safeSpacing = Math.max(4, spacing);
  const halfTick = Math.max(1, tickLength) / 2;
  const commands: string[] = [];
  let distanceToTick = safeSpacing / 2;
  let travelled = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLength = Math.hypot(dx, dy);
    if (segmentLength <= 0) continue;

    while (distanceToTick <= travelled + segmentLength) {
      const amount = (distanceToTick - travelled) / segmentLength;
      const center = {
        x: start.x + dx * amount,
        y: start.y + dy * amount,
      };
      const nx = -dy / segmentLength;
      const ny = dx / segmentLength;
      commands.push(
        `M ${round(center.x - nx * halfTick)} ${round(center.y - ny * halfTick)} ` +
          `L ${round(center.x + nx * halfTick)} ${round(center.y + ny * halfTick)}`,
      );
      distanceToTick += safeSpacing;
    }

    travelled += segmentLength;
  }

  return commands.join(" ");
}
