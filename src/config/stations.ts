/**
 * Estaciones de servicio de Junquito Gas.
 *
 * Fuente única de verdad de la aplicación. La tabla `stations` de la base de datos se
 * siembra con estos mismos `slug` (ver supabase/migrations). El `slug` es el
 * identificador estable: no cambiar una vez que existan envíos asociados.
 *
 * PENDIENTE DE CONFIRMAR con la empresa: nombres oficiales y ubicaciones exactas.
 */
export const STATIONS = [
  { slug: "ciruelo", name: "Ciruelo Gas", location: "Santiago" },
  { slug: "baitoa", name: "Baitoa Gas", location: "Santiago" },
  { slug: "la-herradura", name: "La Herradura Gas", location: "Santiago · Sajoma" },
  { slug: "verdun", name: "Verdun Gas", location: "San José de las Matas" },
  { slug: "pedregal", name: "Pedregal Gas", location: "San José de las Matas" },
  { slug: "junquito", name: "Junquito Gas", location: "Valverde (Mao)" },
  { slug: "burende", name: "Burende Gas", location: "La Vega" },
  { slug: "san-jose", name: "San José Gas", location: "Santiago" },
  { slug: "monumental", name: "Monumental Gas", location: "Santo Domingo" },
] as const;

export type Station = (typeof STATIONS)[number];
export type StationSlug = Station["slug"];

/** Tupla no vacía de slugs, útil para `z.enum(...)`. */
export const STATION_SLUGS = STATIONS.map((s) => s.slug) as [
  StationSlug,
  ...StationSlug[],
];

export function isStationSlug(value: unknown): value is StationSlug {
  return typeof value === "string" && STATIONS.some((s) => s.slug === value);
}

export function getStation(slug: string): Station | undefined {
  return STATIONS.find((s) => s.slug === slug);
}
