import { MAX_UPLOAD_BYTES } from "@/lib/uploads/constants";

/** Lado mayor máximo de la foto ya procesada, en píxeles. */
export const MAX_IMAGE_DIMENSION = 1920;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.5;

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

/** Reduce proporcionalmente para que el lado mayor no pase de `max` (nunca agranda). */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_IMAGE_DIMENSION,
) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: Blob): Promise<Decoded> {
  // 1) createImageBitmap respetando la orientación EXIF (fotos tomadas en vertical).
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    // Algunos navegadores no aceptan esa opción: se prueba con un <img>.
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageProcessingError(
      "No pudimos leer esta imagen. Prueba con otra foto en formato JPG o PNG.",
    );
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new ImageProcessingError("No pudimos procesar la foto.")),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Prepara una foto para subirla: la reduce, corrige su orientación y la convierte a JPEG.
 *
 *  - Ahorra datos móviles (una foto de varios MB queda normalmente por debajo de 1 MB).
 *  - Normaliza formatos del celular (p. ej. HEIC en iPhone) a JPEG.
 *  - Al redibujarla se eliminan los metadatos EXIF, incluida la ubicación GPS (privacidad).
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const decoded = await decode(file);
  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context)
      throw new ImageProcessingError("Tu navegador no pudo procesar la foto.");
    // Fondo blanco: los PNG con transparencia no deben quedar negros al pasar a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);

    let quality = START_QUALITY;
    let blob = await toBlob(canvas, quality);
    while (blob.size > MAX_UPLOAD_BYTES && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
      blob = await toBlob(canvas, quality);
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ImageProcessingError("La foto es demasiado pesada. Prueba con otra.");
    }
    return blob;
  } finally {
    decoded.release();
  }
}
