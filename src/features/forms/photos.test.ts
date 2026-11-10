import { describe, expect, it } from "vitest";
import { defineForm } from "./define";
import { getPhotoFields, photoLimits, validatePhotoCounts } from "./photos";

const form = defineForm({
  slug: "fotos",
  version: 1,
  title: "Fotos",
  fields: [
    { key: "antes", type: "photos", label: "Antes", min: 1, max: 2 },
    { key: "despues", type: "photos", label: "Después" },
    { key: "nota", type: "text", label: "Nota" },
  ],
});

describe("límites de fotos", () => {
  it("aplica valores por defecto y el tope absoluto", () => {
    const [, despues] = getPhotoFields(form);
    expect(photoLimits(despues!)).toEqual({ min: 0, max: 5 });
    expect(photoLimits({ key: "x", type: "photos", label: "x", max: 99 }).max).toBe(10);
  });

  it("solo considera campos de tipo fotos", () => {
    expect(getPhotoFields(form).map((f) => f.key)).toEqual(["antes", "despues"]);
  });

  it("valida mínimos y máximos por campo", () => {
    expect(validatePhotoCounts(form, { antes: 1, despues: 0 })).toEqual({});
    expect(validatePhotoCounts(form, {})).toEqual({ antes: "Adjunta al menos 1 foto." });
    expect(validatePhotoCounts(form, { antes: 3 })).toEqual({ antes: "Máximo 2 fotos." });
    expect(validatePhotoCounts(form, { antes: 1, despues: 6 })).toEqual({
      despues: "Máximo 5 fotos.",
    });
  });
});
