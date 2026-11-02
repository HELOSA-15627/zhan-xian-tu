import type { SelectionBounds } from "./selectionGeometry";

export type GuideNeighbor = {
  id: string;
  bounds: SelectionBounds;
};

export type AlignmentGuide = {
  axis: "x" | "y";
  from: number;
  to: number;
  cross: number;
  distance: number;
  neighborId: string;
};

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return Math.min(endA, endB) >= Math.max(startA, startB);
}

export function buildAlignmentGuides(
  bounds: SelectionBounds,
  neighbors: GuideNeighbor[],
  maxDistance = 80,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const selectionRight = bounds.x + bounds.width;
  const selectionBottom = bounds.y + bounds.height;

  for (const neighbor of neighbors) {
    const other = neighbor.bounds;
    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;

    if (
      rangesOverlap(
        bounds.y,
        selectionBottom,
        other.y,
        otherBottom,
      )
    ) {
      if (other.x >= selectionRight) {
        const distance = other.x - selectionRight;
        if (distance > 0 && distance <= maxDistance) {
          guides.push({
            axis: "x",
            from: selectionRight,
            to: other.x,
            cross:
              (Math.max(bounds.y, other.y) +
                Math.min(selectionBottom, otherBottom)) /
              2,
            distance,
            neighborId: neighbor.id,
          });
        }
      } else if (otherRight <= bounds.x) {
        const distance = bounds.x - otherRight;
        if (distance > 0 && distance <= maxDistance) {
          guides.push({
            axis: "x",
            from: otherRight,
            to: bounds.x,
            cross:
              (Math.max(bounds.y, other.y) +
                Math.min(selectionBottom, otherBottom)) /
              2,
            distance,
            neighborId: neighbor.id,
          });
        }
      }
    }

    if (
      rangesOverlap(
        bounds.x,
        selectionRight,
        other.x,
        otherRight,
      )
    ) {
      if (other.y >= selectionBottom) {
        const distance = other.y - selectionBottom;
        if (distance > 0 && distance <= maxDistance) {
          guides.push({
            axis: "y",
            from: selectionBottom,
            to: other.y,
            cross:
              (Math.max(bounds.x, other.x) +
                Math.min(selectionRight, otherRight)) /
              2,
            distance,
            neighborId: neighbor.id,
          });
        }
      } else if (otherBottom <= bounds.y) {
        const distance = bounds.y - otherBottom;
        if (distance > 0 && distance <= maxDistance) {
          guides.push({
            axis: "y",
            from: otherBottom,
            to: bounds.y,
            cross:
              (Math.max(bounds.x, other.x) +
                Math.min(selectionRight, otherRight)) /
              2,
            distance,
            neighborId: neighbor.id,
          });
        }
      }
    }
  }

  return guides.sort((a, b) => a.distance - b.distance).slice(0, 8);
}
