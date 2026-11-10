import type { StationSlug } from "@/config/stations";
import { IMAGE_EXTENSION, type AllowedImageType } from "./constants";

type PathOwner = { stationSlug: StationSlug; submissionId: string };

/**
 * Ruta de una evidencia dentro del bucket privado:
 *   {estacion}/{año}/{mes}/{id-del-envío}/{uuid-aleatorio}.{ext}
 *
 * El nombre del archivo NUNCA viene del usuario: se genera aquí, lo que evita
 * colisiones y recorridos de ruta (../).
 */
export function buildEvidencePath(
  input: PathOwner & { type: AllowedImageType; now?: Date; fileId?: string },
): string {
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const fileId = input.fileId ?? crypto.randomUUID();
  return `${input.stationSlug}/${year}/${month}/${input.submissionId}/${fileId}.${IMAGE_EXTENSION[input.type]}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Comprueba que una ruta enviada por el cliente corresponde EXACTAMENTE a la
 * estación y al envío indicados. `stationSlug` y `submissionId` ya deben haberse
 * validado (enum de estaciones y UUID), por lo que solo contienen [a-z0-9-].
 */
export function isEvidencePathFor(
  path: string,
  { stationSlug, submissionId }: PathOwner,
) {
  const pattern = new RegExp(
    `^${stationSlug}/\\d{4}/(0[1-9]|1[0-2])/${submissionId}/${UUID}\\.(jpg|png|webp)$`,
    "i",
  );
  return pattern.test(path);
}

/** Carpeta (prefijo) que contiene los archivos de una ruta de evidencia. */
export function evidenceFolder(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}
