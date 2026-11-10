"use client";

import { useId } from "react";
import type { FieldValues, UseFormRegister } from "react-hook-form";
import type { FormField, PhotosField } from "../types";

type Props = {
  field: Exclude<FormField, PhotosField>;
  register: UseFormRegister<FieldValues>;
  error?: string;
};

const CONTROL =
  "min-h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 aria-invalid:border-danger-600 aria-invalid:bg-danger-50";

/** Control de un campo (etiqueta, ayuda, entrada y error) accesible y cómodo en celular. */
export function FieldControl({ field, register, error }: Props) {
  const id = useId();
  const helpId = field.help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const common = {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };

  const label = (
    <label htmlFor={id} className="block font-semibold">
      {field.label}
      {field.required && (
        <span className="text-danger-600 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );

  const help = field.help && (
    <p id={helpId} className="text-muted mt-0.5 text-[0.93rem]">
      {field.help}
    </p>
  );

  const errorMessage = error && (
    <p
      id={errorId}
      role="alert"
      className="text-danger-600 mt-1.5 text-[0.93rem] font-semibold"
    >
      {error}
    </p>
  );

  if (field.type === "checkbox") {
    return (
      <div>
        <div className="flex items-start gap-3">
          <input
            {...common}
            type="checkbox"
            className="accent-brand-600 mt-0.5 size-6 flex-none"
            {...register(field.key)}
          />
          <div>
            {label}
            {help}
          </div>
        </div>
        {errorMessage}
      </div>
    );
  }

  let control;
  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          {...common}
          rows={field.rows ?? 4}
          maxLength={field.maxLength}
          className={CONTROL}
          {...register(field.key)}
        />
      );
      break;
    case "select":
      control = (
        <select {...common} className={CONTROL} {...register(field.key)}>
          <option value="">Selecciona una opción</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case "date":
      control = (
        <input {...common} type="date" className={CONTROL} {...register(field.key)} />
      );
      break;
    case "number":
      // type="text" + inputMode permite coma o punto decimal y teclado numérico en el celular.
      control = (
        <input
          {...common}
          type="text"
          inputMode={field.step && Number.isInteger(field.step) ? "numeric" : "decimal"}
          autoComplete="off"
          className={CONTROL}
          {...register(field.key)}
        />
      );
      break;
    case "text":
      control = (
        <input
          {...common}
          type="text"
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          autoComplete="off"
          className={CONTROL}
          {...register(field.key)}
        />
      );
      break;
  }

  return (
    <div>
      {label}
      {help}
      <div className="mt-1.5">{control}</div>
      {errorMessage}
    </div>
  );
}
