import "server-only";
import { z } from "zod";

/** La configuración del servidor falta o es incorrecta (no es un error del usuario). */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

/**
 * Variables de entorno que SOLO usa el servidor. Se validan al usarlas (no al compilar),
 * y el mensaje de error menciona únicamente los NOMBRES de las variables, nunca sus valores.
 */
export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new ConfigError(
      `Faltan o son inválidas estas variables de entorno: ${names.join(", ")}.`,
    );
  }
  return parsed.data;
}
