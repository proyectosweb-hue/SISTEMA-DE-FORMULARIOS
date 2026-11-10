import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <main id="contenido" className="py-10">
      <div className="mx-auto w-full max-w-[560px] px-4">
        <Panel>
          <h1 className="mb-2 text-2xl font-bold">No encontramos esta página</h1>
          <p className="text-muted mb-6">
            Es posible que el enlace esté incompleto o que el formulario ya no esté
            disponible.
          </p>
          <Link href="/" className={buttonClasses()}>
            Ir al inicio
          </Link>
        </Panel>
      </div>
    </main>
  );
}
