/** Bucket privado de Supabase Storage donde se guardan las evidencias fotográficas. */
export const EVIDENCE_BUCKET = "evidencias";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const IMAGE_EXTENSION: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Tamaño máximo de cada foto YA comprimida. El navegador reduce las fotos del celular
 * (normalmente a menos de 1 MB); este tope es una defensa en servidor y en el bucket.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Fotos que se pueden pedir firmar en una sola petición. */
export const MAX_FILES_PER_UPLOAD_REQUEST = 10;

/** Total de fotos adjuntas permitido en un único envío. */
export const MAX_ATTACHMENTS_PER_SUBMISSION = 20;
