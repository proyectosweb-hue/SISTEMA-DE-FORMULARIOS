import { describe, expect, it } from "vitest";
import { defineForm } from "./define";
import { buildAnswersSchema, isValidIsoDate } from "./schema";

const form = defineForm({
  slug: "ejemplo-tecnico",
  version: 1,
  title: "Ejemplo técnico",
  fields: [
    { key: "texto", type: "text", label: "Texto", required: true, maxLength: 10 },
    { key: "opcional", type: "text", label: "Opcional" },
    {
      key: "cantidad",
      type: "number",
      label: "Cantidad",
      required: true,
      min: 1,
      max: 100,
    },
    { key: "decimal", type: "number", label: "Decimal" },
    {
      key: "tipo",
      type: "select",
      label: "Tipo",
      required: true,
      options: [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ],
    },
    { key: "fecha", type: "date", label: "Fecha", required: true },
    { key: "acepto", type: "checkbox", label: "Acepto", required: true },
    { key: "fotos", type: "photos", label: "Fotos", max: 2 },
  ],
});

const valid = {
  texto: "  hola ",
  cantidad: "5",
  tipo: "a",
  fecha: "2026-11-10",
  acepto: true,
};

describe("buildAnswersSchema", () => {
  const schema = buildAnswersSchema(form);

  it("acepta respuestas válidas y normaliza texto y números", () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      texto: "hola",
      cantidad: 5,
      tipo: "a",
      fecha: "2026-11-10",
      acepto: true,
    });
  });

  it("acepta la salida ya normalizada (el servidor vuelve a validar lo que envió el cliente)", () => {
    const first = schema.parse(valid);
    expect(schema.safeParse(first).success).toBe(true);
  });

  it("trata las cadenas vacías de campos opcionales como ausentes", () => {
    const result = schema.safeParse({ ...valid, opcional: "   ", decimal: "" });
    expect(result.success).toBe(true);
    expect(result.data?.opcional).toBeUndefined();
    expect(result.data?.decimal).toBeUndefined();
  });

  it("acepta coma decimal en números", () => {
    expect(schema.parse({ ...valid, decimal: "2,5" }).decimal).toBe(2.5);
  });

  it("exige los campos obligatorios con mensajes en español", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
    );
    expect(messages.texto).toBe("Este campo es obligatorio.");
    expect(messages.cantidad).toBe("Este campo es obligatorio.");
    expect(messages.tipo).toBe("Este campo es obligatorio.");
    expect(messages.fecha).toBe("Este campo es obligatorio.");
    expect(messages.acepto).toBe("Debes marcar esta casilla.");
  });

  it("rechaza valores fuera de rango, inválidos o de longitud excesiva", () => {
    expect(schema.safeParse({ ...valid, cantidad: "0" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, cantidad: "101" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, cantidad: "abc" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, texto: "x".repeat(11) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, tipo: "z" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, fecha: "2026-02-31" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, acepto: false }).success).toBe(false);
  });

  it("rechaza claves que no pertenecen al formulario (incluidos los campos de fotos)", () => {
    expect(schema.safeParse({ ...valid, intruso: "x" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, fotos: "x" }).success).toBe(false);
  });
});

describe("isValidIsoDate", () => {
  it("valida fechas reales y rechaza las imposibles", () => {
    expect(isValidIsoDate("2026-11-10")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2027-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("10/11/2026")).toBe(false);
  });
});
