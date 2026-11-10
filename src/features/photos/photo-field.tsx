"use client";

import { useId, useState, type ChangeEvent } from "react";
import { CameraIcon, CloseIcon, ImageIcon } from "@/components/icons";
import { photoLimits } from "@/features/forms/photos";
import type { PhotosField } from "@/features/forms/types";
import { compressImage, ImageProcessingError } from "@/lib/images/compress";

export type PhotoItem = {
  id: string;
  /** Imagen ya reducida y convertida a JPEG, lista para subir. */
  blob: Blob;
  previewUrl: string;
  /** Ruta en Storage una vez subida (permite reintentar el envío sin volver a subirla). */
  uploadedPath?: string;
};

type Props = {
  field: PhotosField;
  photos: PhotoItem[];
  onChange: (update: (previous: PhotoItem[]) => PhotoItem[]) => void;
  error?: string;
  disabled?: boolean;
};

const ACTION_BASE =
  "inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-accent-500 sm:flex-none";

export function revokePreviews(photos: PhotoItem[]) {
  for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
}

/**
 * Campo de evidencia fotográfica: permite tomar una foto con la cámara del celular o elegir
 * una o varias de la galería. Cada foto se reduce y normaliza en el dispositivo antes de
 * guardarse en el formulario.
 *
 * Se usan <label> con <input type="file"> en lugar de botones con JavaScript: es lo más
 * fiable en iOS y Android y funciona con teclado y lectores de pantalla.
 */
export function PhotoField({ field, photos, onChange, error, disabled = false }: Props) {
  const baseId = useId();
  const { min, max } = photoLimits(field);
  const [processing, setProcessing] = useState(0);
  const [notices, setNotices] = useState<string[]>([]);

  const remaining = max - photos.length;
  const blocked = disabled || processing > 0 || remaining <= 0;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ""; // permite volver a elegir la misma foto
    if (selected.length === 0) return;

    const accepted = selected.slice(0, Math.max(remaining, 0));
    const messages: string[] = [];
    if (selected.length > accepted.length) {
      messages.push(`Solo se adjuntaron ${accepted.length}: el máximo es ${max} fotos.`);
    }

    setProcessing((n) => n + accepted.length);
    const prepared: PhotoItem[] = [];
    for (const file of accepted) {
      try {
        const blob = await compressImage(file);
        prepared.push({
          id: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      } catch (error) {
        messages.push(
          error instanceof ImageProcessingError
            ? error.message
            : "No pudimos procesar una de las fotos.",
        );
      } finally {
        setProcessing((n) => n - 1);
      }
    }

    if (prepared.length > 0)
      onChange((previous) => [...previous, ...prepared].slice(0, max));
    setNotices(messages);
  }

  function remove(id: string) {
    const target = photos.find((photo) => photo.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange((previous) => previous.filter((photo) => photo.id !== id));
    setNotices([]);
  }

  const actionClasses = (primary: boolean) =>
    `${ACTION_BASE} ${
      primary
        ? "bg-brand-600 text-white hover:bg-brand-500"
        : "border-[1.5px] border-brand-600 bg-white text-brand-600 hover:bg-brand-50"
    } ${blocked ? "pointer-events-none opacity-60" : ""}`;

  const describedBy = [
    `${baseId}-help`,
    error ? `${baseId}-error` : null,
    notices.length ? `${baseId}-notices` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <p id={`${baseId}-label`} className="font-semibold">
        {field.label}
        {min > 0 && (
          <span className="text-danger-600 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </p>
      <p id={`${baseId}-help`} className="text-muted mt-0.5 text-[0.93rem]">
        {field.help ? `${field.help} ` : ""}
        {min > 0 ? `Mínimo ${min}, máximo ${max} fotos.` : `Hasta ${max} fotos.`}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className={actionClasses(true)}>
          <CameraIcon />
          Tomar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={blocked}
            aria-describedby={describedBy}
            data-testid={`camara-${field.key}`}
            onChange={handleFiles}
          />
        </label>
        <label className={actionClasses(false)}>
          <ImageIcon />
          Elegir de la galería
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={blocked}
            aria-describedby={describedBy}
            data-testid={`galeria-${field.key}`}
            onChange={handleFiles}
          />
        </label>
      </div>

      {processing > 0 && (
        <p role="status" className="text-muted mt-3 text-[0.93rem]">
          Preparando {processing === 1 ? "la foto" : `${processing} fotos`}…
        </p>
      )}

      {photos.length > 0 && (
        <ul
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label="Fotos adjuntas"
        >
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="border-line bg-surface relative overflow-hidden rounded-xl border"
            >
              {/* Vista previa local (blob:): next/image no aplica a archivos del dispositivo. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={`Foto ${index + 1} de ${field.label}`}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(photo.id)}
                disabled={disabled}
                aria-label={`Quitar foto ${index + 1}`}
                className="bg-navy-900/80 hover:bg-navy-900 absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full text-white disabled:opacity-50"
              >
                <CloseIcon size={18} />
              </button>
              {photo.uploadedPath && (
                <span className="bg-ok-600 absolute bottom-1.5 left-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-white">
                  Subida
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {notices.length > 0 && (
        <ul
          id={`${baseId}-notices`}
          role="status"
          className="mt-3 space-y-1 text-[0.93rem] text-[#6b4e00]"
        >
          {notices.map((notice, i) => (
            <li key={i}>{notice}</li>
          ))}
        </ul>
      )}

      {error && (
        <p
          id={`${baseId}-error`}
          role="alert"
          className="text-danger-600 mt-3 text-[0.93rem] font-semibold"
        >
          {error}
        </p>
      )}
    </div>
  );
}
