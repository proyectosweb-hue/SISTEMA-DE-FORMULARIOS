"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { InfoIcon, PinIcon } from "@/components/icons";
import { Button, buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { Station } from "@/config/stations";
import {
  PhotoField,
  revokePreviews,
  type PhotoItem,
} from "@/features/photos/photo-field";
import { useIsHydrated, useSelectedStation } from "@/features/stations/selected-station";
import { ApiRequestError, postJson } from "@/lib/api-client";
import { uploadPhotos } from "@/lib/uploads/client";
import type { SubmissionResponse } from "../payloads";
import { getPhotoFields, validatePhotoCounts } from "../photos";
import { buildAnswersSchema } from "../schema";
import type { FormDefinition } from "../types";
import { FieldControl } from "./field-control";

type Status = "idle" | "uploading" | "saving";

const PHOTO_REVIEW_MESSAGE = "Revisa las fotografías adjuntas.";

const STATUS_TEXT: Record<Exclude<Status, "idle">, string> = {
  uploading: "Subiendo fotografías… no cierres esta página.",
  saving: "Guardando el formulario…",
};

/**
 * Dibuja y envía cualquier formulario definido en el registro. Es genérico: no conoce
 * preguntas de la empresa, solo interpreta la definición declarativa.
 */
export function FormRenderer({ form }: { form: FormDefinition }) {
  const hydrated = useIsHydrated();
  const station = useSelectedStation();

  if (!hydrated) {
    return (
      <Panel>
        <p role="status" className="text-muted">
          Cargando formulario…
        </p>
      </Panel>
    );
  }

  if (!station) {
    return (
      <Panel>
        <h2 className="mb-2 text-xl font-bold">Primero selecciona tu estación</h2>
        <p className="text-muted mb-5">
          Cada formulario queda asociado a una estación. Elígela en el inicio y vuelve
          aquí.
        </p>
        <Link href="/" className={buttonClasses()}>
          Elegir estación
        </Link>
      </Panel>
    );
  }

  return <FormBody form={form} station={station} />;
}

function FormBody({ form, station }: { form: FormDefinition; station: Station }) {
  const router = useRouter();
  const schema = useMemo(() => buildAnswersSchema(form), [form]);
  const photoFields = useMemo(() => getPhotoFields(form), [form]);
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        form.fields
          .filter((f) => f.type !== "photos")
          .map((f) => [f.key, f.type === "checkbox" ? false : ""]),
      ),
    [form],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FieldValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  // Las fotos viven en un ref (fuente de verdad, se actualiza solo en manejadores de eventos)
  // reflejado en un estado para repintar. Así las subidas asíncronas nunca pisan cambios.
  const photosRef = useRef<Record<string, PhotoItem[]>>({});
  const [photos, setPhotos] = useState<Record<string, PhotoItem[]>>({});
  const updatePhotos = useCallback(
    (key: string, update: (prev: PhotoItem[]) => PhotoItem[]) => {
      const next = { ...photosRef.current, [key]: update(photosRef.current[key] ?? []) };
      photosRef.current = next;
      setPhotos(next);
    },
    [],
  );

  useEffect(() => {
    return () => {
      // Libera las vistas previas al salir de la página (se lee el valor MÁS RECIENTE del ref).
      for (const list of Object.values(photosRef.current)) revokePreviews(list);
    };
  }, []);

  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const submissionId = useRef<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const busy = status !== "idle";

  async function submitValues(values: FieldValues) {
    setFormError(null);

    const counts = Object.fromEntries(
      photoFields.map((f) => [f.key, (photosRef.current[f.key] ?? []).length]),
    );
    const problems = validatePhotoCounts(form, counts);
    setPhotoErrors(problems);
    if (Object.keys(problems).length > 0) return; // el aviso se muestra a partir de photoErrors

    // Un mismo id por formulario abierto: si hay que reintentar, el servidor no duplica el envío.
    submissionId.current ??= crypto.randomUUID();
    const id = submissionId.current;

    try {
      setStatus("uploading");
      for (const field of photoFields) {
        const pending = (photosRef.current[field.key] ?? []).filter(
          (p) => !p.uploadedPath,
        );
        if (pending.length === 0) continue;
        const paths = await uploadPhotos({
          submissionId: id,
          formSlug: form.slug,
          stationSlug: station.slug,
          fieldKey: field.key,
          blobs: pending.map((p) => p.blob),
        });
        const pathById = new Map(pending.map((p, index) => [p.id, paths[index]!]));
        updatePhotos(field.key, (prev) =>
          prev.map((p) =>
            pathById.has(p.id) ? { ...p, uploadedPath: pathById.get(p.id) } : p,
          ),
        );
      }

      setStatus("saving");
      const attachments = photoFields.flatMap((field) =>
        (photosRef.current[field.key] ?? []).map((p) => ({
          fieldKey: field.key,
          path: p.uploadedPath!,
        })),
      );
      const { referenceCode } = await postJson<SubmissionResponse>("/api/submissions", {
        submissionId: id,
        formSlug: form.slug,
        stationSlug: station.slug,
        answers: values,
        attachments,
        website: honeypot.current?.value ?? "",
      });

      for (const list of Object.values(photosRef.current)) revokePreviews(list);
      router.push(`/enviado/${referenceCode}`);
      // Se deja el estado "saving" para que no se pueda enviar dos veces mientras se navega.
    } catch (error) {
      setStatus("idle");
      if (!(error instanceof ApiRequestError)) {
        setFormError("Ocurrió un error inesperado. Inténtalo de nuevo.");
        return;
      }
      // Los errores de fotos se muestran por campo y desaparecen cuando la persona los corrige.
      if (error.code !== "invalid_photos") setFormError(error.message);

      if (error.code === "attachment_missing" || error.code === "attachment_invalid") {
        // Una foto no quedó bien en el servidor: se vuelven a subir todas en el próximo intento.
        for (const field of photoFields) {
          updatePhotos(field.key, (prev) =>
            prev.map((p) => ({ ...p, uploadedPath: undefined })),
          );
        }
      }
      for (const [key, message] of Object.entries(error.fields ?? {})) {
        if (photoFields.some((f) => f.key === key))
          setPhotoErrors((prev) => ({ ...prev, [key]: message }));
        else setError(key, { type: "server", message });
      }
    }
  }

  // `handleSubmit` se invoca dentro del evento (no al renderizar) porque el envío lee refs.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submitValues)(event);
  }

  // Al agregar o quitar fotos se retira el error de ese campo: ya no describe lo que se ve.
  function handlePhotosChange(key: string, update: (prev: PhotoItem[]) => PhotoItem[]) {
    updatePhotos(key, update);
    setPhotoErrors((prev) =>
      key in prev
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
        : prev,
    );
  }

  // Aviso general: el mensaje puntual de un error de envío, o el resumen de errores de fotos.
  const banner =
    formError ?? (Object.keys(photoErrors).length > 0 ? PHOTO_REVIEW_MESSAGE : null);

  return (
    <Panel labelledBy="titulo-formulario">
      <div className="bg-brand-100 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[0.93rem] text-[#173a73]">
        <span className="flex items-center gap-2">
          <PinIcon size={18} className="flex-none" />
          <span>
            Estación: <strong>{station.name}</strong> · {station.location}
          </span>
        </span>
        <Link href="/" className="font-semibold underline underline-offset-2">
          Cambiar estación
        </Link>
      </div>

      <h1 id="titulo-formulario" className="text-2xl font-bold">
        {form.title}
      </h1>
      {form.description && <p className="text-muted mt-1">{form.description}</p>}

      <form onSubmit={onSubmit} noValidate className="mt-6" aria-busy={busy}>
        <fieldset disabled={busy} className="min-w-0 space-y-6 border-0 p-0">
          {form.fields.map((field) =>
            field.type === "photos" ? (
              <PhotoField
                key={field.key}
                field={field}
                photos={photos[field.key] ?? []}
                onChange={(update) => handlePhotosChange(field.key, update)}
                error={photoErrors[field.key]}
                disabled={busy}
              />
            ) : (
              <FieldControl
                key={field.key}
                field={field}
                register={register}
                error={
                  typeof errors[field.key]?.message === "string"
                    ? (errors[field.key]!.message as string)
                    : undefined
                }
              />
            ),
          )}

          {/* Señuelo anti-bots: invisible para las personas. */}
          <input
            ref={honeypot}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
        </fieldset>

        {banner && (
          <p
            role="alert"
            className="bg-danger-50 text-danger-600 mt-6 flex items-start gap-2 rounded-xl px-3.5 py-3 font-semibold"
          >
            <InfoIcon size={18} className="mt-0.5 flex-none" />
            <span>{banner}</span>
          </p>
        )}

        {busy && (
          <p role="status" className="text-muted mt-6">
            {STATUS_TEXT[status as Exclude<Status, "idle">]}
          </p>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Enviando…" : "Enviar formulario"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
