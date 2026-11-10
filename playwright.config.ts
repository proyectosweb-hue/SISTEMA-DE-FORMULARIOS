import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Pruebas de extremo a extremo en dos formatos de pantalla (celular y escritorio).
 *
 * - Localmente se puede apuntar a un Chromium ya instalado con PW_CHROMIUM_PATH.
 * - El servidor se compila con el formulario técnico habilitado y una URL de Supabase
 *   ficticia: las pruebas interceptan las llamadas de red, no tocan servicios reales.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: process.env.CI ? "on-first-retry" : "off",
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ENABLE_TECHNICAL_FORM: "true",
      // Simulación en memoria: permite probar el flujo real completo sin interceptar la red.
      DEMO_MODE: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://proyecto-de-prueba.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "clave-publicable-de-prueba",
    },
  },
});
