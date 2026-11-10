import { describe, expect, it } from "vitest";
import { STATIONS, STATION_SLUGS, getStation, isStationSlug } from "./stations";

describe("estaciones", () => {
  it("define exactamente las 9 estaciones de Junquito Gas", () => {
    expect(STATIONS).toHaveLength(9);
    expect(STATIONS.map((s) => s.name)).toEqual([
      "Ciruelo Gas",
      "Baitoa Gas",
      "La Herradura Gas",
      "Verdun Gas",
      "Pedregal Gas",
      "Junquito Gas",
      "Burende Gas",
      "San José Gas",
      "Monumental Gas",
    ]);
  });

  it("usa slugs únicos y seguros para URLs y rutas de almacenamiento", () => {
    const slugs = STATIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(STATION_SLUGS).toEqual(slugs);
  });

  it("reconoce solo slugs válidos", () => {
    expect(isStationSlug("junquito")).toBe(true);
    expect(isStationSlug("no-existe")).toBe(false);
    expect(isStationSlug(undefined)).toBe(false);
    expect(getStation("monumental")?.location).toBe("Santo Domingo");
    expect(getStation("../etc")).toBeUndefined();
  });
});
