import { buildAnswersSchema } from "@/features/forms/schema";
import { getPhotoFields, validatePhotoCounts } from "@/features/forms/photos";
import {
  submissionRequestSchema,
  type SubmissionResponse,
} from "@/features/forms/payloads";
import { getForm } from "@/features/forms/registry";
import type { Answers } from "@/features/forms/types";
import {
  apiError,
  clientIp,
  fieldErrors,
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
} from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSubmission } from "@/lib/submissions/repository";
import { verifyAttachments } from "@/lib/submissions/verify-attachments";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { EVIDENCE_BUCKET } from "@/lib/uploads/constants";
import { isEvidencePathFor } from "@/lib/uploads/paths";

/**
 * POST /api/submissions
 *
 * Guarda un formulario completado con sus fotografías. El servidor NO confía en el cliente:
 * vuelve a validar las respuestas con el esquema del formulario, comprueba que cada foto
 * pertenezca a esta estación y a este envío, y verifica en Storage que exista y cumpla los
 * límites antes de guardar nada.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(`submissions:${clientIp(request)}`, {
    limit: 40,
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

  const parsed = submissionRequestSchema.safeParse(body.data);
  if (!parsed.success)
    return apiError(400, "invalid_request", "La solicitud no es válida.");
  const { submissionId, formSlug, stationSlug, answers, attachments, website } =
    parsed.data;

  // Señuelo anti-bots: si está lleno, se simula éxito sin guardar nada.
  if (website && website.trim() !== "") {
    return jsonResponse(
      { referenceCode: "JG-00000000" } satisfies SubmissionResponse,
      201,
    );
  }

  const form = getForm(formSlug);
  if (!form) return apiError(404, "form_not_found", "El formulario no existe.");

  const answersResult = buildAnswersSchema(form).safeParse(answers);
  if (!answersResult.success) {
    return apiError(400, "invalid_answers", "Revisa los campos marcados.", {
      fields: fieldErrors(answersResult.error),
    });
  }

  const photoKeys = new Set(getPhotoFields(form).map((field) => field.key));
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  for (const attachment of attachments) {
    const valid =
      photoKeys.has(attachment.fieldKey) &&
      isEvidencePathFor(attachment.path, { stationSlug, submissionId }) &&
      !seen.has(attachment.path);
    if (!valid)
      return apiError(400, "invalid_attachment", "Hay una fotografía que no es válida.");
    seen.add(attachment.path);
    counts[attachment.fieldKey] = (counts[attachment.fieldKey] ?? 0) + 1;
  }

  const photoErrors = validatePhotoCounts(form, counts);
  if (Object.keys(photoErrors).length > 0) {
    return apiError(400, "invalid_photos", "Revisa las fotografías adjuntas.", {
      fields: photoErrors,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const verified = await verifyAttachments(
      supabase.storage.from(EVIDENCE_BUCKET),
      attachments.map((attachment) => attachment.path),
    );
    if (!verified.ok) {
      return apiError(
        400,
        verified.code,
        "Una fotografía no se subió completa. Vuelve a adjuntarla.",
      );
    }

    const fieldByPath = new Map(attachments.map((a) => [a.path, a.fieldKey]));
    const referenceCode = await createSubmission(supabase, {
      id: submissionId,
      formSlug: form.slug,
      formVersion: form.version,
      stationSlug,
      answers: answersResult.data as Answers,
      attachments: verified.files.map((file) => ({
        ...file,
        fieldKey: fieldByPath.get(file.path)!,
      })),
    });

    return jsonResponse({ referenceCode } satisfies SubmissionResponse, 201);
  } catch (error) {
    return serverErrorResponse("api/submissions", error);
  }
}
