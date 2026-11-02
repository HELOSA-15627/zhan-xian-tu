import type {
  AtlasProject,
  ImportedMap,
  Layer,
  SceneObject,
} from "../model/types";
import { isLineStyle } from "../model/lineStyle";
import { createLayer, normalizeStrokeWidth } from "../model/project";
import { syncActiveMapState } from "../model/mapState";
import {
  defaultFlagArtwork,
  isFlagArtwork,
  normalizeFlagAttachment,
} from "../model/flags";
import { isCustomArtwork } from "../model/customAssets";
import {
  affiliationForSymbol,
  artworkSourceFor,
  defaultArtworkForSymbol,
  defaultNatoArtworkForSymbol,
  isNatoArtwork,
  isPsdArtwork,
  UNIT_TINTS,
} from "../model/unitAssets";

const DATABASE_NAME = "tactical-atlas";
const DATABASE_VERSION = 1;
const STORE_NAME = "projects";
const CURRENT_KEY = "current";

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB 操作失败"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("无法打开本地项目数据库"));
  });

  return databasePromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, mode);
  return action(transaction.objectStore(STORE_NAME));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLayer(value: unknown): value is Layer {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.visible === "boolean" &&
    typeof value.locked === "boolean" &&
    typeof value.opacity === "number"
  );
}

function isImportedMap(value: unknown): value is ImportedMap {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.dataUrl === "string" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.opacity === "number" &&
    typeof value.grayscale === "number" &&
    typeof value.contrast === "number" &&
    typeof value.brightness === "number"
  );
}

function normalizeScale(value: unknown): number {
  return Math.min(
    20,
    Math.max(0.05, typeof value === "number" ? value : 1),
  );
}

function normalizeBackgroundNumber(
  value: unknown,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeContourLevels(value: unknown): number {
  return Math.min(
    24,
    Math.max(
      3,
      typeof value === "number" && Number.isFinite(value)
        ? Math.round(value)
        : 8,
    ),
  );
}

function isSceneObject(value: unknown): value is SceneObject {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.layerId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    return false;
  }

  switch (value.type) {
    case "marker":
      return (
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.size === "number" &&
        typeof value.symbol === "string"
      );
    case "arrow":
      return (
        isRecord(value.start) &&
        typeof value.start.x === "number" &&
        typeof value.start.y === "number" &&
        isRecord(value.end) &&
        typeof value.end.x === "number" &&
        typeof value.end.y === "number" &&
        isRecord(value.animation)
      );
    case "region":
    case "freehand":
      return (
        Array.isArray(value.points) &&
        value.points.every(
          (point) =>
            isRecord(point) &&
            typeof point.x === "number" &&
            typeof point.y === "number",
        )
      );
    case "text":
      return (
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.text === "string" &&
        typeof value.fontSize === "number"
      );
    default:
      return false;
  }
}

