import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resuelve los alias de tsconfig.json (p. ej. "@/*") de forma nativa.
    tsconfigPaths: true,
    alias: {
      // `server-only` lanza un error fuera de Next.js; en pruebas se sustituye por un módulo vacío.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "supabase/**/*.test.ts"],
    restoreMocks: true,
  },
});
