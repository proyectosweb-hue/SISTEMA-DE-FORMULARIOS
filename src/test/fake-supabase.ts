import { vi } from "vitest";

/** Supabase simulado: lo justo para probar las rutas de la API sin red ni servicios reales. */
export function createFakeSupabase() {
  type InfoResult = {
    data: { size?: number; contentType?: string };
    error: (Error & { status?: number }) | null;
  };

  const storage = {
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      data: {
        path,
        token: `token-${path.slice(-12)}`,
        signedUrl: `https://ejemplo.invalid/${path}`,
      },
      error: null,
    })),
    info: vi.fn<(path: string) => Promise<InfoResult>>(async () => ({
      data: { size: 150_000, contentType: "image/jpeg" },
      error: null,
    })),
    remove: vi.fn<(paths: string[]) => Promise<{ data: never[]; error: null }>>(
      async () => ({
        data: [],
        error: null,
      }),
    ),
  };

  const client = {
    storage: { from: vi.fn(() => storage) },
    rpc: vi.fn<
      (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: string | null; error: Error | null }>
    >(async () => ({ data: "JG-3F2B8C1E", error: null })),
  };

  return { client, storage };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

/** Petición JSON de prueba; cada llamada puede usar una IP distinta para no cruzar límites. */
export function jsonRequest(
  url: string,
  body: unknown,
  init: { ip?: string; contentType?: string } = {},
) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      "x-forwarded-for": init.ip ?? "10.0.0.1",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
