import { StorageClient } from "@supabase/storage-js";
import type { StationSlug } from "@/config/stations";
import type { UploadRequest, UploadResponse } from "@/features/forms/payloads";
import { ApiRequestError, postJson } from "@/lib/api-client";
import { EVIDENCE_BUCKET, type AllowedImageType } from "./constants";

/**
 * Cliente de Storage para el NAVEGADOR. Usa solo la clave PUBLICABLE (pública por diseño):
 * no puede leer ni escribir nada por sí sola; únicamente ejecuta subidas autorizadas con el
 * token firmado que emite el servidor para cada archivo.
 */
function getStorage(): StorageClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new ApiRequestError(
      "El servicio de fotografías no está configurado todavía.",
      "storage_not_configured",
      503,
    );
  }
  // Las claves nuevas (sb_publishable_...) no son JWT y solo van en `apikey`.
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return new StorageClient(`${url}/storage/v1`, headers);
}

export type PhotoUploadInput = {
  submissionId: string;
  formSlug: string;
  stationSlug: StationSlug;
  fieldKey: string;
  blobs: Blob[];
};

/**
 * Sube las fotos y devuelve sus rutas en el mismo orden:
 *   1) pide al servidor una URL firmada por foto (/api/uploads, que valida todo);
 *   2) sube cada foto directamente a Supabase Storage, sin pasar por Vercel.
 */
export async function uploadPhotos(input: PhotoUploadInput): Promise<string[]> {
  const request: UploadRequest = {
    submissionId: input.submissionId,
    formSlug: input.formSlug,
    stationSlug: input.stationSlug,
    fieldKey: input.fieldKey,
    files: input.blobs.map((blob) => ({
      contentType: blob.type as AllowedImageType,
      size: blob.size,
    })),
  };

  const { uploads } = await postJson<UploadResponse>("/api/uploads", request);
  if (uploads.length !== input.blobs.length) {
    throw new ApiRequestError(
      "Respuesta inesperada del servidor.",
      "bad_upload_response",
      502,
    );
  }

  const bucket = getStorage().from(EVIDENCE_BUCKET);
  const paths: string[] = [];
  for (const [index, blob] of input.blobs.entries()) {
    const upload = uploads[index]!;
    let failure: string | undefined;
    try {
      const { error } = await bucket.uploadToSignedUrl(upload.path, upload.token, blob, {
        contentType: blob.type,
        cacheControl: "31536000",
      });
      if (error) failure = error.message;
    } catch {
      failure = "network";
    }
    if (failure) {
      throw new ApiRequestError(
        "No se pudo subir una fotografía. Revisa tu señal e inténtalo de nuevo.",
        "upload_failed",
        0,
      );
    }
    paths.push(upload.path);
  }
  return paths;
}
