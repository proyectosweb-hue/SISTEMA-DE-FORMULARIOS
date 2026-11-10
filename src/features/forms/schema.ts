import { z } from "zod";
import type { FormDefinition, FormField } from "./types";

const REQUIRED = "Este campo es obligatorio.";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const text = value.trim().replace(",", ".");
    return text === "" ? undefined : Number(text);
  }
  return value;
};

/** Comprueba que `AAAA-MM-DD` sea una fecha real (rechaza, por ejemplo, 2026-02-31). */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function fieldSchema(field: Exclude<FormField, { type: "photos" }>): z.ZodType {
  switch (field.type) {
    case "text":
    case "textarea": {
      const max = field.maxLength ?? (field.type === "textarea" ? 2000 : 255);
      const base = z
        .string({ error: REQUIRED })
        .trim()
        .max(max, `Máximo ${max} caracteres.`);
      return field.required
        ? base.min(1, REQUIRED)
        : z.preprocess(emptyToUndefined, base.optional());
    }

    case "number": {
      let base = z.number({
        error: (issue) =>
          issue.input === undefined ? REQUIRED : "Ingresa un número válido.",
      });
      if (field.min !== undefined)
        base = base.min(field.min, `El valor mínimo es ${field.min}.`);
      if (field.max !== undefined)
        base = base.max(field.max, `El valor máximo es ${field.max}.`);
      return z.preprocess(toNumber, field.required ? base : base.optional());
    }

    case "select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      const base = z.enum(values, {
        error: (issue) =>
          issue.input === undefined ? REQUIRED : "Selecciona una opción válida.",
      });
      return z.preprocess(emptyToUndefined, field.required ? base : base.optional());
    }

    case "date": {
      const base = z
        .string({ error: REQUIRED })
        .refine(isValidIsoDate, "Ingresa una fecha válida.");
      return z.preprocess(emptyToUndefined, field.required ? base : base.optional());
    }

    case "checkbox":
      return field.required
        ? z.literal(true, { error: "Debes marcar esta casilla." })
        : z.boolean().optional();
  }
}

/**
 * Esquema Zod de las RESPUESTAS de un formulario (los campos de fotos quedan fuera: viajan
 * como adjuntos). Es estricto: rechaza claves que no pertenezcan al formulario.
 *
 * Es el mismo esquema en el navegador y en el servidor; el servidor nunca confía en la
 * validación del cliente.
 */
export function buildAnswersSchema(definition: FormDefinition) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of definition.fields) {
    if (field.type === "photos") continue;
    shape[field.key] = fieldSchema(field);
  }
  return z.strictObject(shape);
}
