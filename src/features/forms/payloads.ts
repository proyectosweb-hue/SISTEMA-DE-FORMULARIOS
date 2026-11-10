import { z } from "zod";
import { STATION_SLUGS } from "@/config/stations";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_ATTACHMENTS_PER_SUBMISSION,
  MAX_FILES_PER_UPLOAD_REQUEST,
  MAX_UPLOAD_BYTES,
} from "@/lib/uploads/constants";

const submissionId = z.uuid();
const formSlug = z.string().min(1).max(80);
const stationSlug = z.enum(STATION_SLUGS);
const fieldKey = z.string().min(1).max(64);

/** Petición del navegador para obtener URLs firmadas de subida de fotos. */
export const uploadRequestSchema = z.strictObject({
  submissionId,
  formSlug,
  stationSlug,
  fieldKey,
  files: z
    .array(
      z.strictObject({
        contentType: z.enum(ALLOWED_IMAGE_TYPES),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .min(1)
    .max(MAX_FILES_PER_UPLOAD_REQUEST),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/** Petición del navegador para guardar un formulario ya completado. */
export const submissionRequestSchema = z.strictObject({
  submissionId,
  formSlug,
  stationSlug,
  /** Se valida después con el esquema específico del formulario. */
  answers: z.record(z.string(), z.unknown()),
  attachments: z
    .array(
      z.strictObject({
        fieldKey,
        path: z.string().min(1).max(300),
      }),
    )
    .max(MAX_ATTACHMENTS_PER_SUBMISSION),
  /** Señuelo anti-bots: las personas nunca lo ven ni lo completan. */
  website: z.string().max(200).optional(),
});
export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;

/** Respuesta de POST /api/uploads. */
export type UploadResponse = {
  uploads: { path: string; token: string }[];
};

/** Respuesta de POST /api/submissions. */
export type SubmissionResponse = {
  referenceCode: string;
};

/** Formato de los errores de la API. */
export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};
