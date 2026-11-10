import { expect, test } from "@playwright/test";
import { chooseStation, makeJpeg, mockBackend } from "./helpers";

const FORM_URL = "/formularios/prueba-tecnica";

test.describe("avisos y diseño del campo de fotografías", () => {
  test("los avisos de fotos desaparecen cuando la persona los corrige", async ({
    page,
  }) => {
    await mockBackend(page);
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    const send = page.getByRole("button", { name: "Enviar formulario" });

    await send.click();
    await expect(page.getByText("Adjunta al menos 1 foto.")).toBeVisible();
    await expect(page.getByText("Revisa las fotografías adjuntas.")).toBeVisible();

    // Al adjuntar una foto, ambos avisos dejan de describir lo que se ve y se retiran.
    await page
      .getByTestId("galeria-evidencia")
      .setInputFiles(await makeJpeg(page, 1200, 900));
    await expect(page.getByRole("img", { name: /Foto 1/ })).toBeVisible();
    await expect(page.getByText("Adjunta al menos 1 foto.")).toHaveCount(0);
    await expect(page.getByText("Revisa las fotografías adjuntas.")).toHaveCount(0);

    // Si la quita y vuelve a enviar, el aviso vuelve a aparecer.
    await page.getByRole("button", { name: "Quitar foto 1" }).click();
    await send.click();
    await expect(page.getByText("Adjunta al menos 1 foto.")).toBeVisible();
  });

  test("los botones de cámara y galería no parten su texto en celulares angostos", async ({
    page,
  }) => {
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);

    for (const text of ["Tomar foto", "Elegir de la galería"]) {
      // Cuenta las líneas reales de texto del botón (una altura fija no las distingue).
      const lines = await page.locator("label", { hasText: text }).evaluate((element) => {
        const tops = new Set<number>();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) tops.add(Math.round(rect.top));
        }
        return tops.size;
      });
      expect(lines, `"${text}" debe verse en una sola línea`).toBe(1);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
