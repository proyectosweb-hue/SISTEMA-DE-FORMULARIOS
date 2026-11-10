import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDemoStore } from "@/lib/demo/store";
import { resetRateLimits } from "@/lib/rate-limit";
import { jsonRequest } from "@/test/fake-supabase";
import { POST as signUploads } from "../uploads/route";
import { POST as saveSubmission } from "../submissions/route";
import { PUT as demoUpload } from "./storage/v1/object/upload/sign/[...path]/route";

/**
 * Recorrido COMPLETO por las rutas reales en modo demostración, sin mocks:
 * firmar -> subir al almacenamiento simulado -> guardar -> reintentar.
 */
const SUBMISSION_ID = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
const BASE = {
  submissionId: SUBMISSION_ID,
  formSlug: "prueba-tecnica",
  stationSlug: "junquito",
};

const ctx = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });

function putRequest(path: string, token: string, file: Blob | undefined) {
  const body = new FormData();
  if (file) body.append("", file);
  return new Request(
    `http://localhost/api/demo/storage/v1/object/upload/sign/${path}?token=${token}`,
    {
      method: "PUT",
      body,
    },
  );
}

const jpeg = (bytes = 5000, type = "image/jpeg") =>
  new Blob([new Uint8Array(bytes)], { type });

async function sign(count = 1) {
  const res = await signUploads(
    jsonRequest("/api/uploads", {
      ...BASE,
      fieldKey: "evidencia",
      files: Array.from({ length: count }, () => ({
        contentType: "image/jpeg",
        size: 5000,
      })),
    }),
  );
  return {
    res,
    body: (await res.clone().json()) as {
      uploads: { path: string; token: string }[];
      demo?: boolean;
    },
  };
}

const save = (attachments: { fieldKey: string; path: string }[]) =>
  saveSubmission(
    jsonRequest("/api/submissions", {
      ...BASE,
      answers: { comentario: "ok" },
      attachments,
      website: "",
    }),
  );

beforeEach(() => {
  resetDemoStore();
  resetRateLimits();
  vi.stubEnv("DEMO_MODE", "true");
  vi.stubEnv("ENABLE_TECHNICAL_FORM", "true");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("recorrido completo en modo demostración", () => {
  it("firma, sube, guarda y es idempotente al reintentar", async () => {
    const { res, body } = await sign();
    expect(res.status).toBe(200);
    expect(body.demo).toBe(true);
    const [upload] = body.uploads;

    const put = await demoUpload(
      putRequest(`evidencias/${upload!.path}`, upload!.token, jpeg()),
      ctx(`evidencias/${upload!.path}`),
    );
    expect(put.status).toBe(200);

    const saved = await save([{ fieldKey: "evidencia", path: upload!.path }]);
    expect(saved.status).toBe(201);
    const { referenceCode } = (await saved.json()) as { referenceCode: string };
    expect(referenceCode).toBe("JG-3F2B8C1E");

    const retry = await save([{ fieldKey: "evidencia", path: upload!.path }]);
    expect(retry.status).toBe(201);
    expect(((await retry.json()) as { referenceCode: string }).referenceCode).toBe(
      referenceCode,
    );
  });

  it("no guarda si la foto firmada nunca se subió", async () => {
    const { body } = await sign();
    const res = await save([{ fieldKey: "evidencia", path: body.uploads[0]!.path }]);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "attachment_missing",
    );
  });

  it("cada token sirve una sola vez y solo para su ruta", async () => {
    const { body } = await sign(2);
    const [a, b] = body.uploads;

    // El token de A no sirve para la ruta de B.
    const wrong = await demoUpload(
      putRequest(`evidencias/${b!.path}`, a!.token, jpeg()),
      ctx(`evidencias/${b!.path}`),
    );
    expect(wrong.status).toBe(403);

    expect(
      (
        await demoUpload(
          putRequest(`evidencias/${a!.path}`, a!.token, jpeg()),
          ctx(`evidencias/${a!.path}`),
        )
      ).status,
    ).toBe(200);
    // Reutilizar el mismo token (o sobrescribir) se rechaza.
    expect(
      (
        await demoUpload(
          putRequest(`evidencias/${a!.path}`, a!.token, jpeg()),
          ctx(`evidencias/${a!.path}`),
        )
      ).status,
    ).toBe(403);
  });

  it("aplica los mismos límites que el bucket real: tipo, tamaño y archivo presente", async () => {
    const { body } = await sign(3);
    const [a, b, c] = body.uploads;
    const put = (u: { path: string; token: string }, file: Blob | undefined) =>
      demoUpload(
        putRequest(`evidencias/${u.path}`, u.token, file),
        ctx(`evidencias/${u.path}`),
      );

    expect((await put(a!, jpeg(100, "application/pdf"))).status).toBe(415);
    expect((await put(b!, jpeg(6 * 1024 * 1024))).status).toBe(413);
    expect((await put(c!, undefined)).status).toBe(400);
  });

  it("rechaza un bucket distinto del de evidencias", async () => {
    const { body } = await sign();
    const u = body.uploads[0]!;
    const res = await demoUpload(
      putRequest(`otro/${u.path}`, u.token, jpeg()),
      ctx(`otro/${u.path}`),
    );
    expect(res.status).toBe(403);
  });
});

describe("fuera del modo demostración", () => {
  it("la ruta de subida simulada no existe (404)", async () => {
    vi.stubEnv("DEMO_MODE", "");
    const res = await demoUpload(
      putRequest("evidencias/x.jpg", "t", jpeg()),
      ctx("evidencias/x.jpg"),
    );
    expect(res.status).toBe(404);
  });

  it("tampoco existe en producción aunque DEMO_MODE esté activo", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await demoUpload(
      putRequest("evidencias/x.jpg", "t", jpeg()),
      ctx("evidencias/x.jpg"),
    );
    expect(res.status).toBe(404);
  });

  it("/api/uploads no marca `demo` cuando el modo está apagado", async () => {
    // Sin demostración se necesitaría Supabase real: se comprueba que la respuesta de error
    // de configuración no contiene la marca de demostración ni filtra detalles.
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const { res, body } = await sign();
    expect(res.status).toBe(503);
    expect(body).not.toHaveProperty("demo");
  });
});
