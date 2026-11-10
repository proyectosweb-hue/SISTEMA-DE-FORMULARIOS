/**
 * Definición DECLARATIVA de formularios.
 *
 * Un formulario es solo datos (serializables): el motor genérico los dibuja y los valida,
 * tanto en el navegador como en el servidor, con el mismo esquema. Así, cuando la empresa
 * defina un formulario real, se agrega como configuración sin tocar el motor ni la base
 * de datos.
 *
 * Los TIPOS de campo son infraestructura genérica. Los formularios concretos (y sus
 * preguntas) los define la empresa; aquí no se inventa ninguno.
 */

type FieldBase = {
  /** Identificador estable del campo; es la clave de la respuesta guardada. */
  key: string;
  label: string;
  help?: string;
  required?: boolean;
};

export type TextField = FieldBase & {
  type: "text";
  maxLength?: number;
  placeholder?: string;
};

export type TextareaField = FieldBase & {
  type: "textarea";
  maxLength?: number;
  rows?: number;
};

export type NumberField = FieldBase & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
};

export type SelectField = FieldBase & {
  type: "select";
  options: readonly { value: string; label: string }[];
};

export type DateField = FieldBase & { type: "date" };

/** Si es obligatorio, la casilla debe estar marcada (p. ej. una confirmación). */
export type CheckboxField = FieldBase & { type: "checkbox" };

/** Evidencia fotográfica. Sus archivos viajan como adjuntos, no como respuesta. */
export type PhotosField = Omit<FieldBase, "required"> & {
  type: "photos";
  /** Mínimo de fotos exigidas (por defecto 0). */
  min?: number;
  /** Máximo de fotos permitidas (por defecto 5, tope absoluto 10). */
  max?: number;
};

export type FormField =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | DateField
  | CheckboxField
  | PhotosField;

export type FormDefinition = {
  /** Identificador en la URL: minúsculas, números y guiones. */
  slug: string;
  /** Súbela cuando cambien los campos; cada envío guarda la versión usada. */
  version: number;
  title: string;
  description?: string;
  fields: readonly FormField[];
};

export type AnswerValue = string | number | boolean;
export type Answers = Record<string, AnswerValue>;

/** Datos mínimos de un formulario para listarlo en la página de inicio. */
export type FormSummary = Pick<FormDefinition, "slug" | "title" | "description">;
