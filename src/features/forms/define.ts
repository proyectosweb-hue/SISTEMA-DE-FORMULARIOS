import type { FormDefinition } from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY_PATTERN = /^[a-z][a-zA-Z0-9_]{0,63}$/;

/**
 * Declara un formulario comprobando sus invariantes. Falla al cargar el módulo (y por
 * tanto en las pruebas y en la compilación) si la definición es incorrecta, en lugar de
 * descubrirlo cuando un usuario intenta enviar datos.
 */
export function defineForm<const T extends FormDefinition>(definition: T): T {
  const { slug, version, fields } = definition;

  if (!SLUG_PATTERN.test(slug) || slug.length > 80) {
    throw new Error(
      `Formulario "${slug}": el slug debe usar minúsculas, números y guiones.`,
    );
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(
      `Formulario "${slug}": la versión debe ser un entero mayor o igual a 1.`,
    );
  }
  if (fields.length === 0) {
    throw new Error(`Formulario "${slug}": debe tener al menos un campo.`);
  }

  const seen = new Set<string>();
  for (const field of fields) {
    if (!KEY_PATTERN.test(field.key)) {
      throw new Error(`Formulario "${slug}": clave de campo no válida "${field.key}".`);
    }
    if (seen.has(field.key)) {
      throw new Error(`Formulario "${slug}": clave de campo repetida "${field.key}".`);
    }
    seen.add(field.key);

    if (field.type === "select" && field.options.length === 0) {
      throw new Error(`Formulario "${slug}": el campo "${field.key}" no tiene opciones.`);
    }
    if (field.type === "photos") {
      const { min = 0, max = 5 } = field;
      if (min < 0 || max < 1 || min > max) {
        throw new Error(
          `Formulario "${slug}": límites de fotos incorrectos en "${field.key}".`,
        );
      }
    }
  }

  return definition;
}
