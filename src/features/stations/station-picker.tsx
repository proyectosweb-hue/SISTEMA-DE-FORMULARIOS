"use client";

import { CheckIcon, PinIcon } from "@/components/icons";
import { STATIONS } from "@/config/stations";
import { selectStation, useSelectedStation } from "./selected-station";

export function StationPicker() {
  const selected = useSelectedStation();

  return (
    <div>
      <fieldset className="min-w-0">
        <legend className="sr-only">Estaciones de servicio</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((station) => {
            const id = `estacion-${station.slug}`;
            return (
              <div key={station.slug} className="relative">
                <input
                  type="radio"
                  name="estacion"
                  id={id}
                  value={station.slug}
                  checked={selected?.slug === station.slug}
                  onChange={() => selectStation(station.slug)}
                  className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
                />
                <label
                  htmlFor={id}
                  className="border-line peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-focus-visible:outline-accent-500 peer-checked:[&_.pin]:bg-brand-600 peer-checked:[&_.tick]:border-ok-600 peer-checked:[&_.tick]:bg-ok-600 flex min-h-[72px] items-center gap-3.5 rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 transition-colors peer-checked:shadow-[0_0_0_3px_rgb(30_79_163/0.14)] peer-hover:border-[#aebbd2] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-checked:[&_.pin]:text-white peer-checked:[&_.tick]:text-white"
                >
                  <span className="pin bg-brand-100 text-brand-600 grid size-10 flex-none place-items-center rounded-[10px]">
                    <PinIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block leading-tight font-bold">{station.name}</span>
                    <span className="text-muted block text-sm">{station.location}</span>
                  </span>
                  <span className="tick border-line ml-auto grid size-6 flex-none place-items-center rounded-full border-2 text-transparent">
                    <CheckIcon size={14} />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p
        aria-live="polite"
        className={`mt-4 rounded-xl px-3.5 py-3 text-[0.93rem] ${
          selected ? "bg-brand-100 text-[#173a73]" : "text-muted bg-[#f1f4f9]"
        }`}
      >
        {selected ? (
          <>
            Enviarás los formularios como{" "}
            <strong>
              {selected.name} – {selected.location}
            </strong>
            . Lo recordaremos en este dispositivo; podrás cambiarla cuando quieras.
          </>
        ) : (
          "Aún no has seleccionado una estación."
        )}
      </p>
    </div>
  );
}
