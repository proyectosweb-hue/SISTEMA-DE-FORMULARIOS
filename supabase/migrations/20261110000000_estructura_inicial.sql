-- =====================================================================================
-- Estructura inicial: estaciones, envíos de formularios y adjuntos (evidencias).
--
-- Diseño:
--  * El esquema NO conoce los formularios concretos de la empresa: cada envío guarda el
--    formulario y su versión (form_slug / form_version) y las respuestas como JSONB.
--    Así, definir un formulario nuevo no requiere migraciones.
--  * Seguridad: RLS activado SIN políticas => el rol público (anon) y los usuarios
--    autenticados no pueden leer ni escribir nada. Solo el servidor, con la clave
--    secreta (service_role), accede a estas tablas.
-- =====================================================================================

-- ---------- Estaciones ---------------------------------------------------------------
create table public.stations (
  slug       text primary key check (slug ~ '^[a-z]+(-[a-z]+)*$'),
  name       text not null,
  location   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Debe coincidir con src/config/stations.ts (hay una prueba que lo verifica).
insert into public.stations (slug, name, location) values
  ('ciruelo',      'Ciruelo Gas',      'Santiago'),
  ('baitoa',       'Baitoa Gas',       'Santiago'),
  ('la-herradura', 'La Herradura Gas', 'Santiago · Sajoma'),
  ('verdun',       'Verdun Gas',       'San José de las Matas'),
  ('pedregal',     'Pedregal Gas',     'San José de las Matas'),
  ('junquito',     'Junquito Gas',     'Valverde (Mao)'),
  ('burende',      'Burende Gas',      'La Vega'),
  ('san-jose',     'San José Gas',     'Santiago'),
  ('monumental',   'Monumental Gas',   'Santo Domingo');

-- ---------- Envíos -------------------------------------------------------------------
create table public.submissions (
  -- Lo genera el navegador antes de subir las fotos: permite reintentar sin duplicar.
  id             uuid primary key,
  -- Código corto para que una persona localice el envío (no es único por diseño:
  -- la clave real es el id).
  reference_code text generated always as ('JG-' || upper(substr(id::text, 1, 8))) stored,
  form_slug      text not null,
  form_version   integer not null check (form_version >= 1),
  station_slug   text not null references public.stations (slug),
  answers        jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  created_at     timestamptz not null default now()
);

create index submissions_station_created_idx on public.submissions (station_slug, created_at desc);
create index submissions_form_created_idx    on public.submissions (form_slug, created_at desc);

-- ---------- Adjuntos (evidencias fotográficas) ---------------------------------------
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  -- Clave del campo de fotos del formulario al que pertenece la imagen.
  field_key     text not null,
  -- Ruta dentro del bucket privado "evidencias".
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    integer not null check (size_bytes > 0),
  created_at    timestamptz not null default now()
);

create index attachments_submission_idx on public.attachments (submission_id);

-- ---------- Seguridad ----------------------------------------------------------------
alter table public.stations    enable row level security;
alter table public.submissions enable row level security;
alter table public.attachments enable row level security;

-- Defensa en profundidad: además de RLS sin políticas, se retiran los permisos.
revoke all on public.stations, public.submissions, public.attachments from anon, authenticated;

-- ---------- Alta atómica de un envío -------------------------------------------------
-- Guarda el envío y sus adjuntos en UNA transacción. Es idempotente: si el navegador
-- reintenta con el mismo id (p. ej. por mala señal), no duplica nada y devuelve el
-- mismo código de referencia.
create function public.create_submission(
  p_id           uuid,
  p_form_slug    text,
  p_form_version integer,
  p_station_slug text,
  p_answers      jsonb,
  p_attachments  jsonb
) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_reference text;
begin
  insert into public.submissions (id, form_slug, form_version, station_slug, answers)
  values (p_id, p_form_slug, p_form_version, p_station_slug, coalesce(p_answers, '{}'::jsonb))
  on conflict (id) do nothing;

  if found then
    insert into public.attachments (submission_id, field_key, storage_path, mime_type, size_bytes)
    select p_id,
           a ->> 'field_key',
           a ->> 'storage_path',
           a ->> 'mime_type',
           (a ->> 'size_bytes')::integer
    from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) as a;
  end if;

  select reference_code into v_reference from public.submissions where id = p_id;
  return v_reference;
end;
$$;

revoke all on function public.create_submission(uuid, text, integer, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_submission(uuid, text, integer, text, jsonb, jsonb)
  to service_role;
