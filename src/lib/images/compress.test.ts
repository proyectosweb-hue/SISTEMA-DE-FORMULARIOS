import { describe, expect, it } from "vitest";
import { fitWithin, MAX_IMAGE_DIMENSION } from "./compress";

describe("fitWithin", () => {
  it("no agranda imágenes que ya caben", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_IMAGE_DIMENSION, 1000)).toEqual({
      width: MAX_IMAGE_DIMENSION,
      height: 1000,
    });
  });

  it("reduce conservando la proporción cuando el lado mayor excede el máximo", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1440, height: 1920 });
    expect(fitWithin(8000, 1000, 1600)).toEqual({ width: 1600, height: 200 });
  });

  it("nunca devuelve dimensiones mayores al máximo", () => {
    for (const [w, h] of [
      [12000, 9000],
      [9000, 12000],
      [1921, 1],
      [5000, 5000],
    ] as const) {
      const out = fitWithin(w, h);
      expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    }
  });
});
