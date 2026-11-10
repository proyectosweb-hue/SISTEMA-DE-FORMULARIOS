import { describe, expect, it } from "vitest";
import { defineForm } from "./define";
import { isTechnicalFormEnabled, listForms, getForm } from "./registry";

const base = { slug: "ok", version: 1, title: "T" } as const;
const text = { key: "campo", type: "text", label: "Campo" } as const;

describe("defineForm", () => {
  it("acepta una definición correcta", () => {
    expect(defineForm({ ...base, fields: [text] }).slug).toBe("ok");
  });

  it("rechaza slugs, versiones y campos inválidos", () => {
    expect(() => defineForm({ ...base, slug: "Mal Slug", fields: [text] })).toThrow(
      /slug/,
    );
    expect(() => defineForm({ ...base, version: 0, fields: [text] })).toThrow(/versión/);
    expect(() => defineForm({ ...base, fields: [] })).toThrow(/al menos un campo/);
    expect(() => defineForm({ ...base, fields: [{ ...text, key: "1mal" }] })).toThrow(
      /clave/,
    );
    expect(() => defineForm({ ...base, fields: [text, text] })).toThrow(/repetida/);
    expect(() =>
      defineForm({
        ...base,
        fields: [{ key: "s", type: "select", label: "S", options: [] }],
      }),
    ).toThrow(/opciones/);
    expect(() =>
      defineForm({
        ...base,
        fields: [{ key: "f", type: "photos", label: "F", min: 3, max: 2 }],
      }),
    ).toThrow(/fotos/);
  });
});

describe("registro de formularios", () => {
  it("no tiene formularios de negocio inventados", () => {
    expect(listForms({})).toHaveLength(0);
  });

  it("habilita el formulario técnico solo cuando se pide y nunca en producción", () => {
    expect(isTechnicalFormEnabled({ ENABLE_TECHNICAL_FORM: "true" })).toBe(true);
    expect(isTechnicalFormEnabled({})).toBe(false);
    expect(
      isTechnicalFormEnabled({ ENABLE_TECHNICAL_FORM: "true", VERCEL_ENV: "production" }),
    ).toBe(false);
    expect(
      isTechnicalFormEnabled({ ENABLE_TECHNICAL_FORM: "true", VERCEL_ENV: "preview" }),
    ).toBe(true);
  });

  it("no encuentra formularios que no están registrados", () => {
    expect(getForm("no-existe")).toBeUndefined();
  });
});
