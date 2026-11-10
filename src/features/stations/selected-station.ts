"use client";

import { useSyncExternalStore } from "react";
import {
  getStation,
  isStationSlug,
  type Station,
  type StationSlug,
} from "@/config/stations";

/**
 * Estación elegida en ESTE dispositivo.
 *
 * Se guarda en localStorage para no tener que elegirla cada vez. No es un mecanismo de
 * autenticación: el servidor valida la estación de cada envío, pero no puede comprobar
 * quién la eligió (ver docs/arquitectura.md, "Nivel de acceso").
 */
const STORAGE_KEY = "junquito-gas:estacion";

const listeners = new Set<() => void>();

function readStoredSlug(): StationSlug | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isStationSlug(value) ? value : null;
  } catch {
    // Navegación privada o almacenamiento bloqueado: se trabaja sin recordar la estación.
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function selectStation(slug: StationSlug | null) {
  try {
    if (slug) window.localStorage.setItem(STORAGE_KEY, slug);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: la selección no se recordará, pero la app sigue funcionando.
  }
  listeners.forEach((notify) => notify());
}

/** Estación seleccionada (o `null`). En el servidor y durante la hidratación siempre es `null`. */
export function useSelectedStation(): Station | null {
  const slug = useSyncExternalStore(subscribe, readStoredSlug, () => null);
  return slug ? (getStation(slug) ?? null) : null;
}

const subscribeNever = () => () => {};

/** `true` solo cuando ya se hidrató en el navegador; evita parpadeos de estado "sin estación". */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
