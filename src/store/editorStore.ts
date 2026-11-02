import { create } from "zustand";

import {
  createBlankProject,
  createId,
  createLayer,
  createLayerGroup,
  duplicateObject,
  normalizeStrokeWidth,
} from "../model/project";
import { descendantLayerIds } from "../model/layerTree";
import {
  backgroundForMap,
  hydrateActiveMapState,
  syncActiveMapState,
} from "../model/mapState";
import { normalizeFlagAttachment } from "../model/flags";
import {
  DEFAULT_BRUSH_PRESET_ID,
  brushPresetFor,
} from "../model/brushes";
import type {
  BrushPresetId,
  SketchMode,
} from "../model/types";
import type { Viewport } from "../model/geometry";
import type {
  AtlasProject,
  BackgroundSettings,
  EditorTool,
  ImportedMap,
  Layer,
  LineStyle,
  MarkerArtworkId,
  SceneObject,
  SceneObjectPatch,
  TacticalSymbol,
  UnitAffiliation,
  UnitArtworkSource,
  UserArtworkAsset,
} from "../model/types";

const HISTORY_LIMIT = 50;
const STROKE_DAMPING_KEY = "tactical-atlas:stroke-damping";
const ARROW_DRAW_MODE_KEY = "tactical-atlas:arrow-draw-mode";
const REGION_DRAW_MODE_KEY = "tactical-atlas:region-draw-mode";
const ACTIVE_BRUSH_KEY = "tactical-atlas:active-brush";

function readSketchMode(key: string, fallback: SketchMode): SketchMode {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved === "direct" || saved === "polyline" ? saved : fallback;
  } catch {
    return fallback;
  }
}

function readBrushPreset(): BrushPresetId {
  if (typeof localStorage === "undefined") return DEFAULT_BRUSH_PRESET_ID;
  try {
    const saved = localStorage.getItem(ACTIVE_BRUSH_KEY);
    return saved &&
      ["command", "drafting", "advance", "taper"].includes(saved)
      ? (saved as BrushPresetId)
      : DEFAULT_BRUSH_PRESET_ID;
  } catch {
    return DEFAULT_BRUSH_PRESET_ID;
  }
}

function readStrokeDamping(): number {
  if (typeof localStorage === "undefined") return 0.58;
  try {
    const saved = localStorage.getItem(STROKE_DAMPING_KEY);
    if (saved === null) return 0.58;
    const stored = Number(saved);
    return Number.isFinite(stored)
      ? Math.min(1, Math.max(0, stored))
      : 0.58;
  } catch {
    return 0.58;
  }
}

