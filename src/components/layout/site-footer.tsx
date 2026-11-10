import { SITE } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 py-7 text-sm text-[#b9c7de]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-7 gap-y-3 px-4">
        <p>
          <strong className="text-white">{SITE.name}</strong> · {SITE.product}
        </p>
        <p>
          ¿Necesitas ayuda?{" "}
          <span className="rounded-md bg-white/10 px-2 py-0.5">
            Contacto de soporte por definir
          </span>
        </p>
      </div>
    </footer>
  );
}
