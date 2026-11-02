export type BasemapFilterSettings = {
  grayscale: number;
  contrast: number;
  brightness: number;
  blur: number;
  noise?: number;
};

const PROCESSED_CACHE_LIMIT = 8;
const NOISE_TILE_SIZE = 96;
type ProcessedImageEntry = {
  url: string;
  references: number;
};

const processedImages = new Map<string, ProcessedImageEntry>();
let noiseTileDataUrl: string | null = null;

function isJsdomEnvironment(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /jsdom/i.test(navigator.userAgent)
  );
}

export function buildBasemapCssFilter(
  settings: BasemapFilterSettings,
): string | undefined {
  const parts: string[] = [];
  if (settings.grayscale !== 0) {
    parts.push(`grayscale(${settings.grayscale}%)`);
  }
  if (settings.contrast !== 1) {
    parts.push(`contrast(${settings.contrast})`);
  }
  if (settings.brightness !== 1) {
    parts.push(`brightness(${settings.brightness})`);
  }
  if (settings.blur > 0) {
    parts.push(`blur(${settings.blur}px)`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function hasBasemapEffects(
  settings: BasemapFilterSettings,
): boolean {
  return (
    buildBasemapCssFilter(settings) !== undefined ||
    (settings.noise ?? 0) > 0
  );
}

function cacheProcessedImage(key: string, value: string): void {
  processedImages.set(key, {
    url: value,
    references: 1,
  });
  while (processedImages.size > PROCESSED_CACHE_LIMIT) {
    const evictable = Array.from(processedImages.entries()).find(
      ([, entry]) => entry.references === 0,
    );
    if (!evictable) break;
    const [oldestKey, oldestEntry] = evictable;
    if (oldestEntry.url.startsWith("blob:")) {
      URL.revokeObjectURL(oldestEntry.url);
    }
    processedImages.delete(oldestKey);
  }
}

export function releaseBasemapImage(url: string): void {
  for (const entry of processedImages.values()) {
    if (entry.url !== url) continue;
    entry.references = Math.max(0, entry.references - 1);
    return;
  }
}

function createNoiseCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (isJsdomEnvironment()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = NOISE_TILE_SIZE;
  canvas.height = NOISE_TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const imageData = context.createImageData(
    NOISE_TILE_SIZE,
    NOISE_TILE_SIZE,
  );
  let seed = 0x5f3759df;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let index = 0; index < imageData.data.length; index += 4) {
    const value = Math.round(random() * 255);
    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(
        blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png"),
      );
    }, "image/png");
  });
}

export async function processBasemapImage(
  dataUrl: string,
  settings: BasemapFilterSettings,
): Promise<string> {
  if (typeof document === "undefined" || isJsdomEnvironment()) {
    return dataUrl;
  }
  const filter = buildBasemapCssFilter(settings);
  const noise = Math.max(0, Math.min(1, settings.noise ?? 0));
  if (!filter && noise === 0) return dataUrl;
  const key = `${filter ?? "none"}|${noise}|${dataUrl}`;
  const cached = processedImages.get(key);
  if (cached) {
    cached.references += 1;
    processedImages.delete(key);
    processedImages.set(key, cached);
    return cached.url;
  }

  const image = new Image();
  image.decoding = "async";
  image.src = dataUrl;
  await image.decode();
  const maxDimension = 2400;
  const ratio = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  if (filter) {
    context.filter = buildBasemapCssFilter({
      ...settings,
      blur: settings.blur * ratio,
    }) ?? "none";
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (noise > 0) {
    const noiseCanvas = createNoiseCanvas();
    const pattern =
      noiseCanvas && context.createPattern(noiseCanvas, "repeat");
    if (pattern) {
      context.save();
      context.globalAlpha = noise;
      context.globalCompositeOperation = "soft-light";
      context.scale(ratio, ratio);
      context.fillStyle = pattern;
      context.fillRect(
        0,
        0,
        canvas.width / ratio,
        canvas.height / ratio,
      );
      context.restore();
    }
  }
  const processed = await canvasToObjectUrl(canvas);
  cacheProcessedImage(key, processed);
  return processed;
}

function createNoiseTile(): string | null {
  return createNoiseCanvas()?.toDataURL("image/png") ?? null;
}

export function basemapNoiseTileDataUrl(): string {
  noiseTileDataUrl ??= createNoiseTile();
  return noiseTileDataUrl ?? "";
}
