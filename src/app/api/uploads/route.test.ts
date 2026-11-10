import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigError } from "@/lib/env";
import { resetRateLimits } from "@/lib/rate-limit";
import { isEvidencePathFor } from "@/lib/uploads/paths";
import { createFakeSupabase, jsonRequest, type FakeSupabase } from "@/test/fake-supabase";

const holder = vi.hoisted(() => ({
  current: undefined as unknown,
  failWith: undefined as unknown,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => {
    if (holder.failWith) throw holder.failWith;
    return (holder.current as FakeSupabase).client;
  },
}));

import { POST } from "./route";

const SUBMISSION_ID = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
const valid = {
  submissionId: SUBMISSION_ID,
  formSlug: "prueba-tecnica",
  stationSlug: "junquito",
  fieldKey: "evidencia",
  files: [
    { contentType: "image/jpeg", size: 200_000 },
    { contentType: "image/webp", size: 90_000 },
  ],
};

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  holder.current = fake;
  holder.failWith = undefined;
  resetRateLimits();
  vi.stubEnv("ENABLE_TECHNICAL_FORM", "true");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/uploads", () => {
  it("entrega una URL firmada por foto, con rutas generadas por el servidor", async () => {
    const res = await POST(jsonRequest("/api/uploads", valid));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const { uploads } = (await res.json()) as {
      uploads: { path: string; token: string }[];
    };
    expect(uploads).toHaveLength(2);
    for (const upload of uploads) {
      expect(
        isEvidencePathFor(upload.path, {
          stationSlug: "junquito",
          submissionId: SUBMISSION_ID,
        }),
      ).toBe(true);
      expect(upload.token).toBeTruthy();
    }
    expect(uploads[0]!.path).toMatch(/\.jpg$/);
    expect(uploads[1]!.path).toMatch(/\.webp$/);
    expect(fake.client.storage.from).toHaveBeenCalledWith("evidencias");
  });

  it("exige contenido JSON", async () => {
    const res = await POST(
      jsonRequest("/api/uploads", "texto", { contentType: "text/plain" }),
    );
    expect(res.status).toBe(415);
  });

  it("rechaza JSON mal formado y cuerpos demasiado grandes", async () => {
    expect((await POST(jsonRequest("/api/uploads", "{no es json"))).status).toBe(400);
    const big = JSON.stringify({ ...valid, relleno: "x".repeat(70_000) });
    expect((await POST(jsonRequest("/api/uploads", big))).status).toBe(413);
  });

  it("rechaza tipos y tamaños no permitidos, estaciones inventadas y claves extra", async () => {
    const bad = (patch: object) =>
      POST(jsonRequest("/api/uploads", { ...valid, ...patch }));
    expect(
      (await bad({ files: [{ contentType: "application/pdf", size: 1000 }] })).status,
    ).toBe(400);
    expect(
      (await bad({ files: [{ contentType: "image/jpeg", size: 6 * 1024 * 1024 }] }))
        .status,
    ).toBe(400);
    expect((await bad({ files: [] })).status).toBe(400);
    expect((await bad({ stationSlug: "otra" })).status).toBe(400);
    expect((await bad({ submissionId: "no-es-uuid" })).status).toBe(400);
    expect((await bad({ intruso: true })).status).toBe(400);
    expect(fake.storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("responde 404 si el formulario no existe o no está habilitado", async () => {
    expect(
      (await POST(jsonRequest("/api/uploads", { ...valid, formSlug: "inventado" })))
        .status,
    ).toBe(404);
    vi.stubEnv("ENABLE_TECHNICAL_FORM", "");
    expect((await POST(jsonRequest("/api/uploads", valid))).status).toBe(404);
  });

  it("no firma subidas para campos que no son de fotos ni por encima del máximo", async () => {
    const wrongField = await POST(
      jsonRequest("/api/uploads", { ...valid, fieldKey: "comentario" }),
    );
    expect(wrongField.status).toBe(400);
    expect(((await wrongField.json()) as { error: { code: string } }).error.code).toBe(
      "invalid_field",
    );

    const tooMany = await POST(
      jsonRequest("/api/uploads", {
        ...valid,
        files: Array.from({ length: 4 }, () => ({
          contentType: "image/jpeg",
          size: 1000,
        })),
      }),
    );
    expect(tooMany.status).toBe(400);
    expect(((await tooMany.json()) as { error: { code: string } }).error.code).toBe(
      "too_many_files",
    );
    expect(fake.storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("limita las peticiones por IP", async () => {
    let last = 200;
    for (let i = 0; i < 61; i++) {
      last = (await POST(jsonRequest("/api/uploads", "{", { ip: "203.0.113.9" }))).status;
    }
    expect(last).toBe(429);
    // Otra IP no se ve afectada.
    expect(
      (await POST(jsonRequest("/api/uploads", valid, { ip: "203.0.113.10" }))).status,
    ).toBe(200);
  });

  it("no filtra detalles internos cuando falla la configuración o Storage", async () => {
    holder.failWith = new ConfigError(
      "Faltan o son inválidas estas variables de entorno: SUPABASE_SECRET_KEY.",
    );
    const noConfig = await POST(jsonRequest("/api/uploads", valid));
    expect(noConfig.status).toBe(503);
    expect(JSON.stringify(await noConfig.json())).not.toContain("SUPABASE_SECRET_KEY");

    holder.failWith = undefined;
    fake.storage.createSignedUploadUrl.mockRejectedValueOnce(
      new Error("clave secreta sb_secret_123"),
    );
    const failed = await POST(jsonRequest("/api/uploads", valid));
    expect(failed.status).toBe(500);
    expect(JSON.stringify(await failed.json())).not.toContain("sb_secret_123");
  });
});