export type EditorState = {
  project: AtlasProject;
  selectedIds: string[];
  activeLayerId: string;
  activeSymbol: TacticalSymbol;
  activeAffiliation: UnitAffiliation;
  activeArtwork: MarkerArtworkId;
  activeArtworkSource: UnitArtworkSource;
  activeLineStyle: LineStyle;
  arrowDrawMode: SketchMode;
  regionDrawMode: SketchMode;
  activeBrush: BrushPresetId;
  strokeDamping: number;
  tool: EditorTool;
  viewport: Viewport;
  past: AtlasProject[];
  future: AtlasProject[];
  setTool: (tool: EditorTool) => void;
  setSelection: (ids: string[]) => void;
  setViewport: (viewport: Viewport) => void;
  setActiveLayer: (layerId: string) => void;
  setActiveSymbol: (symbol: TacticalSymbol) => void;
  setActiveAffiliation: (affiliation: UnitAffiliation) => void;
  setActiveArtwork: (artwork: MarkerArtworkId) => void;
  setActiveArtworkSource: (source: UnitArtworkSource) => void;
  setActiveLineStyle: (lineStyle: LineStyle) => void;
  setArrowDrawMode: (mode: SketchMode) => void;
  setRegionDrawMode: (mode: SketchMode) => void;
  setActiveBrush: (brush: BrushPresetId) => void;
  setStrokeDamping: (strength: number) => void;
  createNewProject: (title?: string) => void;
  loadProject: (project: AtlasProject) => void;
  updateProjectTitle: (title: string) => void;
  updateBackground: (patch: Partial<BackgroundSettings>) => void;
  applyBackground: (
    dataUrl: string,
    width: number,
    height: number,
    name?: string,
  ) => void;
  selectMap: (mapId: string) => void;
  renameMap: (mapId: string, name: string) => void;
  toggleMapVisibility: (mapId: string) => void;
  moveMap: (mapId: string, direction: -1 | 1) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, patch: SceneObjectPatch) => void;
  removeObject: (id: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  addLayer: (name?: string, parentId?: string) => void;
  createGroupFromActiveLayer: (name?: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  moveLayer: (layerId: string, direction: -1 | 1) => void;
  toggleLayer: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  toggleLayerExpanded: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
  moveObjectInLayer: (objectId: string, direction: -1 | 1) => void;
  moveObjectToLayer: (objectId: string, layerId: string) => void;
  saveLayerAsGraphic: (layerId: string, name: string) => void;
  insertSavedGraphic: (graphicId: string) => void;
  addCustomArtwork: (asset: UserArtworkAsset) => void;
  removeCustomArtwork: (assetId: string) => void;
  undo: () => void;
  redo: () => void;
};

function cloneProject(project: AtlasProject): AtlasProject {
  return structuredClone(project);
}

function touchProject(project: AtlasProject): AtlasProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSelection(
  selectedIds: string[],
  project: AtlasProject,
): string[] {
  const existing = new Set(project.objects.map((object) => object.id));
  return selectedIds.filter((id) => existing.has(id));
}

const initialProject = createBlankProject();

export const useEditorStore = create<EditorState>((set, get) => {
  const commitProject = (
    project: AtlasProject,
    extra: Partial<
      Pick<EditorState, "selectedIds" | "activeLayerId" | "viewport">
    > = {},
  ) => {
    const state = get();
    const syncedProject = syncActiveMapState(project);
    const past = [...state.past, cloneProject(state.project)].slice(
      -HISTORY_LIMIT,
    );

    set({
      project: touchProject(syncedProject),
      past,
      future: [],
      ...extra,
    });
  };

  return {
    project: initialProject,
    selectedIds: [],
    activeLayerId: initialProject.layers[0].id,
    activeSymbol: "friendly",
    activeAffiliation: "friendly",
    activeArtwork: "friendly-tank",
    activeArtworkSource: "psd",
    activeLineStyle: "solid",
    arrowDrawMode: readSketchMode(ARROW_DRAW_MODE_KEY, "direct"),
    regionDrawMode: readSketchMode(REGION_DRAW_MODE_KEY, "polyline"),
    activeBrush: readBrushPreset(),
    strokeDamping: readStrokeDamping(),
    tool: "select",
    viewport: { x: 0, y: 0, scale: 1 },
    past: [],
    future: [],

    setTool: (tool) => set({ tool }),
    setSelection: (selectedIds) => set({ selectedIds }),
    setViewport: (viewport) => set({ viewport }),
    setActiveLayer: (activeLayerId) => set({ activeLayerId }),
    setActiveSymbol: (activeSymbol) => set({ activeSymbol }),
    setActiveAffiliation: (activeAffiliation) => set({ activeAffiliation }),
    setActiveArtwork: (activeArtwork) => set({ activeArtwork }),
    setActiveArtworkSource: (activeArtworkSource) =>
      set({ activeArtworkSource }),
    setActiveLineStyle: (activeLineStyle) => set({ activeLineStyle }),
    setArrowDrawMode: (arrowDrawMode) => {
      try {
        localStorage.setItem(ARROW_DRAW_MODE_KEY, arrowDrawMode);
      } catch {
        // Editing remains available when browser storage is unavailable.
      }
      set({ arrowDrawMode });
    },
    setRegionDrawMode: (regionDrawMode) => {
      try {
        localStorage.setItem(REGION_DRAW_MODE_KEY, regionDrawMode);
      } catch {
        // Editing remains available when browser storage is unavailable.
      }
      set({ regionDrawMode });
    },
    setActiveBrush: (activeBrush) => {
      const normalized = brushPresetFor(activeBrush).id;
      try {
        localStorage.setItem(ACTIVE_BRUSH_KEY, normalized);
      } catch {
        // Editing remains available when browser storage is unavailable.
      }
      set({ activeBrush: normalized });
    },
    setStrokeDamping: (strength) => {
      const strokeDamping = Math.min(1, Math.max(0, strength));
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(STROKE_DAMPING_KEY, String(strokeDamping));
        }
      } catch {
        // Editing remains usable when browser storage is unavailable.
      }
      set({ strokeDamping });
    },

    createNewProject: (title) => {
      const project = createBlankProject(title);
      set({
        project,
        selectedIds: [],
        activeLayerId: project.layers[0].id,
        activeSymbol: "friendly",
        activeAffiliation: "friendly",
        activeArtwork: "friendly-tank",
        activeArtworkSource: "psd",
        activeLineStyle: "solid",
        tool: "select",
        viewport: { x: 0, y: 0, scale: 1 },
        past: [],
        future: [],
      });
    },

    loadProject: (project) => {
      const next = hydrateActiveMapState(cloneProject(project));
      set({
        project: next,
        selectedIds: [],
        activeLayerId: next.layers[0]?.id ?? "",
        tool: "select",
        past: [],
        future: [],
      });
    },

    updateProjectTitle: (title) => {
      const next = cloneProject(get().project);
      next.title = title;
      commitProject(next);
    },

    updateBackground: (patch) => {
      const next = cloneProject(get().project);
      next.background = { ...next.background, ...patch };
      const activeMap = next.maps.find(
        (map) => map.id === next.activeMapId,
      );
      if (activeMap) {
        Object.assign(activeMap, patch);
      }
      commitProject(next);
    },

    applyBackground: (dataUrl, width, height, name) => {
      const next = cloneProject(get().project);
      syncActiveMapState(next);
      const firstMap = next.maps.length === 0;
      const mapLayers = firstMap
        ? structuredClone(next.layers)
        : [createLayer("标注图层")];
      const mapObjects = firstMap ? structuredClone(next.objects) : [];
      const mapName =
        name?.trim() || `导入地图 ${next.maps.length + 1}`;
      const map: ImportedMap = {
        id: `map-${crypto.randomUUID()}`,
        name: mapName,
        dataUrl,
        width,
        height,
        opacity: 1,
        grayscale: 0,
        contrast: 1,
        brightness: 1,
        blur: 0,
        noise: 0,
        contourEnabled: false,
        contourLevels: 8,
        contourOpacity: 0.35,
        contourPaths: [],
        contourImage: null,
        excludeBlue: true,
        visible: true,
        layers: mapLayers,
        objects: mapObjects,
      };
      next.width = width;
      next.height = height;
      next.background = backgroundForMap(map);
      next.maps.push(map);
      next.activeMapId = map.id;
      next.layers = structuredClone(map.layers);
      next.objects = structuredClone(map.objects);
      if (firstMap && name?.trim()) {
        next.title = name.trim();
      }
      commitProject(next, {
        activeLayerId: map.layers[0]?.id ?? "",
        selectedIds: [],
      });
    },

    selectMap: (mapId) => {
      const next = cloneProject(get().project);
      syncActiveMapState(next);
      const map = next.maps.find((item) => item.id === mapId);
      if (!map || next.activeMapId === mapId) return;
      next.activeMapId = map.id;
      const hydrated = hydrateActiveMapState(next);
      set({
        project: touchProject(hydrated),
        selectedIds: [],
        activeLayerId: hydrated.layers[0]?.id ?? "",
      });
    },

    renameMap: (mapId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next = cloneProject(get().project);
      const map = next.maps.find((item) => item.id === mapId);
      if (!map || map.name === trimmed) return;
      map.name = trimmed;
      commitProject(next);
    },

    toggleMapVisibility: (mapId) => {
      const next = cloneProject(get().project);
      const map = next.maps.find((item) => item.id === mapId);
      if (!map) return;
      map.visible = map.visible === false;
      commitProject(next);
    },

    moveMap: (mapId, direction) => {
      const next = cloneProject(get().project);
      const index = next.maps.findIndex((map) => map.id === mapId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= next.maps.length) return;
      [next.maps[index], next.maps[target]] = [
        next.maps[target],
        next.maps[index],
      ];
      commitProject(next);
    },

    addObject: (object) => {
      const next = cloneProject(get().project);
      next.objects.push(structuredClone(object));
      commitProject(next, {
        selectedIds: [object.id],
        activeLayerId: object.layerId,
      });
    },

    updateObject: (id, patch) => {
      const next = cloneProject(get().project);
      const index = next.objects.findIndex((object) => object.id === id);
      if (index === -1) return;
      const normalizedPatch = { ...patch };
      if (normalizedPatch.width !== undefined) {
        normalizedPatch.width = normalizeStrokeWidth(normalizedPatch.width, 0);
      }
      if (normalizedPatch.startWidth !== undefined) {
        normalizedPatch.startWidth = normalizeStrokeWidth(
          normalizedPatch.startWidth,
          0,
        );
      }
      if (normalizedPatch.endWidth !== undefined) {
        normalizedPatch.endWidth = normalizeStrokeWidth(
          normalizedPatch.endWidth,
          0,
        );
      }
      if (normalizedPatch.strokeWidth !== undefined) {
        normalizedPatch.strokeWidth = normalizeStrokeWidth(
          normalizedPatch.strokeWidth,
          0,
        );
      }
      if (normalizedPatch.headSize !== undefined) {
        normalizedPatch.headSize = Math.min(
          160,
          Math.max(0, normalizedPatch.headSize),
        );
      }
      if (normalizedPatch.strokeWidth !== undefined) {
        normalizedPatch.strokeWidth = Math.min(
          16,
          Math.max(0, normalizedPatch.strokeWidth),
        );
      }
      if (normalizedPatch.lineDashCount !== undefined) {
        normalizedPatch.lineDashCount = Math.min(
          80,
          Math.max(4, Math.round(normalizedPatch.lineDashCount)),
        );
      }
      const updatedObject = {
        ...next.objects[index],
        ...structuredClone(normalizedPatch),
      } as SceneObject;
      if (
        updatedObject.type === "marker" &&
        "flagAttachment" in normalizedPatch
      ) {
        const attachment = normalizeFlagAttachment(
          normalizedPatch.flagAttachment,
        );
        if (attachment) {
          updatedObject.flagAttachment = attachment;
        } else {
          delete updatedObject.flagAttachment;
        }
      }
      next.objects[index] = updatedObject;
      commitProject(next);
    },

    removeObject: (id) => {
      const state = get();
      if (!state.project.objects.some((object) => object.id === id)) return;
      const next = cloneProject(state.project);
      next.objects = next.objects.filter((object) => object.id !== id);
      commitProject(next, {
        selectedIds: state.selectedIds.filter((selected) => selected !== id),
      });
    },

    removeSelected: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const selected = new Set(state.selectedIds);
      const next = cloneProject(state.project);
      next.objects = next.objects.filter((object) => !selected.has(object.id));
      commitProject(next, { selectedIds: [] });
    },

    duplicateSelected: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const selected = new Set(state.selectedIds);
      const copies = state.project.objects
        .filter((object) => selected.has(object.id))
        .map(duplicateObject);
      const next = cloneProject(state.project);
      next.objects.push(...copies);
      commitProject(next, {
        selectedIds: copies.map((object) => object.id),
      });
    },

    addLayer: (name, parentId) => {
      const next = cloneProject(get().project);
      const layer = createLayer(
        name?.trim() || `标注图层 ${next.layers.length + 1}`,
      );
      const activeLayer = next.layers.find(
        (item) => item.id === (parentId ?? get().activeLayerId),
      );
      layer.parentId = parentId
        ? activeLayer?.id ?? null
        : activeLayer?.kind === "group"
          ? activeLayer.id
          : null;
      next.layers.push(layer);
      commitProject(next, { activeLayerId: layer.id });
    },

    createGroupFromActiveLayer: (name) => {
      const state = get();
      const next = cloneProject(state.project);
      const activeIndex = next.layers.findIndex(
        (layer) => layer.id === state.activeLayerId,
      );
      if (activeIndex === -1) return;
      const activeLayer = next.layers[activeIndex];
      const group = createLayerGroup(
        name?.trim() || `图层组 ${next.layers.length + 1}`,
      );
      group.parentId = activeLayer.parentId;
      next.layers.splice(activeIndex, 0, group);
      activeLayer.parentId = group.id;
      commitProject(next, { activeLayerId: group.id });
    },

    renameLayer: (layerId, name) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer || !name.trim()) return;
      layer.name = name.trim();
      commitProject(next);
    },

    setLayerOpacity: (layerId, opacity) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer) return;
      layer.opacity = Math.min(1, Math.max(0, opacity));
      commitProject(next);
    },

    moveLayer: (layerId, direction) => {
      const next = cloneProject(get().project);
      const index = next.layers.findIndex((layer) => layer.id === layerId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= next.layers.length) return;
      [next.layers[index], next.layers[target]] = [
        next.layers[target],
        next.layers[index],
      ];
      commitProject(next);
    },

    toggleLayer: (layerId) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer) return;
      layer.visible = !layer.visible;
      commitProject(next);
    },

    toggleLayerLock: (layerId) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer) return;
      layer.locked = !layer.locked;
      commitProject(next);
    },

    toggleLayerExpanded: (layerId) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer) return;
      layer.expanded = !layer.expanded;
      commitProject(next);
    },

    deleteLayer: (layerId) => {
      const state = get();
      if (state.project.layers.length <= 1) return;
      const next = cloneProject(state.project);
      const removedLayerIds = new Set([
        layerId,
        ...descendantLayerIds(state.project.layers, layerId),
      ]);
      next.layers = next.layers.filter(
        (layer) => !removedLayerIds.has(layer.id),
      );
      if (next.layers.length === 0) {
        next.layers.push(createLayer("标注图层"));
      }
      next.objects = next.objects.filter(
        (object) => !removedLayerIds.has(object.layerId),
      );
      const activeLayerId =
        state.activeLayerId === layerId
          ? next.layers[0].id
          : state.activeLayerId;
      commitProject(next, {
        selectedIds: normalizeSelection(state.selectedIds, next),
        activeLayerId,
      });
    },

    moveObjectInLayer: (objectId, direction) => {
      const next = cloneProject(get().project);
      const object = next.objects.find((item) => item.id === objectId);
      if (!object) return;
      const siblings = next.objects.filter(
        (item) => item.layerId === object.layerId,
      );
      const siblingIndex = siblings.findIndex((item) => item.id === objectId);
      const neighbor = siblings[siblingIndex + direction];
      if (!neighbor) return;
      const objectIndex = next.objects.findIndex(
        (item) => item.id === object.id,
      );
      const neighborIndex = next.objects.findIndex(
        (item) => item.id === neighbor.id,
      );
      [next.objects[objectIndex], next.objects[neighborIndex]] = [
        next.objects[neighborIndex],
        next.objects[objectIndex],
      ];
      commitProject(next);
    },

    moveObjectToLayer: (objectId, layerId) => {
      const next = cloneProject(get().project);
      const object = next.objects.find((item) => item.id === objectId);
      const target = next.layers.find((layer) => layer.id === layerId);
      if (
        !object ||
        !target ||
        target.kind === "group" ||
        object.layerId === layerId
      ) {
        return;
      }
      object.layerId = layerId;
      commitProject(next, { activeLayerId: layerId });
    },

    saveLayerAsGraphic: (layerId, name) => {
      const state = get();
      const source = state.project.layers.find(
        (layer) => layer.id === layerId,
      );
      const trimmed = name.trim();
      if (!source || !trimmed) return;
      const layerIds = new Set([
        layerId,
        ...descendantLayerIds(state.project.layers, layerId),
      ]);
      const next = cloneProject(state.project);
      next.savedGraphics.push({
        id: createId("graphic"),
        name: trimmed,
        width: state.project.width,
        height: state.project.height,
        layers: structuredClone(
          state.project.layers.filter((layer) => layerIds.has(layer.id)),
        ),
        objects: structuredClone(
          state.project.objects.filter((object) =>
            layerIds.has(object.layerId),
          ),
        ),
      });
      commitProject(next);
    },

    insertSavedGraphic: (graphicId) => {
      const state = get();
      const saved = state.project.savedGraphics.find(
        (graphic) => graphic.id === graphicId,
      );
      if (!saved) return;
      const next = cloneProject(state.project);
      const root = createLayerGroup(saved.name);
      const savedLayerIds = new Set(saved.layers.map((layer) => layer.id));
      const idMap = new Map(
        saved.layers.map((layer) => [layer.id, createId("layer")]),
      );
      const insertedLayers = saved.layers.map((layer) => ({
        ...structuredClone(layer),
        id: idMap.get(layer.id)!,
        parentId:
          layer.parentId && savedLayerIds.has(layer.parentId)
            ? idMap.get(layer.parentId)!
            : root.id,
      }));
      const insertedObjects = saved.objects.map((object) => {
        const copy = structuredClone(object);
        copy.id = createId(copy.type);
        copy.layerId = idMap.get(object.layerId) ?? root.id;
        offsetSceneObject(copy, 24, 24);
        return copy;
      });
      next.layers.push(root, ...insertedLayers);
      next.objects.push(...insertedObjects);
      commitProject(next, {
        selectedIds: insertedObjects.map((object) => object.id),
        activeLayerId: insertedLayers[0]?.id ?? root.id,
      });
    },

    addCustomArtwork: (asset) => {
      const next = cloneProject(get().project);
      const index = next.customAssets.findIndex(
        (candidate) => candidate.id === asset.id,
      );
      if (index >= 0) next.customAssets[index] = structuredClone(asset);
      else next.customAssets.push(structuredClone(asset));
      commitProject(next);
    },

    removeCustomArtwork: (assetId) => {
      const next = cloneProject(get().project);
      next.customAssets = next.customAssets.filter(
        (asset) => asset.id !== assetId,
      );
      commitProject(next);
    },

    undo: () => {
      const state = get();
      const previous = state.past.at(-1);
      if (!previous) return;
      const restored = hydrateActiveMapState(cloneProject(previous));
      set({
        project: restored,
        past: state.past.slice(0, -1),
        future: [cloneProject(state.project), ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        selectedIds: normalizeSelection(state.selectedIds, restored),
        activeLayerId:
          restored.layers.find((layer) => layer.id === state.activeLayerId)?.id ??
          restored.layers[0].id,
      });
    },

    redo: () => {
      const state = get();
      const next = state.future[0];
      if (!next) return;
      const restored = hydrateActiveMapState(cloneProject(next));
      set({
        project: restored,
        past: [...state.past, cloneProject(state.project)].slice(
          -HISTORY_LIMIT,
        ),
        future: state.future.slice(1),
        selectedIds: normalizeSelection(state.selectedIds, restored),
        activeLayerId:
          restored.layers.find((layer) => layer.id === state.activeLayerId)?.id ??
          restored.layers[0].id,
      });
    },
  };
});

export function getLayerForObject(
  project: AtlasProject,
  object: SceneObject,
): Layer | undefined {
  return project.layers.find((layer) => layer.id === object.layerId);
}

function offsetSceneObject(
  object: SceneObject,
  dx: number,
  dy: number,
): void {
  const offsetPoint = (point: { x: number; y: number }) => {
    point.x += dx;
    point.y += dy;
  };

  switch (object.type) {
    case "marker":
    case "text":
      object.x += dx;
      object.y += dy;
      break;
    case "arrow":
      offsetPoint(object.start);
      offsetPoint(object.end);
      object.points.forEach(offsetPoint);
      break;
    case "region":
    case "freehand":
      object.points.forEach(offsetPoint);
      break;
  }
}
