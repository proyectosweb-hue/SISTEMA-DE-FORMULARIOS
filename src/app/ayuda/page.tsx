import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Panel, StepHeading } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Ayuda" };

export default function HelpPage() {
  return (
    <main id="contenido" className="py-8">
      <div className="mx-auto w-full max-w-[760px] px-4">
        <Panel labelledBy="titulo-ayuda">
          <StepHeading id="titulo-ayuda" title="Ayuda" />

          <h3 className="mb-1 font-bold">Cómo adjuntar fotografías</h3>
          <ul className="text-muted mb-5 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Tomar foto:</strong> abre la cámara de tu
              celular. Después de tomarla, confírmala para adjuntarla.
            </li>
            <li>
              <strong className="text-ink">Elegir de la galería:</strong> selecciona una o
              varias fotos que ya tengas guardadas.
            </li>
            <li>
              Procura buena iluminación y mantén el celular estable para que la imagen
              salga nítida.
            </li>
            <li>Puedes quitar una foto con la “×” de su miniatura antes de enviar.</li>
          </ul>

          <h3 className="mb-1 font-bold">Si algo no funciona</h3>
          <ul className="text-muted mb-6 list-disc space-y-1.5 pl-5">
            <li>
              Si la señal es débil, espera a que termine de subir y no cierres la página
              hasta ver la confirmación con tu código de referencia.
            </li>
            <li>
              Si cambiaste de estación o de celular, vuelve al inicio y selecciona la
              estación correcta.
            </li>
            <li>
              Contacto de soporte: <em>por definir</em>.
            </li>
          </ul>

          <Link href="/" className={buttonClasses("secondary")}>
            Volver al inicio
          </Link>
        </Panel>
      </div>
    </main>
  );
}
