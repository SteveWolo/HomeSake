/**
 * Client-side image optimization.
 *
 * Every image that goes through `compressImage` is re-encoded to WebP and
 * iteratively downscaled / re-qualitied until it fits the size budget
 * (200KB by default), without visible quality loss in normal use.
 */

export const MAX_UPLOAD_BYTES = 200 * 1024; // 200KB hard limit

export type CompressOptions = {
  maxBytes?: number;
  maxDimension?: number;
  initialQuality?: number;
};

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: CanvasImageSource }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, draw: bitmap };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image file."));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, draw: img };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed."))),
      "image/webp",
      quality,
    );
  });
}

/** Compress + convert any image file to a WebP File under `maxBytes`. */
export async function compressImage(
  file: File,
  { maxBytes = MAX_UPLOAD_BYTES, maxDimension = 2000, initialQuality = 0.82 }: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const { width, height, draw } = await loadBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression is not supported in this browser.");

  let scale = Math.min(1, maxDimension / Math.max(width, height));
  let quality = initialQuality;
  let best: Blob | null = null;

  // Up to 8 passes: drop quality first, then dimensions.
  for (let pass = 0; pass < 8; pass++) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(draw, 0, 0, canvas.width, canvas.height);

    const blob = await toBlob(canvas, quality);
    best = blob;
    if (blob.size <= maxBytes) break;

    if (quality > 0.5) quality -= 0.12;
    else scale *= 0.8;
  }

  if (!best) throw new Error("Image compression failed.");
  if (best.size > maxBytes) {
    throw new Error("That image is too large to optimize below 200KB — try a smaller one.");
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([best], `${name}.webp`, { type: "image/webp" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
