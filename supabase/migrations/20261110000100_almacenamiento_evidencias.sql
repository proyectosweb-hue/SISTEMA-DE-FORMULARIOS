-- =====================================================================================
-- Bucket PRIVADO para las evidencias fotográficas.
--
--  * public = false: ningún archivo tiene URL pública. Para verlos se generan enlaces
--    firmados y temporales desde el servidor, solo para personal autorizado.
--  * file_size_limit y allowed_mime_types los aplica Supabase Storage en el servidor,
--    aunque el navegador diga otra cosa. Deben coincidir con src/lib/uploads/constants.ts.
--  * No se crean políticas sobre storage.objects: sin políticas, anon/authenticated no
--    pueden leer ni escribir. Las subidas se hacen con URLs firmadas de un solo archivo
--    emitidas por el servidor (POST /api/uploads).
-- =====================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
