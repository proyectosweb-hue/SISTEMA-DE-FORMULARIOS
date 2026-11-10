import { expect, test } from "@playwright/test";
import { chooseStation, makeJpeg, mockBackend, REFERENCE } from "./helpers";

const FORM_URL = "/formularios/prueba-tecnica";

test.describe("formulario con fotografías", () => {
  test("pide elegir estación antes de mostrar el formulario", async ({ page }) => {
    await page.goto(FORM_URL);
    await expect(
      page.getByRole("heading", { name: "Primero selecciona tu estación" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Elegir estación" }).click();
    await expect(page).toHaveURL("/");
  });

  test("ofrece cámara y galería con los atributos correctos", async ({ page }) => {
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    await expect(page.getByText("Estación:")).toContainText("Junquito Gas");

    const camera = page.getByTestId("camara-evidencia");
    const gallery = page.getByTestId("galeria-evidencia");
    await expect(camera).toHaveAttribute("capture", "environment");
    await expect(camera).toHaveAttribute("accept", "image/*");
    await expect(gallery).toHaveAttribute("accept", "image/*");
    await expect(gallery).toHaveAttribute("multiple", "");
    await expect(gallery).not.toHaveAttribute("capture");
  });

  test("exige al menos una foto y no envía nada si falta", async ({ page }) => {
    const mock = await mockBackend(page);
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);

    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(page.getByText("Adjunta al menos 1 foto.")).toBeVisible();
    expect(mock.submissions).toHaveLength(0);
    expect(mock.uploadRequests).toHaveLength(0);
  });

  test("reduce la foto, la sube a Storage y envía el formulario", async ({ page }) => {
    const mock = await mockBackend(page);
    await chooseStation(page, "La Herradura Gas");
    await page.goto(FORM_URL);

    const photo = await makeJpeg(page, 3200, 2400);
    await page.getByTestId("galeria-evidencia").setInputFiles(photo);

    const thumbnail = page.getByRole("img", { name: /Foto 1/ });
    await expect(thumbnail).toBeVisible();
    // La foto original es de 3200 px: debe haberse reducido a 1920 px como máximo.
    const width = await thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(width).toBeLessThanOrEqual(1920);
    expect(width).toBeGreaterThan(1000);

    await page.getByLabel(/Comentario/).fill("  Todo en orden  ");
    await page.getByRole("button", { name: "Enviar formulario" }).click();

    await expect(page).toHaveURL(`/enviado/${REFERENCE}`);
    await expect(page.getByTestId("codigo-referencia")).toHaveText(REFERENCE);

    expect(mock.uploadRequests).toHaveLength(1);
    expect(mock.storagePuts).toBe(1);
    expect(mock.submissions).toHaveLength(1);

    const sent = mock.submissions[0] as {
      submissionId: string;
      stationSlug: string;
      formSlug: string;
      answers: Record<string, unknown>;
      attachments: { fieldKey: string; path: string }[];
      website: string;
    };
    expect(sent.stationSlug).toBe("la-herradura");
    expect(sent.formSlug).toBe("prueba-tecnica");
    expect(sent.answers).toEqual({ comentario: "Todo en orden" });
    expect(sent.website).toBe("");
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments[0]!.fieldKey).toBe("evidencia");
    expect(sent.attachments[0]!.path).toContain(
      `la-herradura/2026/11/${sent.submissionId}/`,
    );

    // Lo que se subió ya está reducido (el tamaño declarado al servidor es el de la foto procesada).
    const declared = (
      mock.uploadRequests[0] as { files: { contentType: string; size: number }[] }
    ).files[0]!;
    expect(declared.contentType).toBe("image/jpeg");
    expect(declared.size).toBeLessThan(photo.buffer.length);
  });

  test("limita el número de fotos y permite quitarlas", async ({ page }) => {
    await mockBackend(page);
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);

    const photos = await Promise.all([1, 2, 3, 4].map(() => makeJpeg(page, 800, 600)));
    await page.getByTestId("galeria-evidencia").setInputFiles(photos);

    await expect(
      page.getByRole("list", { name: "Fotos adjuntas" }).getByRole("listitem"),
    ).toHaveCount(3);
    await expect(page.getByText(/Solo se adjuntaron 3/)).toBeVisible();
    await expect(page.getByTestId("galeria-evidencia")).toBeDisabled();

    await page.getByRole("button", { name: "Quitar foto 1" }).click();
    await expect(
      page.getByRole("list", { name: "Fotos adjuntas" }).getByRole("listitem"),
    ).toHaveCount(2);
    await expect(page.getByTestId("galeria-evidencia")).toBeEnabled();
  });

  test("rechaza archivos que no son imágenes sin romper el formulario", async ({
    page,
  }) => {
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);

    await page.getByTestId("galeria-evidencia").setInputFiles({
      name: "documento.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("esto no es una imagen"),
    });
    await expect(page.getByText(/No pudimos leer esta imagen/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Fotos adjuntas" })).toHaveCount(0);
  });

  test("si el servidor dice que una foto quedó incompleta, vuelve a subirla y reenvía", async ({
    page,
  }) => {
    const mock = await mockBackend(page, {
      submissionResponses: [
        {
          status: 400,
          body: {
            error: {
              code: "attachment_missing",
              message: "Una fotografía no se subió completa. Vuelve a adjuntarla.",
            },
          },
        },
        { status: 201, body: { referenceCode: REFERENCE } },
      ],
    });
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    await page
      .getByTestId("galeria-evidencia")
      .setInputFiles(await makeJpeg(page, 1000, 800));

    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "no se subió completa" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar formulario" })).toBeEnabled();

    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(page).toHaveURL(`/enviado/${REFERENCE}`);

    // Se reutilizó el mismo id de envío (el servidor no duplica) y se volvió a subir la foto.
    expect(mock.submissions).toHaveLength(2);
    expect((mock.submissions[0] as { submissionId: string }).submissionId).toBe(
      (mock.submissions[1] as { submissionId: string }).submissionId,
    );
    expect(mock.storagePuts).toBe(2);
  });

  test("si falla la subida de la foto, avisa y permite reintentar sin perder datos", async ({
    page,
  }) => {
    const mock = await mockBackend(page, { storageStatus: 500 });
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    await page.getByLabel(/Comentario/).fill("Texto que no se debe perder");
    await page
      .getByTestId("galeria-evidencia")
      .setInputFiles(await makeJpeg(page, 1000, 800));

    await page.getByRole("button", { name: "Enviar formulario" }).click();
    await expect(page.getByText(/No se pudo subir una fotografía/)).toBeVisible();
    await expect(page.getByLabel(/Comentario/)).toHaveValue(
      "Texto que no se debe perder",
    );
    await expect(page.getByRole("button", { name: "Enviar formulario" })).toBeEnabled();
    expect(mock.submissions).toHaveLength(0);
  });

  test("el señuelo anti-bots no es visible ni enfocable para las personas", async ({
    page,
  }) => {
    await chooseStation(page, "Junquito Gas");
    await page.goto(FORM_URL);
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    const box = await honeypot.boundingBox();
    expect(box === null || box.x < -1000 || box.width === 0).toBe(true);
  });
});
