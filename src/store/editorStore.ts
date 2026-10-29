import { create } from "zustand";

import {
  createBlankProject,
  createLayer,
  duplicateObject,
} from "../model/project";
import type { Viewport } from "../model/geometry";
import type {
  AtlasProject,
  BackgroundSettings,
  EditorTool,
  Layer,
  SceneObject,
  SceneObjectPatch,
} from "../model/types";

const HISTORY_LIMIT = 50;

export type EditorState = {
  project: AtlasProject;
  selectedIds: string[];
  activeLayerId: string;
  tool: EditorTool;
  viewport: Viewport;
  past: AtlasProject[];
  future: AtlasProject[];
  setTool: (tool: EditorTool) => void;
  setSelection: (ids: string[]) => void;
  setViewport: (viewport: Viewport) => void;
  setActiveLayer: (layerId: string) => void;
  createNewProject: (title?: string) => void;
  loadProject: (project: AtlasProject) => void;
  updateProjectTitle: (title: string) => void;
  updateBackground: (patch: Partial<BackgroundSettings>) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, patch: SceneObjectPatch) => void;
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
    tool: "select",
    viewport: { x: 0, y: 0, scale: 1 },
    past: [],
    future: [],

    setTool: (tool) => set({ tool }),
    setSelection: (selectedIds) => set({ selectedIds }),
    setViewport: (viewport) => set({ viewport }),
    setActiveLayer: (activeLayerId) => set({ activeLayerId }),

    createNewProject: (title) => {
      const project = createBlankProject(title);
      set({
        project,
        selectedIds: [],
        activeLayerId: project.layers[0].id,
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
      next.objects[index] = {
        ...next.objects[index],
        ...structuredClone(patch),
      } as SceneObject;
      commitProject(next);
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
