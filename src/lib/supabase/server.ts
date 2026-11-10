import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/**
 * Cliente de Supabase con la clave SECRETA (omite RLS). Solo para código de servidor:
 * `server-only` hace fallar la compilación si algún componente de cliente lo importa.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const env = getServerEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
