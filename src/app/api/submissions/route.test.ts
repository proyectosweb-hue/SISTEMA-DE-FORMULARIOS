import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { createFakeSupabase, jsonRequest, type FakeSupabase } from "@/test/fake-supabase";

const holder = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => (holder.current as FakeSupabase).client,
}));

import { POST } from "./route";

const SUBMISSION_ID = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
const FOLDER = `junquito/2026/11/${SUBMISSION_ID}`;
const photo = (n: number) => `${FOLDER}/00000000-0000-4000-8000-00000000000${n}.jpg`;

const valid = {
  submissionId: SUBMISSION_ID,
  formSlug: "prueba-tecnica",
  stationSlug: "junquito",
  answers: { comentario: "  todo en orden " },
  attachments: [
    { fieldKey: "evidencia", path: photo(1) },
    { fieldKey: "evidencia", path: photo(2) },
  ],
};

let fake: FakeSupabase;
const send = (patch: object = {}, ip = "10.0.0.1") =>
  POST(jsonRequest("/api/submissions", { ...valid, ...patch }, { ip }));
const errorOf = async (res: Response) =>
  ((await res.json()) as { error: { code: string; fields?: Record<string, string> } })
    .error;

beforeEach(() => {
  fake = createFakeSupabase();
  holder.current = fake;
  resetRateLimits();
  vi.stubEnv("ENABLE_TECHNICAL_FORM", "true");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/submissions", () => {
  it("guarda el envío con datos de adjuntos tomados de Storage, no del cliente", async () => {
    fake.storage.info.mockResolvedValue({
      data: { size: 123_456, contentType: "image/jpeg" },
      error: null,
    });

    const res = await send();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ referenceCode: "JG-3F2B8C1E" });

    expect(fake.client.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = fake.client.rpc.mock.calls[0]!;
    expect(fn).toBe("create_submission");
    expect(args).toMatchObject({
      p_id: SUBMISSION_ID,
      p_form_slug: "prueba-tecnica",
      p_form_version: 1,
      p_station_slug: "junquito",
      p_answers: { comentario: "todo en orden" },
    });
    expect(args.p_attachments).toEqual([
      {
        field_key: "evidencia",
        storage_path: photo(1),
        mime_type: "image/jpeg",
        size_bytes: 123_456,
      },
      {
        field_key: "evidencia",
        storage_path: photo(2),
        mime_type: "image/jpeg",
        size_bytes: 123_456,
      },
    ]);
  });

  it("vuelve a validar las respuestas en el servidor y rechaza claves desconocidas", async () => {
    const tooLong = await send({ answers: { comentario: "x".repeat(501) } });
    expect(tooLong.status).toBe(400);
    const error = await errorOf(tooLong);
    expect(error.code).toBe("invalid_answers");
    expect(error.fields?.comentario).toMatch(/500/);

    expect((await send({ answers: { comentario: "ok", otro: "x" } })).status).toBe(400);
    expect(fake.client.rpc).not.toHaveBeenCalled();
  });

  it("exige el mínimo de fotos del campo", async () => {
    const res = await send({ attachments: [] });
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("invalid_photos");
    expect(error.fields?.evidencia).toBe("Adjunta al menos 1 foto.");
  });

  it("rechaza más fotos que el máximo del campo", async () => {
    const attachments = [1, 2, 3, 4].map((n) => ({
      fieldKey: "evidencia",
      path: photo(n),
    }));
    const res = await send({ attachments });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).fields?.evidencia).toBe("Máximo 3 fotos.");
  });

  it("rechaza fotos de otra estación, de otro envío, repetidas o con campo inexistente", async () => {
    const otherStation = `verdun/2026/11/${SUBMISSION_ID}/00000000-0000-4000-8000-000000000001.jpg`;
    const otherSubmission =
      "junquito/2026/11/9a7d1c20-8e54-4b3f-a1c2-0d9e8f7a6b5c/00000000-0000-4000-8000-000000000001.jpg";
    const cases = [
      [{ fieldKey: "evidencia", path: otherStation }],
      [{ fieldKey: "evidencia", path: otherSubmission }],
      [{ fieldKey: "evidencia", path: `${FOLDER}/../../../secreto.jpg` }],
      [
        { fieldKey: "evidencia", path: photo(1) },
        { fieldKey: "evidencia", path: photo(1) },
      ],
      [{ fieldKey: "comentario", path: photo(1) }],
    ];
    for (const attachments of cases) {
      const res = await send({ attachments });
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe("invalid_attachment");
    }
    expect(fake.storage.info).not.toHaveBeenCalled();
    expect(fake.client.rpc).not.toHaveBeenCalled();
  });

  it("rechaza fotos que no existen en Storage (subida incompleta)", async () => {
    const notFound = Object.assign(new Error("Object not found"), { status: 400 });
    fake.storage.info.mockResolvedValue({ data: {}, error: notFound });
    const res = await send();
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("attachment_missing");
    expect(fake.client.rpc).not.toHaveBeenCalled();
  });

  it("rechaza y elimina fotos que superan el tamaño o no son imágenes permitidas", async () => {
    fake.storage.info.mockResolvedValue({
      data: { size: 9 * 1024 * 1024, contentType: "image/jpeg" },
      error: null,
    });
    const tooBig = await send();
    expect((await errorOf(tooBig)).code).toBe("attachment_invalid");
    expect(fake.storage.remove).toHaveBeenCalledWith([photo(1), photo(2)]);

    fake.storage.info.mockResolvedValue({
      data: { size: 1000, contentType: "text/html" },
      error: null,
    });
    expect((await errorOf(await send())).code).toBe("attachment_invalid");
    expect(fake.client.rpc).not.toHaveBeenCalled();
  });

  it("si Storage falla no culpa al usuario: responde 500 sin detalles internos", async () => {
    const outage = Object.assign(new Error("db password=hunter2"), { status: 500 });
    fake.storage.info.mockResolvedValue({ data: {}, error: outage });
    const res = await send();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
  });

  it("no revela errores de la base de datos", async () => {
    fake.client.rpc.mockResolvedValue({
      data: null,
      error: new Error('violates foreign key "secreto"'),
    });
    const res = await send();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secreto");
  });

  it("descarta en silencio los envíos de bots que llenan el señuelo", async () => {
    const res = await send({ website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ referenceCode: "JG-00000000" });
    expect(fake.client.rpc).not.toHaveBeenCalled();
    expect(fake.storage.info).not.toHaveBeenCalled();
  });

  it("acepta el señuelo vacío (así lo envía el formulario real)", async () => {
    expect((await send({ website: "" })).status).toBe(201);
  });

  it("responde 404 si el formulario no existe y 400 si la estación no es válida", async () => {
    expect((await send({ formSlug: "inventado" })).status).toBe(404);
    expect((await send({ stationSlug: "otra" })).status).toBe(400);
  });

  it("limita las peticiones por IP", async () => {
    let last = 0;
    for (let i = 0; i < 41; i++)
      last = (await send({ formSlug: "inventado" }, "198.51.100.7")).status;
    expect(last).toBe(429);
  });
});
