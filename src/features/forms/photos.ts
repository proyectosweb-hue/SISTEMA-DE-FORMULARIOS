import type { FormDefinition, PhotosField } from "./types";

export const DEFAULT_MAX_PHOTOS = 5;
export const ABSOLUTE_MAX_PHOTOS_PER_FIELD = 10;

export function getPhotoFields(definition: FormDefinition): PhotosField[] {
  return definition.fields.filter((f): f is PhotosField => f.type === "photos");
}

/** Límites efectivos de un campo de fotos (con valores por defecto y tope absoluto). */
export function photoLimits(field: PhotosField): { min: number; max: number } {
  const max = Math.min(field.max ?? DEFAULT_MAX_PHOTOS, ABSOLUTE_MAX_PHOTOS_PER_FIELD);
  const min = Math.min(field.min ?? 0, max);
  return { min, max };
}

function plural(n: number) {
  return n === 1 ? "1 foto" : `${n} fotos`;
}

/**
 * Valida la cantidad de fotos de cada campo. Se usa igual en el navegador (antes de subir)
 * y en el servidor (al guardar). Devuelve un mensaje por clave de campo con error.
 */
export function validatePhotoCounts(
  definition: FormDefinition,
  counts: Readonly<Record<string, number>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of getPhotoFields(definition)) {
    const { min, max } = photoLimits(field);
    const count = counts[field.key] ?? 0;
    if (count < min) errors[field.key] = `Adjunta al menos ${plural(min)}.`;
    else if (count > max) errors[field.key] = `Máximo ${plural(max)}.`;
  }
  return errors;
}
