import { describe, expect, it } from "vitest";
import { isDemoMode } from "./mode";

describe("isDemoMode", () => {
  it("está desactivado por defecto", () => {
    expect(isDemoMode({})).toBe(false);
    expect(isDemoMode({ DEMO_MODE: "" })).toBe(false);
    expect(isDemoMode({ DEMO_MODE: "false" })).toBe(false);
    expect(isDemoMode({ DEMO_MODE: "1" })).toBe(false);
  });

  it("se activa solo con DEMO_MODE=true", () => {
    expect(isDemoMode({ DEMO_MODE: "true" })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: "true", VERCEL_ENV: "preview" })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: "true", VERCEL_ENV: "development" })).toBe(true);
  });

  it("NUNCA se activa en producción, aunque la variable esté configurada", () => {
    expect(isDemoMode({ DEMO_MODE: "true", VERCEL_ENV: "production" })).toBe(false);
  });
});
