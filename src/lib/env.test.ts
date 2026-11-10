import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, getServerEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("getServerEnv", () => {
  it("devuelve la configuración cuando está completa", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secreto");
    expect(getServerEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      SUPABASE_SECRET_KEY: "secreto",
    });
  });

  it("indica qué variables faltan sin revelar valores", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "no-es-una-url-valida");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const attempt = () => getServerEnv();
    expect(attempt).toThrow(ConfigError);
    try {
      attempt();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(message).toContain("SUPABASE_SECRET_KEY");
      expect(message).not.toContain("no-es-una-url-valida");
    }
  });
});
