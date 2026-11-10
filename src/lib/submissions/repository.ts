import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Answers } from "@/features/forms/types";
import type { VerifiedFile } from "./verify-attachments";

export type NewSubmission = {
  id: string;
  formSlug: string;
  formVersion: number;
  stationSlug: string;
  answers: Answers;
  attachments: (VerifiedFile & { fieldKey: string })[];
};

/**
 * Guarda el envío y sus adjuntos en una sola transacción (función SQL `create_submission`).
 * Es idempotente por `id`: devuelve el mismo código de referencia si se reintenta.
 */
export async function createSubmission(
  supabase: SupabaseClient,
  submission: NewSubmission,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_submission", {
    p_id: submission.id,
    p_form_slug: submission.formSlug,
    p_form_version: submission.formVersion,
    p_station_slug: submission.stationSlug,
    p_answers: submission.answers,
    p_attachments: submission.attachments.map((file) => ({
      field_key: file.fieldKey,
      storage_path: file.path,
      mime_type: file.contentType,
      size_bytes: file.size,
    })),
  });

  if (error) throw error;
  if (typeof data !== "string")
    throw new Error("create_submission devolvió una respuesta inesperada.");
  return data;
}
