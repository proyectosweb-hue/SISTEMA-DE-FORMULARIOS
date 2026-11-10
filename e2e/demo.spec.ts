import { expect, test } from "@playwright/test";
import { chooseStation, makeJpeg } from "./helpers";

/**
 * Flujo REAL en modo demostración: no se intercepta ninguna petición. El servidor de pruebas
 * usa la simulación en memoria (sin Supabase ni credenciales).
 */
const FORM_URL = "/formularios/prueba-tecnica";
const REFERENCE_PATTERN = /^JG-[0-9A-F]{8}$/;

test.describe("modo demostración (sin simular la red)", () => {
  test("muestra el aviso permanente de modo demostración", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("note")).toContainText("MODO DEMOSTRACIÓN");
    await expect(page.getByRole("note")).toContainText("No se usa ningún servicio real");
  });

  test("completa el flujo: foto → subida → envío → confirmación, sin salir del servidor local", async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL!).origin;
    const external: string[] = [];
    const api: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin && url.protocol.startsWith("http"))
        external.push(request.url());
    });
    page.on("response", (response) => {
      const { pathname } = new URL(response.url());
      if (pathname.startsWith("/api/"))
        api.push(
          `${response.request().method()} ${pathname.split("/").slice(0, 3).join("/")} ${response.status()}`,
        );
    });

    await chooseStation(page, "Pedregal Gas");
    await page.goto(FORM_URL);
    await page
      .getByLabel(/Comentario/)
      .fill("Prueba del flujo completo en modo demostración.");
    await page
      .getByTestId("galeria-evidencia")
      .setInputFiles([
        await makeJpeg(page, 3000, 2000),
        await makeJpeg(page, 2000, 3000),
      ]);
    await expect(
      page.getByRole("list", { name: "Fotos adjuntas" }).getByRole("listitem"),
    ).toHaveCount(2);

    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(page).toHaveURL(/\/enviado\/JG-[0-9A-F]{8}$/);
    const code = (await page.getByTestId("codigo-referencia").innerText()).trim();
    expect(code).toMatch(REFERENCE_PATTERN);

    // Se firmó, se subió cada foto al almacenamiento simulado y se guardó el envío.
    expect(api).toContain("POST /api/uploads 200");
    expect(api.filter((line) => line.startsWith("PUT /api/demo"))).toEqual([
      "PUT /api/demo 200",
      "PUT /api/demo 200",
    ]);
    expect(api).toContain("POST /api/submissions 201");
    // Ninguna petición salió hacia servicios externos.
    expect(external).toEqual([]);
  });

  test("cada envío recibe un código de referencia distinto", async ({ page }) => {
    const codes: string[] = [];
    for (const station of ["Ciruelo Gas", "Baitoa Gas"]) {
      await chooseStation(page, station);
      await page.goto(FORM_URL);
      await page
        .getByTestId("galeria-evidencia")
        .setInputFiles(await makeJpeg(page, 1200, 900));
      await page.getByRole("button", { name: "Enviar formulario" }).click();
      await expect(page).toHaveURL(/\/enviado\//);
      codes.push((await page.getByTestId("codigo-referencia").innerText()).trim());
    }
    expect(new Set(codes).size).toBe(2);
  });

  test("conserva las validaciones: sin foto no se envía", async ({ page }) => {
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(page.getByText("Adjunta al menos 1 foto.")).toBeVisible();
    await expect(page).toHaveURL(FORM_URL);
  });
});
