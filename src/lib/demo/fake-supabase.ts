import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isStationSlug } from "@/config/stations";
import { EVIDENCE_BUCKET } from "@/lib/uploads/constants";
import { getDemoStore, setBounded, type DemoSubmission } from "./store";

type StorageResult<T> =
  { data: T; error: null } | { data: null; error: Error & { status?: number } };

const notFound = () => Object.assign(new Error("Object not found"), { status: 400 });

/**
 * Cliente de Supabase SIMULADO en memoria. Implementa únicamente lo que usa la aplicación
 * (firmar subidas, consultar/eliminar archivos y la función `create_submission`) con el mismo
 * comportamiento observable: un envío es idempotente por `id` y devuelve el mismo código.
 *
 * No se conecta a nada: sirve para probar la interfaz sin servicios reales.
 */
export function createDemoSupabase(): SupabaseClient {
  const store = getDemoStore();

  const bucket = (name: string) => {
    if (name !== EVIDENCE_BUCKET)
      throw new Error(`Bucket no existe en la demostración: ${name}`);
    return {
      async createSignedUploadUrl(
        path: string,
      ): Promise<StorageResult<{ signedUrl: string; token: string; path: string }>> {
        const token = crypto.randomUUID();
        setBounded(store.tokens, token, path);
        return {
          data: {
            signedUrl: `/api/demo/${EVIDENCE_BUCKET}/${path}?token=${token}`,
            token,
            path,
          },
          error: null,
        };
      },
      async info(
        path: string,
      ): Promise<StorageResult<{ size: number; contentType: string }>> {
        const file = store.files.get(path);
        return file
          ? { data: { ...file }, error: null }
          : { data: null, error: notFound() };
      },
      async remove(paths: string[]) {
        for (const path of paths) store.files.delete(path);
        return { data: [], error: null };
      },
    };
  };

  async function rpc(fn: string, args: Record<string, unknown>) {
    if (fn !== "create_submission") {
      return {
        data: null,
        error: new Error(`Función no disponible en la demostración: ${fn}`),
      };
    }
    const id = String(args.p_id);
    const existing = store.submissions.get(id);
    if (existing) return { data: existing.referenceCode, error: null };

    if (!isStationSlug(args.p_station_slug)) {
      return {
        data: null,
        error: new Error("Estación inexistente (violación de clave foránea)."),
      };
    }

    const submission: DemoSubmission = {
      id,
      referenceCode: `JG-${id.slice(0, 8).toUpperCase()}`,
      formSlug: String(args.p_form_slug),
      formVersion: Number(args.p_form_version),
      stationSlug: args.p_station_slug,
      answers: args.p_answers,
      attachments: (args.p_attachments ?? []) as DemoSubmission["attachments"],
      createdAt: new Date().toISOString(),
    };
    setBounded(store.submissions, id, submission);
    return { data: submission.referenceCode, error: null };
  }

  return { storage: { from: bucket }, rpc } as unknown as SupabaseClient;
}
