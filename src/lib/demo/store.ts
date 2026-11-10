import "server-only";

export type DemoFile = { size: number; contentType: string };
export type DemoSubmission = {
  id: string;
  referenceCode: string;
  formSlug: string;
  formVersion: number;
  stationSlug: string;
  answers: unknown;
  attachments: {
    field_key: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
  }[];
  createdAt: string;
};

type DemoStore = {
  /** token de subida -> ruta autorizada (de un solo uso) */
  tokens: Map<string, string>;
  files: Map<string, DemoFile>;
  submissions: Map<string, DemoSubmission>;
};

/** Tope por colección para que un servidor de demostración olvidado no crezca sin límite. */
const MAX_ENTRIES = 500;

// En Next.js cada ruta puede cargar su propia copia del módulo: el estado se guarda en
// globalThis para que las rutas de la demostración compartan los mismos datos.
const holder = globalThis as typeof globalThis & { __demoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  return (holder.__demoStore ??= {
    tokens: new Map(),
    files: new Map(),
    submissions: new Map(),
  });
}

export function resetDemoStore() {
  holder.__demoStore = undefined;
}

/** Inserta en un Map descartando la entrada más antigua si se supera el tope. */
export function setBounded<K, V>(map: Map<K, V>, key: K, value: V) {
  map.set(key, value);
  if (map.size > MAX_ENTRIES) {
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  }
}
