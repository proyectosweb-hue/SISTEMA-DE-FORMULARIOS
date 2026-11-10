import { isDemoMode } from "@/lib/demo/mode";

/**
 * Aviso permanente cuando la aplicación corre en MODO DEMOSTRACIÓN, para que nadie confunda
 * una prueba con el sistema real. No se muestra nunca en producción.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div
      role="note"
      className="bg-accent-500 text-navy-900 px-4 py-2 text-center text-sm font-semibold"
    >
      MODO DEMOSTRACIÓN · Los envíos y las fotos se guardan solo en la memoria del
      servidor de pruebas y se pierden al reiniciarlo. No se usa ningún servicio real.
    </div>
  );
}
