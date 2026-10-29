const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateImageFile(file: File): void {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("请选择 PNG、JPG 或 WebP 文件");
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取这个文件"));
    reader.readAsDataURL(file);
  });
}

export function readImageSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    image.onerror = () => reject(new Error("无法解析这张图片"));
    image.src = dataUrl;
  });
}
