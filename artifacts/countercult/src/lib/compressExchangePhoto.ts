const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("could not compress photo"))),
      "image/webp",
      quality,
    );
  });
}

export async function compressExchangePhoto(file: File): Promise<File> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("photo must be under 20 MB before compression");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= MAX_OUTPUT_BYTES) return file;
    throw new Error("this photo format could not be compressed; try a JPEG, PNG, or WebP photo");
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("could not prepare photo for compression");

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let compressed = await canvasToBlob(canvas, 0.82);
    if (compressed.type !== "image/webp") {
      if (file.size <= MAX_OUTPUT_BYTES) return file;
      throw new Error("this browser cannot compress the photo to a smaller format");
    }
    if (compressed.size > MAX_OUTPUT_BYTES) {
      compressed = await canvasToBlob(canvas, 0.68);
    }
    if (compressed.size > MAX_OUTPUT_BYTES) {
      throw new Error("photo is still over 2 MB after compression");
    }
    if (compressed.size >= file.size && file.size <= MAX_OUTPUT_BYTES) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "exchange-photo";
    return new File([compressed], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
