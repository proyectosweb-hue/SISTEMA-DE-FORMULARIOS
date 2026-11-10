import "server-only";
import type { z } from "zod";
import { ConfigError } from "@/lib/env";
import type { ApiErrorBody } from "@/features/forms/payloads";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  options: { fields?: Record<string, string>; headers?: Record<string, string> } = {},
): Response {
  const body: ApiErrorBody = { error: { code, message, fields: options.fields } };
  return Response.json(body, { status, headers: { ...NO_STORE, ...options.headers } });
}

/**
 * IP del cliente. En Vercel, `x-forwarded-for` lo establece la plataforma; fuera de ella
 * (o detrás de otro proxy) este valor no es confiable y el límite de peticiones sería débil.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "desconocida";
}

export const MAX_JSON_BODY_BYTES = 64 * 1024;

/** Lee un cuerpo JSON con tope de tamaño. Devuelve la respuesta de error lista si falla. */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: apiError(415, "unsupported_media_type", "Se esperaba JSON."),
    };
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    return {
      ok: false,
      response: apiError(413, "payload_too_large", "La solicitud es demasiado grande."),
    };
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: apiError(413, "payload_too_large", "La solicitud es demasiado grande."),
    };
  }
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "La solicitud no es JSON válido."),
    };
  }
}

/** Primer mensaje de error por campo, a partir de los problemas de Zod. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Respuesta para fallos inesperados: el detalle va al registro del servidor y al usuario solo
 * se le muestra un mensaje genérico (sin filtrar información interna).
 */
export function serverErrorResponse(context: string, error: unknown): Response {
  console.error(`[${context}]`, error);
  if (error instanceof ConfigError) {
    return apiError(
      503,
      "service_unavailable",
      "El servicio no está disponible por ahora. Inténtalo más tarde.",
    );
  }
  return apiError(
    500,
    "internal_error",
    "No pudimos procesar la solicitud. Inténtalo de nuevo.",
  );
}
