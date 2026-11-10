import { expect, test } from "@playwright/test";
import { stationRadio } from "./helpers";

const STATIONS = [
  "Ciruelo Gas",
  "Baitoa Gas",
  "La Herradura Gas",
  "Verdun Gas",
  "Pedregal Gas",
  "Junquito Gas",
  "Burende Gas",
  "San José Gas",
  "Monumental Gas",
];

test.describe("página de inicio", () => {
  test("muestra las 9 estaciones sin desbordar la pantalla", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Todos los formularios",
    );
    await expect(page.getByRole("radio")).toHaveCount(9);
    for (const name of STATIONS) await expect(stationRadio(page, name)).toBeAttached();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("recuerda la estación elegida al recargar", async ({ page }) => {
    await page.goto("/");
    await stationRadio(page, "Burende Gas").check({ force: true });
    await expect(page.getByText(/Enviarás los formularios como/)).toContainText(
      "Burende Gas",
    );

    await page.reload();
    await expect(stationRadio(page, "Burende Gas")).toBeChecked();
    await expect(page.getByText(/Enviarás los formularios como/)).toContainText(
      "Burende Gas",
    );
  });

  test("ofrece el formulario técnico solo cuando hay una estación elegida", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByText("Primero selecciona tu estación en el paso 1."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Formulario técnico de prueba/ }),
    ).toHaveCount(0);

    await stationRadio(page, "Junquito Gas").check({ force: true });
    await expect(
      page.getByRole("link", { name: /Formulario técnico de prueba/ }),
    ).toBeVisible();
  });

  test("se puede usar con el teclado", async ({ page, isMobile }) => {
    test.skip(isMobile, "El teclado físico no aplica al emulador móvil.");
    await page.goto("/");
    await stationRadio(page, "Ciruelo Gas").focus();
    await page.keyboard.press("ArrowDown");
    await expect(stationRadio(page, "Baitoa Gas")).toBeChecked();
  });

  test("envía cabeceras de seguridad e impide la indexación", async ({
    page,
    request,
  }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain(
      "https://proyecto-de-prueba.supabase.co",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["permissions-policy"]).toContain("camera=(self)");
    expect(headers["x-powered-by"]).toBeUndefined();

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /");
  });

  test("las páginas de ayuda y de error se muestran correctamente", async ({ page }) => {
    await page.goto("/ayuda");
    await expect(page.getByRole("heading", { name: "Ayuda" })).toBeVisible();

    // La página se transmite por partes (streaming), por lo que el código HTTP ya es 200
    // cuando se detecta que el formulario no existe; lo importante es lo que ve la persona.
    await page.goto("/formularios/no-existe");
    await expect(page.getByText("No encontramos esta página")).toBeVisible();

    await page.goto("/enviado/codigo-falso");
    await expect(page.getByText("No encontramos esta página")).toBeVisible();
  });
});
