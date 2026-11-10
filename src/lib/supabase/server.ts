import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoSupabase } from "@/lib/demo/fake-supabase";
import { isDemoMode } from "@/lib/demo/mode";
import { getServerEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/**
 * Cliente de Supabase con la clave SECRETA (omite RLS). Solo para código de servidor:
 * `server-only` hace fallar la compilación si algún componente de cliente lo importa.
 *
 * En MODO DEMOSTRACIÓN (nunca en producción) devuelve una simulación en memoria y no usa
 * ninguna credencial ni servicio real.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (isDemoMode()) return createDemoSupabase();
  if (!client) {
    const env = getServerEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
