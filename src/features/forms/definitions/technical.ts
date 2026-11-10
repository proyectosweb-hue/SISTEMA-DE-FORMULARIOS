import { defineForm } from "../define";

/**
 * FORMULARIO TÉCNICO DE PRUEBA — no es un formulario de la empresa.
 *
 * Solo sirve para verificar de punta a punta el flujo estación + fotografías + envío
 * en desarrollo y en vistas previas. Nunca se registra en producción (ver registry.ts).
 */
export const technicalForm = defineForm({
  slug: "prueba-tecnica",
  version: 1,
  title: "Formulario técnico de prueba",
  description: "Solo para verificar el flujo de fotos y envío. No se usa en producción.",
  fields: [
    {
      key: "comentario",
      type: "textarea",
      label: "Comentario (opcional)",
      maxLength: 500,
    },
    {
      key: "evidencia",
      type: "photos",
      label: "Fotografías de prueba",
      help: "Toma una foto con la cámara o elige una de tu galería.",
      min: 1,
      max: 3,
    },
  ],
});
