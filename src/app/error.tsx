"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="contenido" className="py-10">
      <div className="mx-auto w-full max-w-[560px] px-4">
        <Panel>
          <h1 className="mb-2 text-2xl font-bold">Algo salió mal</h1>
          <p className="text-muted mb-6">
            No pudimos mostrar esta página. Inténtalo de nuevo; si el problema continúa,
            vuelve al inicio.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>Reintentar</Button>
            <Link href="/" className={buttonClasses("secondary")}>
              Ir al inicio
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  );
}
