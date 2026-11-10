import { HowItWorks } from "@/components/home/how-it-works";
import { Panel, StepHeading } from "@/components/ui/panel";
import { SITE } from "@/config/site";
import { FormsPanel } from "@/features/forms/components/forms-panel";
import { listFormSummaries } from "@/features/forms/registry";
import { StationPicker } from "@/features/stations/station-picker";

const HIGHLIGHTS = [
  "9 estaciones",
  "Un único enlace",
  "Fotos desde la cámara o la galería",
];

export default function HomePage() {
  const forms = listFormSummaries();

  return (
    <>
      <section className="bg-[radial-gradient(900px_300px_at_85%_-20%,rgb(245_165_36/0.18),transparent_60%),linear-gradient(180deg,var(--color-navy-900),var(--color-navy-800))] pt-10 pb-[76px] text-white">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <span className="text-accent-500 mb-2.5 inline-block text-xs font-bold tracking-[0.09em] uppercase">
            {SITE.product}
          </span>
          <h1 className="mb-3 max-w-[18ch] text-[clamp(1.7rem,4.6vw,2.7rem)] leading-[1.15] font-bold tracking-tight">
            Todos los formularios de tus estaciones, en un solo lugar
          </h1>
          <p className="max-w-[56ch] text-[clamp(1rem,2.2vw,1.12rem)] text-[#cdd9ec]">
            Selecciona tu estación, completa el formulario y adjunta fotografías como
            evidencia desde tu celular, tablet o computadora.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Características">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="text-brand-100 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main id="contenido" className="-mt-11 pb-10">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <Panel labelledBy="titulo-estacion">
            <StepHeading
              id="titulo-estacion"
              step={1}
              title="Selecciona tu estación"
              description="Cada formulario que envíes quedará asociado a la estación que elijas."
            />
            <StationPicker />
          </Panel>

          <Panel labelledBy="titulo-formularios">
            <StepHeading
              id="titulo-formularios"
              step={2}
              title="Formularios disponibles"
              description="Elige el formulario que necesitas completar."
            />
            <FormsPanel forms={forms} />
          </Panel>

          <Panel labelledBy="titulo-como-funciona">
            <StepHeading id="titulo-como-funciona" title="Cómo funciona" />
            <HowItWorks />
          </Panel>
        </div>
      </main>
    </>
  );
}
