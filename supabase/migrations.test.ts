import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STATIONS } from "@/config/stations";
import {
  ALLOWED_IMAGE_TYPES,
  EVIDENCE_BUCKET,
  MAX_UPLOAD_BYTES,
} from "@/lib/uploads/constants";

/**
 * Ejecuta las migraciones sobre PostgreSQL real (PGlite, en memoria) para comprobar el SQL,
 * la atomicidad/idempotencia de create_submission y que la configuración de la app y la de
 * la base de datos no se desalineen. No usa ningún proyecto de Supabase.
 */
const read = (name: string) =>
  readFileSync(new URL(`./migrations/${name}`, import.meta.url), "utf8");

const FN = "public.create_submission(uuid, text, integer, text, jsonb, jsonb)";
const ID_1 = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
const ID_2 = "9a7d1c20-8e54-4b3f-a1c2-0d9e8f7a6b5c";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Roles que en Supabase ya existen.
  await db.exec("create role anon; create role authenticated; create role service_role;");
  // Esquema mínimo de Storage (en Supabase lo provee la plataforma).
  await db.exec(`
    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
  `);
  await db.exec(read("20261110000000_estructura_inicial.sql"));
  await db.exec(read("20261110000100_almacenamiento_evidencias.sql"));
});

afterAll(async () => {
  await db.close();
});

const attachment = (n: number) => ({
  field_key: "evidencia",
  storage_path: `junquito/2026/11/${ID_1}/00000000-0000-4000-8000-00000000000${n}.jpg`,
  mime_type: "image/jpeg",
  size_bytes: 120_000 + n,
});

const submit = (id: string, attachments: unknown[], station = "junquito") =>
  db.query<{ code: string }>(
    "select public.create_submission($1, $2, $3, $4, $5::jsonb, $6::jsonb) as code",
    [
      id,
      "prueba-tecnica",
      1,
      station,
      JSON.stringify({ comentario: "ok" }),
      JSON.stringify(attachments),
    ],
  );

describe("migraciones de Supabase", () => {
  it("siembra las mismas 9 estaciones que la aplicación", async () => {
    const { rows } = await db.query<{ slug: string; name: string; location: string }>(
      "select slug, name, location from public.stations order by slug",
    );
    const expected = [...STATIONS].sort((a, b) => a.slug.localeCompare(b.slug));
    expect(rows).toEqual(
      expected.map(({ slug, name, location }) => ({ slug, name, location })),
    );
  });

  it("crea el bucket privado con los mismos límites que la aplicación", async () => {
    const { rows } = await db.query<{
      id: string;
      public: boolean;
      file_size_limit: string | number;
      allowed_mime_types: string[];
    }>("select id, public, file_size_limit, allowed_mime_types from storage.buckets");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(EVIDENCE_BUCKET);
    expect(rows[0]!.public).toBe(false);
    expect(Number(rows[0]!.file_size_limit)).toBe(MAX_UPLOAD_BYTES);
    expect([...rows[0]!.allowed_mime_types].sort()).toEqual(
      [...ALLOWED_IMAGE_TYPES].sort(),
    );
  });

  it("activa RLS en todas las tablas y no concede acceso al rol público", async () => {
    const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relname in ('stations','submissions','attachments') order by relname",
    );
    expect(rls.rows.every((r) => r.relrowsecurity)).toBe(true);
    expect(rls.rows).toHaveLength(3);

    const policies = await db.query(
      "select 1 from pg_policies where schemaname = 'public'",
    );
    expect(policies.rows).toHaveLength(0);

    for (const table of ["stations", "submissions", "attachments"]) {
      for (const role of ["anon", "authenticated"]) {
        const priv = await db.query<{ ok: boolean }>(
          `select has_table_privilege('${role}', 'public.${table}', 'select, insert, update, delete') as ok`,
        );
        expect(priv.rows[0]!.ok).toBe(false);
      }
    }
  });

  it("solo permite ejecutar create_submission al servidor (service_role)", async () => {
    const check = (role: string) =>
      db.query<{ ok: boolean }>(
        `select has_function_privilege('${role}', '${FN}', 'execute') as ok`,
      );
    expect((await check("anon")).rows[0]!.ok).toBe(false);
    expect((await check("authenticated")).rows[0]!.ok).toBe(false);
    expect((await check("service_role")).rows[0]!.ok).toBe(true);
  });

  it("guarda el envío con sus adjuntos y devuelve el código de referencia", async () => {
    const { rows } = await submit(ID_1, [attachment(1), attachment(2)]);
    expect(rows[0]!.code).toBe("JG-3F2B8C1E");

    const files = await db.query(
      "select * from public.attachments where submission_id = $1",
      [ID_1],
    );
    expect(files.rows).toHaveLength(2);
  });

  it("es idempotente: reintentar con el mismo id no duplica nada", async () => {
    const again = await submit(ID_1, [attachment(1), attachment(2)]);
    expect(again.rows[0]!.code).toBe("JG-3F2B8C1E");

    const subs = await db.query("select 1 from public.submissions where id = $1", [ID_1]);
    const files = await db.query(
      "select 1 from public.attachments where submission_id = $1",
      [ID_1],
    );
    expect(subs.rows).toHaveLength(1);
    expect(files.rows).toHaveLength(2);
  });

  it("es atómico: si un adjunto falla, no queda el envío a medias", async () => {
    // Misma ruta de almacenamiento que un adjunto existente => viola UNIQUE(storage_path).
    await expect(submit(ID_2, [attachment(1)])).rejects.toThrow();
    const subs = await db.query("select 1 from public.submissions where id = $1", [ID_2]);
    expect(subs.rows).toHaveLength(0);
  });

  it("rechaza estaciones inexistentes", async () => {
    await expect(
      submit("11111111-1111-4111-8111-111111111111", [], "no-existe"),
    ).rejects.toThrow();
  });
});
