import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "./rate-limit";

const options = { limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("permite hasta el límite y bloquea el excedente indicando cuándo reintentar", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++)
      expect(checkRateLimit("ip", options, t0 + i).allowed).toBe(true);

    const blocked = checkRateLimit("ip", options, t0 + 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("vuelve a permitir cuando la ventana deslizante libera cupo", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("ip", options, t0);
    expect(checkRateLimit("ip", options, t0 + 59_999).allowed).toBe(false);
    expect(checkRateLimit("ip", options, t0 + 60_001).allowed).toBe(true);
  });

  it("cuenta cada clave por separado", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", options, 1);
    expect(checkRateLimit("a", options, 2).allowed).toBe(false);
    expect(checkRateLimit("b", options, 2).allowed).toBe(true);
  });

  it("no cuenta los intentos bloqueados (no se 'castiga' más)", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip", options, 0);
    for (let i = 0; i < 50; i++) checkRateLimit("ip", options, 1_000);
    expect(checkRateLimit("ip", options, 60_001).allowed).toBe(true);
  });
});
