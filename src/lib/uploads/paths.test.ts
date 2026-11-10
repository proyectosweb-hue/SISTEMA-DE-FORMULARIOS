import { describe, expect, it } from "vitest";
import { buildEvidencePath, evidenceFolder, isEvidencePathFor } from "./paths";

const owner = {
  stationSlug: "junquito",
  submissionId: "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b",
} as const;

describe("rutas de evidencias", () => {
  it("construye una ruta ordenada por estación, año, mes y envío con nombre aleatorio", () => {
    const path = buildEvidencePath({
      ...owner,
      type: "image/jpeg",
      now: new Date("2026-11-10T15:00:00Z"),
      fileId: "11111111-2222-4333-8444-555555555555",
    });
    expect(path).toBe(
      "junquito/2026/11/3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b/11111111-2222-4333-8444-555555555555.jpg",
    );
    expect(evidenceFolder(path)).toBe(
      "junquito/2026/11/3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b",
    );
  });

  it("acepta únicamente las rutas generadas para esa estación y ese envío", () => {
    const own = buildEvidencePath({ ...owner, type: "image/webp" });
    expect(isEvidencePathFor(own, owner)).toBe(true);
    expect(isEvidencePathFor(own, { ...owner, stationSlug: "verdun" })).toBe(false);
    expect(
      isEvidencePathFor(own, {
        ...owner,
        submissionId: "00000000-0000-4000-8000-000000000000",
      }),
    ).toBe(false);
  });

  it("rechaza recorridos de ruta, extensiones y nombres no generados por el servidor", () => {
    const folder = "junquito/2026/11/3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";
    const id = "11111111-2222-4333-8444-555555555555";
    expect(isEvidencePathFor(`${folder}/../../otra/${id}.jpg`, owner)).toBe(false);
    expect(isEvidencePathFor(`${folder}/${id}.exe`, owner)).toBe(false);
    expect(isEvidencePathFor(`${folder}/foto.jpg`, owner)).toBe(false);
    expect(
      isEvidencePathFor(
        `junquito/2026/13/3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b/${id}.jpg`,
        owner,
      ),
    ).toBe(false);
    expect(isEvidencePathFor(`${folder}/${id}.jpg/extra`, owner)).toBe(false);
  });
});
