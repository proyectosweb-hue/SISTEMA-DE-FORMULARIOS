import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Panel } from "@/components/ui/panel";
import { FormRenderer } from "@/features/forms/components/form-renderer";
import { getForm } from "@/features/forms/registry";

export const metadata: Metadata = { title: "Formulario" };

export default function FormPage(props: PageProps<"/formularios/[slug]">) {
  return (
    <main id="contenido" className="py-6 sm:py-8">
      <div className="mx-auto w-full max-w-[760px] px-4">
        <Suspense
          fallback={
            <Panel>
              <p role="status" className="text-muted">
                Cargando formulario…
              </p>
            </Panel>
          }
        >
          <FormLoader params={props.params} />
        </Suspense>
      </div>
    </main>
  );
}

// `params` es un dato de la petición: se lee dentro de <Suspense> para que el resto de la
// página siga siendo estática (ver Cache Components en la documentación de Next.js).
async function FormLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = getForm(slug);
  if (!form) notFound();
  return <FormRenderer form={form} />;
}
