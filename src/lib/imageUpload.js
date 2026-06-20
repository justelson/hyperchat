const DEFAULT_MAX_SIDE = 640;
const DEFAULT_QUALITY = 0.82;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

const createImageFromFile = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("Could not read that image"));
  };
  img.src = url;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

const safeImageName = (name = "avatar") => {
  const base = String(name).replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "avatar";
  return `${base}.webp`;
};

export async function compressAvatarImage(file, options = {}) {
  if (!file || !file.type?.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Choose an image under 12 MB");

  const maxSide = options.maxSide || DEFAULT_MAX_SIDE;
  const quality = options.quality || DEFAULT_QUALITY;
  const source = typeof createImageBitmap === "function"
    ? await createImageBitmap(file, { imageOrientation: "from-image" })
    : await createImageFromFile(file);

  const sourceWidth = source.width || source.naturalWidth || 1;
  const sourceHeight = source.height || source.naturalHeight || 1;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not prepare avatar image");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  if (typeof source.close === "function") source.close();

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob) blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("Could not compress avatar image");

  if (blob.size > 420 * 1024) {
    const smaller = document.createElement("canvas");
    const smallerScale = Math.min(1, 512 / Math.max(width, height));
    smaller.width = Math.max(1, Math.round(width * smallerScale));
    smaller.height = Math.max(1, Math.round(height * smallerScale));
    const smallerContext = smaller.getContext("2d", { alpha: false });
    if (!smallerContext) throw new Error("Could not prepare avatar image");
    smallerContext.imageSmoothingEnabled = true;
    smallerContext.imageSmoothingQuality = "high";
    smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    blob = await canvasToBlob(smaller, "image/webp", 0.72) || blob;
  }

  const compressedFile = new File([blob], safeImageName(file.name), {
    type: blob.type || "image/webp",
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    size: compressedFile.size,
  };
}
