#!/usr/bin/env node
/**
 * Inicia la aplicación en MODO DEMOSTRACIÓN para probar la interfaz completa sin ningún
 * servicio externo ni credenciales: Supabase se sustituye por una simulación en memoria y se
 * habilita el formulario técnico de prueba.
 *
 *   pnpm demo            -> servidor de desarrollo en http://localhost:3000
 *   pnpm demo -p 4000    -> otro puerto
 *
 * Los datos se pierden al detener el servidor. Nunca se usa en producción.
 */
import { spawn } from "node:child_process";

const env = { ...process.env, DEMO_MODE: "true", ENABLE_TECHNICAL_FORM: "true" };
const args = ["exec", "next", "dev", ...process.argv.slice(2)];

console.log("Modo demostración: sin Supabase, datos simulados en memoria.\n");

const child = spawn("pnpm", args, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
