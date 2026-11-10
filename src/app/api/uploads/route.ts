import { getPhotoFields, photoLimits } from "@/features/forms/photos";
import { uploadRequestSchema, type UploadResponse } from "@/features/forms/payloads";
import { getForm } from "@/features/forms/registry";
import {
  apiError,
  clientIp,
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
} from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { EVIDENCE_BUCKET } from "@/lib/uploads/constants";
import { buildEvidencePath } from "@/lib/uploads/paths";

/**
 * POST /api/uploads
 *
 * Valida la solicitud y entrega una URL firmada de subida POR CADA foto, de modo que el
 * navegador sube la imagen directamente a Supabase Storage (las funciones de Vercel limitan
 * el cuerpo de la petición a ~4,5 MB). Cada URL sirve para un único archivo, con un nombre
 * generado aquí, y no permite sobrescribir.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(`uploads:${clientIp(request)}`, {
    limit: 60,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) {
    return apiError(
      429,
      "rate_limited",
      "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
      {
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = uploadRequestSchema.safeParse(body.data);
  if (!parsed.success)
    return apiError(400, "invalid_request", "La solicitud no es válida.");
  const { submissionId, formSlug, stationSlug, fieldKey, files } = parsed.data;

  const form = getForm(formSlug);
  if (!form) return apiError(404, "form_not_found", "El formulario no existe.");

  const field = getPhotoFields(form).find((f) => f.key === fieldKey);
  if (!field) return apiError(400, "invalid_field", "Este campo no admite fotografías.");

  const { max } = photoLimits(field);
  if (files.length > max) {
    return apiError(
      400,
      "too_many_files",
      `Puedes adjuntar como máximo ${max} fotos en este campo.`,
    );
  }

  try {
    const storage = getSupabaseAdmin().storage.from(EVIDENCE_BUCKET);
    const uploads = await Promise.all(
      files.map(async (file) => {
        const path = buildEvidencePath({
          stationSlug,
          submissionId,
          type: file.contentType,
        });
        const { data, error } = await storage.createSignedUploadUrl(path);
        if (error) throw error;
        return { path: data.path, token: data.token };
      }),
    );
    return jsonResponse({ uploads } satisfies UploadResponse);
  } catch (error) {
    return serverErrorResponse("api/uploads", error);
  }
}
