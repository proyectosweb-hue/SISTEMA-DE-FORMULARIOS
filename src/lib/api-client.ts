import type { ApiErrorBody } from "@/features/forms/payloads";

/** Error de una llamada a la API (o de red) con un mensaje listo para mostrar a la persona. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** POST de JSON a la API propia, con manejo uniforme de errores de red y de servidor. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(
      "No hay conexión con el servidor. Revisa tu señal e inténtalo de nuevo.",
      "network_error",
      0,
    );
  }

  if (response.ok) return (await response.json()) as T;

  let payload: ApiErrorBody | undefined;
  try {
    payload = (await response.json()) as ApiErrorBody;
  } catch {
    // Respuesta sin JSON (p. ej. una página de error de la plataforma).
  }
  throw new ApiRequestError(
    payload?.error.message ?? "No pudimos completar la solicitud. Inténtalo de nuevo.",
    payload?.error.code ?? "unknown_error",
    response.status,
    payload?.error.fields,
  );
}
