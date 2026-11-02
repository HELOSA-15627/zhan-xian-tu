import type { Layer } from "./types";

function childrenOf(layers: Layer[], parentId: string): Layer[] {
  return layers.filter((layer) => layer.parentId === parentId);
}

export function descendantLayerIds(
  layers: Layer[],
  layerId: string,
): string[] {
  const descendants: string[] = [];
  const visit = (parentId: string) => {
    for (const child of childrenOf(layers, parentId)) {
      descendants.push(child.id);
      visit(child.id);
    }
  };
  visit(layerId);
  return descendants;
}

export function layerLineage(layers: Layer[], layerId: string): Layer[] {
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const lineage: Layer[] = [];
  const seen = new Set<string>();
  let current = byId.get(layerId);

  while (current && !seen.has(current.id)) {
    lineage.unshift(current);
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return lineage;
}

export function effectiveLayerVisible(
  layers: Layer[],
  layerId: string,
): boolean {
  return layerLineage(layers, layerId).every((layer) => layer.visible);
}

export function effectiveLayerOpacity(
  layers: Layer[],
  layerId: string,
): number {
  return layerLineage(layers, layerId).reduce(
    (opacity, layer) => opacity * layer.opacity,
    1,
  );
}

export function effectiveLayerLocked(
  layers: Layer[],
  layerId: string,
): boolean {
  return layerLineage(layers, layerId).some((layer) => layer.locked);
}

export function canMoveLayerToParent(
  layers: Layer[],
  layerId: string,
  parentId: string | null,
): boolean {
  if (parentId === layerId) return false;
  return !parentId || !descendantLayerIds(layers, layerId).includes(parentId);
}

export function flattenLayerRows(
  layers: Layer[],
): Array<{ layer: Layer; depth: number }> {
  const rows: Array<{ layer: Layer; depth: number }> = [];
  const append = (parentId: string | null, depth: number) => {
    const siblings = layers
      .filter((layer) => layer.parentId === parentId)
      .reverse();
    for (const layer of siblings) {
      rows.push({ layer, depth });
      if (layer.expanded && layers.some((item) => item.parentId === layer.id)) {
        append(layer.id, depth + 1);
      }
    }
  };
  append(null, 0);
  return rows;
}
