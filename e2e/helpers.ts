import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";

export const SUPABASE_TEST_URL = "https://proyecto-de-prueba.supabase.co";
export const REFERENCE = "JG-3F2B8C1E";

type Json = Record<string, unknown>;

export type BackendMock = {
  uploadRequests: Json[];
  submissions: Json[];
  storagePuts: number;
};

type Options = {
  /** Respuestas sucesivas de POST /api/submissions (la última se repite). */
  submissionResponses?: { status: number; body: unknown }[];
  /** Código HTTP de Storage al subir cada foto. */
  storageStatus?: number;
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "PUT, POST, OPTIONS",
};

/**
 * Sustituye por respuestas simuladas las dos rutas de la API y Supabase Storage.
 * Las pruebas e2e verifican el flujo del NAVEGADOR (formulario, fotos, subida y envío)
 * sin depender de servicios reales; el servidor se prueba por separado con pruebas unitarias.
 */
export async function mockBackend(
  page: Page,
  options: Options = {},
): Promise<BackendMock> {
  const mock: BackendMock = { uploadRequests: [], submissions: [], storagePuts: 0 };
  const submissionResponses = options.submissionResponses ?? [
    { status: 201, body: { referenceCode: REFERENCE } },
  ];

  await page.route("**/api/uploads", async (route) => {
    const body = route.request().postDataJSON() as {
      submissionId: string;
      stationSlug: string;
      files: unknown[];
    };
    mock.uploadRequests.push(body);
    const uploads = body.files.map(() => ({
      path: `${body.stationSlug}/2026/11/${body.submissionId}/${randomUUID()}.jpg`,
      token: "token-de-prueba",
    }));
    await route.fulfill({ json: { uploads } });
  });

  await page.route(`${SUPABASE_TEST_URL}/storage/v1/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    mock.storagePuts += 1;
    await route.fulfill({
      status: options.storageStatus ?? 200,
      headers: CORS,
      contentType: "application/json",
      body: JSON.stringify({ Key: "evidencias/archivo" }),
    });
  });

  await page.route("**/api/submissions", async (route) => {
    mock.submissions.push(route.request().postDataJSON() as Json);
    const index = Math.min(mock.submissions.length - 1, submissionResponses.length - 1);
    const { status, body } = submissionResponses[index]!;
    await route.fulfill({ status, json: body as object });
  });

  return mock;
}

/** Opción de estación (por rol: el nombre "Junquito Gas" también aparece en el logotipo). */
export function stationRadio(page: Page, name: string) {
  return page.getByRole("radio", { name: new RegExp(name) });
}

/** Elige una estación en la página de inicio. */
export async function chooseStation(page: Page, name: string) {
  await page.goto("/");
  await stationRadio(page, name).check({ force: true });
}

/** Genera un JPEG grande (como una foto de celular) dentro del navegador. */
export async function makeJpeg(page: Page, width = 3200, height = 2400) {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w!;
      canvas.height = h!;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w!, h!);
      gradient.addColorStop(0, "#1e4fa3");
      gradient.addColorStop(1, "#f5a524");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w!, h!);
      return canvas.toDataURL("image/jpeg", 0.95).split(",")[1]!;
    },
    [width, height],
  );
  return {
    name: "foto.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}
