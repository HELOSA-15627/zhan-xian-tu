import type {
  AtlasProject,
  Layer,
  SceneObject,
} from "../model/types";

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
    !Array.isArray(value.layers) ||
    !value.layers.every(isLayer) ||
    !Array.isArray(value.objects) ||
    !value.objects.every(isSceneObject)
  ) {
    throw new Error("项目文件格式无效");
  }

  return value as AtlasProject;
}

export async function saveProject(project: AtlasProject): Promise<void> {
  const snapshot = structuredClone(project);
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
  return JSON.stringify(project, null, 2);
}
