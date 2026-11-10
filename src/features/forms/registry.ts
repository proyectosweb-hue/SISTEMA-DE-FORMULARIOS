import { technicalForm } from "./definitions/technical";
import type { FormDefinition, FormSummary } from "./types";

/**
 * Formularios REALES de la empresa.
 *
 * Está vacío a propósito: el supervisor aún no ha definido qué formularios se necesitan,
 * y no se inventan formularios, campos ni procesos. Cuando se definan, se agregan aquí
 * con `defineForm(...)` (ver definitions/technical.ts como referencia de formato).
 */
const BUSINESS_FORMS: readonly FormDefinition[] = [];

/**
 * El formulario técnico solo se habilita con ENABLE_TECHNICAL_FORM=true y NUNCA en el
 * entorno de producción de Vercel, aunque la variable se haya configurado por error.
 */
type EnvLike = Readonly<Record<string, string | undefined>>;

export function isTechnicalFormEnabled(env: EnvLike = process.env): boolean {
  return env.ENABLE_TECHNICAL_FORM === "true" && env.VERCEL_ENV !== "production";
}

export function listForms(env: EnvLike = process.env): readonly FormDefinition[] {
  return isTechnicalFormEnabled(env)
    ? [...BUSINESS_FORMS, technicalForm]
    : BUSINESS_FORMS;
}

export function getForm(slug: string): FormDefinition | undefined {
  return listForms().find((form) => form.slug === slug);
}

export function listFormSummaries(): FormSummary[] {
  return listForms().map(({ slug, title, description }) => ({
    slug,
    title,
    description,
  }));
}