function validateProject(value: unknown): AtlasProject {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number" ||
    typeof value.updatedAt !== "string" ||
    !isRecord(value.background) ||
    (value.maps !== undefined &&
      (!Array.isArray(value.maps) || !value.maps.every(isImportedMap))) ||
    (value.activeMapId !== undefined &&
      value.activeMapId !== null &&
      typeof value.activeMapId !== "string") ||
    !Array.isArray(value.layers) ||
    !value.layers.every(isLayer) ||
    !Array.isArray(value.objects) ||
    !value.objects.every(isSceneObject)
  ) {
    throw new Error("项目文件格式无效");
  }

  const project = value as AtlasProject;
  const maps =
    Array.isArray(project.maps) && project.maps.length > 0
      ? structuredClone(project.maps)
      : project.background.dataUrl
        ? [
            {
              id: `map-${project.id}`,
              name: project.title,
              dataUrl: project.background.dataUrl,
              width: project.width,
              height: project.height,
              opacity: project.background.opacity,
              grayscale: project.background.grayscale,
              contrast: project.background.contrast,
              brightness: project.background.brightness,
              blur: normalizeBackgroundNumber(project.background.blur, 0),
              noise: normalizeBackgroundNumber(project.background.noise, 0),
              contourEnabled: project.background.contourEnabled === true,
              contourLevels: normalizeContourLevels(
                project.background.contourLevels,
              ),
              contourOpacity: normalizeBackgroundNumber(
                project.background.contourOpacity,
                0.35,
              ),
              contourPaths: Array.isArray(project.background.contourPaths)
                ? project.background.contourPaths
                : [],
              contourImage:
                typeof project.background.contourImage === "string"
                  ? project.background.contourImage
                  : null,
              excludeBlue: project.background.excludeBlue !== false,
              visible: true,
              layers: structuredClone(project.layers),
              objects: structuredClone(project.objects),
            },
          ]
        : [];
  const activeMapId =
    maps.find((map) => map.id === project.activeMapId)?.id ??
    maps.at(-1)?.id ??
    null;
  const activeMap = maps.find((map) => map.id === activeMapId);
  const layers = project.layers.map((layer) => ({
    ...layer,
    parentId:
      typeof layer.parentId === "string" &&
      project.layers.some((candidate) => candidate.id === layer.parentId)
        ? layer.parentId
        : null,
    kind:
      layer.kind === "group"
        ? ("group" as const)
        : ("layer" as const),
    expanded: layer.expanded !== false,
  }));
  const validated: AtlasProject = {
    ...project,
    maps: maps.map((map) => ({
      ...map,
      blur: normalizeBackgroundNumber(map.blur, 0),
      noise: normalizeBackgroundNumber(map.noise, 0),
      contourEnabled: map.contourEnabled === true,
      contourLevels: normalizeContourLevels(map.contourLevels),
      contourOpacity: normalizeBackgroundNumber(map.contourOpacity, 0.35),
      contourPaths: Array.isArray(map.contourPaths) ? map.contourPaths : [],
      contourImage:
        typeof map.contourImage === "string" ? map.contourImage : null,
      excludeBlue: map.excludeBlue !== false,
      visible: map.visible !== false,
      layers:
        map.id === activeMapId
          ? layers
          : Array.isArray(map.layers) && map.layers.length > 0
            ? map.layers
            : [createLayer("标注图层")],
      objects:
        map.id === activeMapId
          ? project.objects
          : Array.isArray(map.objects)
            ? map.objects
            : [],
    })),
    activeMapId,
    layers,
    background: activeMap
      ? {
          dataUrl: activeMap.dataUrl,
          opacity: activeMap.opacity,
          grayscale: activeMap.grayscale,
          contrast: activeMap.contrast,
          brightness: activeMap.brightness,
          blur: normalizeBackgroundNumber(activeMap.blur, 0),
          noise: normalizeBackgroundNumber(activeMap.noise, 0),
          contourEnabled: activeMap.contourEnabled === true,
          contourLevels: normalizeContourLevels(activeMap.contourLevels),
          contourOpacity: normalizeBackgroundNumber(
            activeMap.contourOpacity,
            0.35,
          ),
          contourPaths: Array.isArray(activeMap.contourPaths)
            ? activeMap.contourPaths
            : [],
          contourImage:
            typeof activeMap.contourImage === "string"
              ? activeMap.contourImage
              : null,
          excludeBlue: activeMap.excludeBlue !== false,
        }
      : {
          ...project.background,
          blur: normalizeBackgroundNumber(project.background.blur, 0),
          noise: normalizeBackgroundNumber(project.background.noise, 0),
          contourEnabled: project.background.contourEnabled === true,
          contourLevels: normalizeContourLevels(
            project.background.contourLevels,
          ),
          contourOpacity: normalizeBackgroundNumber(
            project.background.contourOpacity,
            0.35,
          ),
          contourPaths: Array.isArray(project.background.contourPaths)
            ? project.background.contourPaths
            : [],
          contourImage:
            typeof project.background.contourImage === "string"
              ? project.background.contourImage
              : null,
          excludeBlue: project.background.excludeBlue !== false,
        },
    customAssets: Array.isArray(project.customAssets)
      ? project.customAssets
      : [],
    savedGraphics: Array.isArray(project.savedGraphics)
      ? project.savedGraphics
      : [],
    objects: project.objects.map((object) => {
      if (object.type === "marker") {
        const next = structuredClone(object);
        let source =
          next.artworkSource ??
          (next.artwork ? artworkSourceFor(next.artwork) : "psd");
        if ((next.artwork as string) === "hostile-nest") {
          source = "custom";
          next.artwork = "custom-nest";
          next.artworkSource = source;
        }
        const affiliation = UNIT_TINTS.includes(next.affiliation)
          ? next.affiliation
          : affiliationForSymbol(next.symbol);
        next.affiliation = affiliation;
        next.artworkSource = source;
        if (source === "nato") {
          next.affiliation =
            affiliation === "hostile" ? "hostile" : "friendly";
          next.artwork = isNatoArtwork(next.artwork)
            ? next.artwork
            : defaultNatoArtworkForSymbol(next.symbol);
        } else if (source === "flag") {
          next.affiliation =
            affiliation === "hostile" ? "hostile" : "friendly";
          next.artwork = isFlagArtwork(next.artwork)
            ? next.artwork
            : defaultFlagArtwork();
          next.label = typeof next.label === "string" ? next.label : "";
        } else if (source === "custom") {
          next.artwork = isCustomArtwork(next.artwork)
            ? next.artwork
            : "custom-nest";
        } else {
          next.artwork = isPsdArtwork(next.artwork)
            ? next.artwork
            : defaultArtworkForSymbol(next.symbol, affiliation);
        }
        next.opacity = Math.min(
          1,
          Math.max(0, typeof next.opacity === "number" ? next.opacity : 1),
        );
        next.strokeEnabled = next.strokeEnabled !== false;
        next.strokeWidth = Math.min(
          16,
          Math.max(
            0,
            typeof next.strokeWidth === "number" ? next.strokeWidth : 2,
          ),
        );
        next.scaleX = normalizeScale(next.scaleX);
        next.scaleY = normalizeScale(next.scaleY);
        next.flipX = next.flipX === true;
        next.flipY = next.flipY === true;
        next.flagAttachment = normalizeFlagAttachment(next.flagAttachment);
        return next;
      }

      if (object.type === "region") {
        const next = structuredClone(object);
        next.closed = next.closed !== false;
        next.geometryLocked = next.geometryLocked === true;
        next.shapePreset = ["rectangle", "ellipse", "diamond"].includes(
          next.shapePreset,
        )
          ? next.shapePreset
          : "custom";
        next.lineStyle = ["dashed", "dotted"].includes(next.lineStyle)
          ? next.lineStyle
          : "solid";
        next.lineDashCount = Math.min(
          80,
          Math.max(
            4,
            Number.isFinite(next.lineDashCount)
              ? Math.round(next.lineDashCount)
              : 24,
          ),
        );
        next.fill = next.stroke;
        return next;
      }

      if (object.type === "text") {
        const next = structuredClone(object);
        next.scaleX = normalizeScale(next.scaleX);
        next.scaleY = normalizeScale(next.scaleY);
        next.flipX = next.flipX === true;
        next.flipY = next.flipY === true;
        next.strokeEnabled = next.strokeEnabled !== false;
        next.fontFamily =
          typeof next.fontFamily === "string" &&
          next.fontFamily.trim().length > 0
            ? next.fontFamily
            : "Microsoft YaHei";
        return next;
      }

      if (object.type !== "arrow" && object.type !== "freehand") {
        return object;
      }

      const next = structuredClone(object);
      const baseWidth =
        next.type === "arrow" ? next.width : next.strokeWidth;
      next.startWidth = normalizeStrokeWidth(next.startWidth, baseWidth);
      next.endWidth = normalizeStrokeWidth(next.endWidth, baseWidth);
      if (next.type === "arrow") {
        next.headSize = Math.min(
          160,
          Math.max(
            0,
            typeof next.headSize === "number" ? next.headSize : 34,
          ),
        );
        next.headStyle = ["triangle", "chevron", "spear"].includes(
          next.headStyle,
        )
          ? next.headStyle
          : "psd";
        next.points =
          next.points?.length >= 2
            ? next.points
            : [next.start, next.end];
        next.tint = UNIT_TINTS.includes(next.tint)
          ? next.tint
          : next.color === "#92cf00"
            ? "friendly"
            : next.color === "#9b351f"
              ? "hostile"
              : "objective";
        next.pathMode =
          next.pathMode === "sharp" ? "sharp" : "smooth";
      }
      if (!isLineStyle(next.lineStyle)) {
        next.lineStyle =
          next.type === "arrow" && next.dashed ? "dashed" : "solid";
      }
      next.lineDashCount = Math.min(
        80,
        Math.max(
          4,
          Number.isFinite(next.lineDashCount)
            ? Math.round(next.lineDashCount)
            : 18,
        ),
      );
      if (next.type === "arrow") {
        next.headSize = Math.min(
          160,
          Math.max(
            0,
            typeof next.headSize === "number" ? next.headSize : 34,
          ),
        );
      }
      return next;
    }),
  };
  validated.maps = validated.maps.map((map) =>
    map.id === validated.activeMapId
      ? {
          ...map,
          layers: structuredClone(validated.layers),
          objects: structuredClone(validated.objects),
        }
      : map,
  );
  return validated;
}

export async function saveProject(project: AtlasProject): Promise<void> {
  const snapshot = syncActiveMapState(structuredClone(project));
  await withStore("readwrite", async (store) => {
    await requestResult(store.put(snapshot, CURRENT_KEY));
  });
}

export async function loadProject(): Promise<AtlasProject | null> {
  const value = await withStore("readonly", async (store) =>
    requestResult(store.get(CURRENT_KEY)),
  );
  if (value === undefined) return null;
  return validateProject(value);
}

export async function clearProject(): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestResult(store.delete(CURRENT_KEY));
  });
}

export function parseProjectFile(text: string): AtlasProject {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("项目文件格式无效");
  }

  return validateProject(value);
}

export function serializeProject(project: AtlasProject): string {
  return JSON.stringify(
    syncActiveMapState(structuredClone(project)),
    null,
    2,
  );
}
