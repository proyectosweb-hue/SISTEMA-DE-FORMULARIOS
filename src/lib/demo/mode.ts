type EnvLike = Readonly<Record<string, string | undefined>>;

/**
 * MODO DEMOSTRACIÓN: reemplaza Supabase por una simulación en memoria para poder probar la
 * interfaz completa (fotos, envío, confirmación) sin ningún servicio real ni credenciales.
 *
 * Se activa solo con DEMO_MODE=true y NUNCA en el entorno de producción de Vercel, aunque la
 * variable se haya configurado por error. Los datos viven en la memoria del servidor y se
 * pierden al reiniciarlo.
 */
export function isDemoMode(env: EnvLike = process.env): boolean {
  return env.DEMO_MODE === "true" && env.VERCEL_ENV !== "production";
}
