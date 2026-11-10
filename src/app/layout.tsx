import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DemoBanner } from "@/components/layout/demo-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.product}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: `${SITE.name} – ${SITE.product}`,
  // Herramienta interna: no debe aparecer en buscadores.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f3a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={SITE.locale} className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="text-brand-600 sr-only rounded-lg bg-white px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Saltar al contenido
        </a>
        <DemoBanner />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
