import { create } from "zustand";

import {
  createBlankProject,
  createLayer,
  duplicateObject,
  normalizeStrokeWidth,
} from "../model/project";
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
  Layer,
  LineStyle,
  MarkerArtworkId,
  SceneObject,
  SceneObjectPatch,
  TacticalSymbol,
  UnitAffiliation,
  UnitArtworkSource,
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
  applyBackground: (dataUrl: string, width: number, height: number) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, patch: SceneObjectPatch) => void;
  removeObject: (id: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  addLayer: (name?: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  toggleLayer: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
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
    const past = [...state.past, cloneProject(state.project)].slice(
      -HISTORY_LIMIT,
    );

    set({
      project: touchProject(project),
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
      const next = cloneProject(project);
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
      commitProject(next);
    },

    applyBackground: (dataUrl, width, height) => {
      const next = cloneProject(get().project);
      next.width = width;
      next.height = height;
      next.background = {
        ...next.background,
        dataUrl,
        opacity: 1,
      };
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
          Math.max(12, normalizedPatch.headSize),
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

    addLayer: (name) => {
      const next = cloneProject(get().project);
      const layer = createLayer(
        name?.trim() || `标注图层 ${next.layers.length + 1}`,
      );
      next.layers.push(layer);
      commitProject(next, { activeLayerId: layer.id });
    },

    renameLayer: (layerId, name) => {
      const next = cloneProject(get().project);
      const layer = next.layers.find((item) => item.id === layerId);
      if (!layer || !name.trim()) return;
      layer.name = name.trim();
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

    deleteLayer: (layerId) => {
      const state = get();
      if (state.project.layers.length <= 1) return;
      const next = cloneProject(state.project);
      next.layers = next.layers.filter((layer) => layer.id !== layerId);
      next.objects = next.objects.filter(
        (object) => object.layerId !== layerId,
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

    undo: () => {
      const state = get();
      const previous = state.past.at(-1);
      if (!previous) return;
      set({
        project: cloneProject(previous),
        past: state.past.slice(0, -1),
        future: [cloneProject(state.project), ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        selectedIds: normalizeSelection(state.selectedIds, previous),
        activeLayerId:
          previous.layers.find((layer) => layer.id === state.activeLayerId)?.id ??
          previous.layers[0].id,
      });
    },

    redo: () => {
      const state = get();
      const next = state.future[0];
      if (!next) return;
      set({
        project: cloneProject(next),
        past: [...state.past, cloneProject(state.project)].slice(
          -HISTORY_LIMIT,
        ),
        future: state.future.slice(1),
        selectedIds: normalizeSelection(state.selectedIds, next),
        activeLayerId:
          next.layers.find((layer) => layer.id === state.activeLayerId)?.id ??
          next.layers[0].id,
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
