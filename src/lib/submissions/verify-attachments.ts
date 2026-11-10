import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedImageType,
} from "@/lib/uploads/constants";

type Storage = ReturnType<SupabaseClient["storage"]["from"]>;

export type VerifiedFile = { path: string; size: number; contentType: AllowedImageType };

export type VerifyResult =
  | { ok: true; files: VerifiedFile[] }
  | { ok: false; code: "attachment_missing" | "attachment_invalid" };

const isAllowedType = (value: unknown): value is AllowedImageType =>
  (ALLOWED_IMAGE_TYPES as readonly unknown[]).includes(value);

/**
 * Comprueba en Storage que cada foto declarada por el navegador existe de verdad y cumple
 * los límites de tipo y tamaño. El servidor NO confía en lo que diga el cliente: los datos
 * (tamaño y tipo) que se guardan salen de Storage, no de la petición.
 *
 * Lanza el error original ante fallos que no sean "archivo no encontrado" (p. ej. Storage
 * caído) para que se responda 5xx en lugar de culpar al usuario.
 */
export async function verifyAttachments(
  storage: Storage,
  paths: string[],
): Promise<VerifyResult> {
  const results = await Promise.all(
    paths.map(async (path) => ({ path, info: await storage.info(path) })),
  );

  const files: VerifiedFile[] = [];
  const rejected: string[] = [];

  for (const { path, info } of results) {
    if (info.error) {
      const status = (info.error as { status?: number }).status;
      if (status === 400 || status === 404)
        return { ok: false, code: "attachment_missing" };
      throw info.error;
    }
    const { size, contentType } = info.data;
    if (!size || size > MAX_UPLOAD_BYTES || !isAllowedType(contentType)) {
      rejected.push(path);
      continue;
    }
    files.push({ path, size, contentType });
  }

  if (rejected.length > 0) {
    // Mejor esfuerzo: no dejar archivos inválidos en el bucket.
    await storage.remove(rejected).catch(() => undefined);
    return { ok: false, code: "attachment_invalid" };
  }
  return { ok: true, files };
}
