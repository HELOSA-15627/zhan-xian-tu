type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SegmentPoint = {
  x: number;
  y: number;
};

export function isBlueWaterPixel(
  red: number,
  green: number,
  blue: number,
  alpha = 255,
): boolean {
  if (alpha < 16) return false;
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const saturation = max <= 0 ? 0 : delta / max;
  if (saturation < 0.18 || max < 0.15) return false;

  let hue = 0;
  if (delta > Number.EPSILON) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return hue >= 185 && hue <= 258;
}

function interpolate(
  a: number,
  b: number,
  threshold: number,
): number {
  const delta = b - a;
  if (Math.abs(delta) < Number.EPSILON) return 0.5;
  return Math.min(1, Math.max(0, (threshold - a) / delta));
}

function buildSegments(
  luminance: number[][],
  threshold: number,
  rect: Rect,
  waterMask?: boolean[][],
): string[] {
  const rows = luminance.length;
  const columns = luminance[0]?.length ?? 0;
  if (rows < 2 || columns < 2) return [];
  const cellWidth = rect.width / (columns - 1);
  const cellHeight = rect.height / (rows - 1);
  const segments: string[] = [];

  const mapPoint = (point: SegmentPoint): SegmentPoint => ({
    x: rect.x + point.x * cellWidth,
    y: rect.y + point.y * cellHeight,
  });

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      if (
        waterMask &&
        (waterMask[row]?.[column] ||
          waterMask[row]?.[column + 1] ||
          waterMask[row + 1]?.[column] ||
          waterMask[row + 1]?.[column + 1])
      ) {
        continue;
      }
      const a = luminance[row][column];
      const b = luminance[row][column + 1];
      const c = luminance[row + 1][column + 1];
      const d = luminance[row + 1][column];
      const points: SegmentPoint[] = [];

      if ((a < threshold) !== (b < threshold)) {
        points.push({
          x: column + interpolate(a, b, threshold),
          y: row,
        });
      }
      if ((b < threshold) !== (c < threshold)) {
        points.push({
          x: column + 1,
          y: row + interpolate(b, c, threshold),
        });
      }
      if ((d < threshold) !== (c < threshold)) {
        points.push({
          x: column + interpolate(d, c, threshold),
          y: row + 1,
        });
      }
      if ((a < threshold) !== (d < threshold)) {
        points.push({
          x: column,
          y: row + interpolate(a, d, threshold),
        });
      }

      if (points.length < 2) continue;
      const pairs =
        points.length === 2
          ? [[points[0], points[1]]]
          : [
              [points[0], points[1]],
              [points[2], points[3]],
            ];
      for (const [start, end] of pairs) {
        const from = mapPoint(start);
        const to = mapPoint(end);
        segments.push(
          `M${from.x.toFixed(2)} ${from.y.toFixed(2)} L${to.x.toFixed(
            2,
          )} ${to.y.toFixed(2)}`,
        );
      }
    }
  }
  return segments;
}

export function buildLuminanceContours(
  luminance: number[][],
  levelCount: number,
  rect: Rect,
  waterMask?: boolean[][],
): string[][] {
  const levels = Math.min(24, Math.max(3, Math.round(levelCount)));
  return Array.from({ length: levels }, (_, index) =>
    buildSegments(
      luminance,
      (index + 1) / (levels + 1),
      rect,
      waterMask,
    ),
  );
}

async function imageToLuminance(
  dataUrl: string,
  maxDimension = 320,
): Promise<{
  luminance: number[][];
  waterMask: boolean[][];
  width: number;
  height: number;
}> {
  const image = new Image();
  image.decoding = "async";
  image.src = dataUrl;
  await image.decode();
  const ratio = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(2, Math.round(image.naturalWidth * ratio));
  const height = Math.max(2, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法创建等高线采样画布");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance: number[][] = [];
  const waterMask: boolean[][] = [];

  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    const waterRow: boolean[] = [];
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3] / 255;
      const red = (pixels[offset] / 255) * alpha + (1 - alpha);
      const green = (pixels[offset + 1] / 255) * alpha + (1 - alpha);
      const blue = (pixels[offset + 2] / 255) * alpha + (1 - alpha);
      row.push(
        Math.min(
          1,
          Math.max(0, red * 0.2126 + green * 0.7152 + blue * 0.0722),
        ),
      );
      waterRow.push(
        isBlueWaterPixel(
          pixels[offset],
          pixels[offset + 1],
          pixels[offset + 2],
          pixels[offset + 3],
        ),
      );
    }
    luminance.push(row);
    waterMask.push(waterRow);
  }
  return {
    luminance,
    waterMask: dilateMask(waterMask),
    width,
    height,
  };
}

function dilateMask(mask: boolean[][]): boolean[][] {
  const rows = mask.length;
  const columns = mask[0]?.length ?? 0;
  return mask.map((row, y) =>
    row.map(
      (value, x) =>
        value ||
        mask[y - 1]?.[x] ||
        mask[y + 1]?.[x] ||
        row[x - 1] ||
        row[x + 1],
    ),
  );
}

function renderContourRaster(
  paths: string[],
  rect: Rect,
): string | null {
  if (typeof document === "undefined" || paths.length === 0) return null;
  const maxDimension = 2048;
  const ratio = Math.min(
    1,
    maxDimension / Math.max(rect.width, rect.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(ratio, ratio);
  context.strokeStyle = "#1f2430";
  context.lineWidth = 1 / ratio;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const path of paths) {
    context.stroke(new Path2D(path));
  }
  return canvas.toDataURL("image/png");
}

export async function generateContourPathsFromImage(
  dataUrl: string,
  levelCount: number,
  rect: Rect,
  options: { excludeBlue?: boolean } = {},
): Promise<{
  paths: string[];
  rasterImage: string | null;
  sampleWidth: number;
  sampleHeight: number;
}> {
  const { luminance, waterMask, width, height } =
    await imageToLuminance(dataUrl);
  const paths = buildLuminanceContours(
    luminance,
    levelCount,
    rect,
    options.excludeBlue === false ? undefined : waterMask,
  ).flat();
  return {
    paths,
    rasterImage: renderContourRaster(paths, rect),
    sampleWidth: width,
    sampleHeight: height,
  };
}
