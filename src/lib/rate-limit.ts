/**
 * Límite de peticiones por clave (p. ej. IP) con ventana deslizante, en memoria.
 *
 * LIMITACIÓN CONOCIDA: en Vercel cada instancia serverless tiene su propia memoria, así que
 * este límite es "de mejor esfuerzo" y no sustituye a una regla de Vercel WAF / Firewall
 * (rate limiting) ni a un servicio con estado compartido. Frena ráfagas simples y abusos
 * accidentales; ver docs/arquitectura.md.
 */
type Options = { limit: number; windowMs: number };

const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function checkRateLimit(
  key: string,
  { limit, windowMs }: Options,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Solo para pruebas. */
export function resetRateLimits() {
  hits.clear();
}
