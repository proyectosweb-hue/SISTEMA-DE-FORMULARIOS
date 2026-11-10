import { beforeEach, describe, expect, it } from "vitest";
import { createDemoSupabase } from "./fake-supabase";
import { getDemoStore, resetDemoStore, setBounded } from "./store";

const ID = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
const PATH = `junquito/2026/11/${ID}/00000000-0000-4000-8000-000000000001.jpg`;

const args = (overrides: Record<string, unknown> = {}) => ({
  p_id: ID,
  p_form_slug: "prueba-tecnica",
  p_form_version: 1,
  p_station_slug: "junquito",
  p_answers: { comentario: "ok" },
  p_attachments: [
    {
      field_key: "evidencia",
      storage_path: PATH,
      mime_type: "image/jpeg",
      size_bytes: 1234,
    },
  ],
  ...overrides,
});

beforeEach(() => resetDemoStore());

describe("Supabase simulado (modo demostración)", () => {
  it("firma una subida con un token asociado a la ruta", async () => {
    const storage = createDemoSupabase().storage.from("evidencias");
    const { data, error } = await storage.createSignedUploadUrl(PATH);
    expect(error).toBeNull();
    expect(data?.path).toBe(PATH);
    expect(getDemoStore().tokens.get(data!.token)).toBe(PATH);
  });

  it("solo conoce el bucket de evidencias", () => {
    expect(() => createDemoSupabase().storage.from("otro")).toThrow(/no existe/i);
  });

  it("informa tamaño y tipo de los archivos subidos y 'no encontrado' para los demás", async () => {
    const storage = createDemoSupabase().storage.from("evidencias");

    const missing = await storage.info(PATH);
    expect(missing.data).toBeNull();
    expect((missing.error as { status?: number }).status).toBe(400);

    getDemoStore().files.set(PATH, { size: 999, contentType: "image/jpeg" });
    const found = await storage.info(PATH);
    expect(found.data).toMatchObject({ size: 999, contentType: "image/jpeg" });

    await storage.remove([PATH]);
    expect((await storage.info(PATH)).data).toBeNull();
  });

  it("guarda un envío y devuelve su código de referencia", async () => {
    const { data, error } = await createDemoSupabase().rpc("create_submission", args());
    expect(error).toBeNull();
    expect(data).toBe("JG-3F2B8C1E");
    expect(getDemoStore().submissions.get(ID)?.attachments).toHaveLength(1);
  });

  it("es idempotente: reintentar con el mismo id no duplica ni cambia el código", async () => {
    const client = createDemoSupabase();
    await client.rpc("create_submission", args());
    const again = await client.rpc(
      "create_submission",
      args({ p_answers: { comentario: "otro" } }),
    );
    expect(again.data).toBe("JG-3F2B8C1E");
    expect(getDemoStore().submissions.size).toBe(1);
    expect(getDemoStore().submissions.get(ID)?.answers).toEqual({ comentario: "ok" });
  });

  it("rechaza estaciones inexistentes y funciones desconocidas", async () => {
    const client = createDemoSupabase();
    expect(
      (await client.rpc("create_submission", args({ p_station_slug: "otra" }))).error,
    ).toBeTruthy();
    expect((await client.rpc("borrar_todo", {})).error).toBeTruthy();
    expect(getDemoStore().submissions.size).toBe(0);
  });
});

describe("almacén acotado", () => {
  it("descarta las entradas más antiguas al superar el tope", () => {
    const map = new Map<number, number>();
    for (let i = 0; i < 520; i++) setBounded(map, i, i);
    expect(map.size).toBe(500);
    expect(map.has(0)).toBe(false);
    expect(map.has(519)).toBe(true);
  });
});
