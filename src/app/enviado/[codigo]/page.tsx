import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Formulario enviado" };

/** Formato del código de referencia (ver reference_code en la migración). */
const REFERENCE_PATTERN = /^JG-[0-9A-F]{8}$/;

export default function SubmittedPage(props: PageProps<"/enviado/[codigo]">) {
  return (
    <main id="contenido" className="py-8">
      <div className="mx-auto w-full max-w-[560px] px-4">
        <Suspense fallback={<Panel>Cargando…</Panel>}>
          <Confirmation params={props.params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Confirmation({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!REFERENCE_PATTERN.test(codigo)) notFound();

  return (
    <Panel labelledBy="titulo-enviado">
      <span className="bg-ok-600 mb-4 grid size-14 place-items-center rounded-full text-white">
        <CheckIcon size={28} />
      </span>
      <h1 id="titulo-enviado" className="text-2xl font-bold">
        ¡Formulario enviado!
      </h1>
      <p className="text-muted mt-2">
        Guardamos tu formulario correctamente. Anota este código de referencia por si
        necesitas consultarlo:
      </p>
      <p
        data-testid="codigo-referencia"
        className="bg-brand-100 my-5 rounded-xl py-4 text-center font-mono text-2xl font-bold tracking-wider text-[#173a73]"
      >
        {codigo}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses()}>
          Enviar otro formulario
        </Link>
      </div>
    </Panel>
  );
}
