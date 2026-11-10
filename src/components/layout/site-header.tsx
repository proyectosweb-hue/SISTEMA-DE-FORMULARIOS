import Link from "next/link";
import { SITE } from "@/config/site";

/**
 * Barra superior. El recuadro punteado es un marcador de posición del logotipo:
 * NO es un logotipo real y debe reemplazarse por el oficial de la empresa.
 */
export function SiteHeader() {
  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex min-h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={`${SITE.name} – Inicio`}
        >
          <span
            aria-hidden="true"
            className="grid size-10 flex-none place-items-center rounded-[10px] border-2 border-dashed border-white/55 text-center text-[0.56rem] leading-[1.1] tracking-wider text-white/75"
          >
            LOGO
            <br />
            PROVI-
            <br />
            SIONAL
          </span>
          <span className="leading-tight font-bold">
            {SITE.name}
            <span className="block text-xs font-normal text-[#b9c7de]">
              {SITE.product}
            </span>
          </span>
        </Link>
        <Link
          href="/ayuda"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-white/30 px-3.5 text-sm font-semibold hover:bg-white/10"
        >
          Ayuda
        </Link>
      </div>
    </header>
  );
}
