import type { ReactNode } from "react";

export function Panel({
  children,
  labelledBy,
  className = "",
}: {
  children: ReactNode;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`border-line shadow-panel mb-6 rounded-[18px] border bg-white p-5 sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

/** Encabezado de una sección, opcionalmente numerada como paso. */
export function StepHeading({
  id,
  step,
  title,
  description,
}: {
  id: string;
  step?: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3.5">
      {step !== undefined && (
        <span
          aria-hidden="true"
          className="bg-brand-600 grid size-9 flex-none place-items-center rounded-full font-bold text-white"
        >
          {step}
        </span>
      )}
      <div>
        <h2 id={id} className="text-xl leading-snug font-bold sm:text-2xl">
          {title}
        </h2>
        {description && <p className="text-muted mt-1">{description}</p>}
      </div>
    </div>
  );
}
