"use client";

import Link from "next/link";
import { ArrowRightIcon, FileIcon, InfoIcon } from "@/components/icons";
import { useSelectedStation } from "@/features/stations/selected-station";
import type { FormSummary } from "../types";

/**
 * Lista de formularios disponibles. Mientras la empresa no defina formularios,
 * se muestran solo marcadores de posición (sin inventar ninguno).
 */
export function FormsPanel({ forms }: { forms: FormSummary[] }) {
  const station = useSelectedStation();

  if (forms.length === 0) {
    return (
      <div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="grid min-h-37 content-start gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-[#b8c4d9] bg-[#fafbfd] p-[18px]"
            >
              <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#eceff5] text-[#8a97ad]">
                <FileIcon />
              </span>
              <span className="text-xs font-bold tracking-wider text-[#7a879c] uppercase">
                Formulario por definir
              </span>
              <span className="h-2.5 w-[85%] rounded-md bg-[#e6ebf3]" />
              <span className="h-2.5 w-[60%] rounded-md bg-[#e6ebf3]" />
            </div>
          ))}
        </div>
        <p className="text-muted mt-4 flex items-start gap-2 text-[0.9rem]">
          <InfoIcon size={18} className="mt-0.5 flex-none" />
          <span>
            Aquí aparecerán los formularios una vez que la empresa los defina. Las
            tarjetas mostradas son solo un marcador de posición.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div>
      {!station && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.93rem] text-[#6b4e00]">
          <InfoIcon size={18} className="mt-0.5 flex-none" />
          <span>Primero selecciona tu estación en el paso 1.</span>
        </p>
      )}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => {
          const content = (
            <>
              <span className="bg-brand-100 text-brand-600 grid size-10 flex-none place-items-center rounded-[10px]">
                <FileIcon />
              </span>
              <span className="min-w-0">
                <span className="block leading-tight font-bold">{form.title}</span>
                {form.description && (
                  <span className="text-muted mt-0.5 block text-sm">
                    {form.description}
                  </span>
                )}
              </span>
              <ArrowRightIcon className="text-brand-600 ml-auto flex-none" />
            </>
          );
          const base =
            "flex min-h-[72px] items-center gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3.5";

          return (
            <li key={form.slug}>
              {station ? (
                <Link
                  href={`/formularios/${form.slug}`}
                  className={`${base} border-line hover:border-brand-600 hover:bg-brand-50 bg-white`}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className={`${base} border-line bg-[#fafbfd] opacity-60`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
