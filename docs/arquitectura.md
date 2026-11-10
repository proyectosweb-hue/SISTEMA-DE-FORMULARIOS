# Arquitectura: decisiones, limitaciones y pendientes

## 1. Visión general

```
Celular / PC ──► Next.js en Vercel ──► Supabase (PostgreSQL + Storage privado)
   │                  │
   │  1. POST /api/uploads  (valida y firma una URL por foto)
   │  2. PUT directo a Storage con la URL firmada (no pasa por Vercel)
   │  3. POST /api/submissions (revalida todo, verifica fotos en Storage,
   │                            guarda envío + adjuntos en UNA transacción)
```

## 2. Decisiones principales

| Decisión                                                                 | Motivo                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js (App Router, Cache Components) + TypeScript estricto**         | Soporte nativo en Vercel; la página de inicio es 100 % estática y rápida con señal débil.                                                                                                       |
| **Formularios como configuración declarativa** (`defineForm`)            | Los formularios aún no están definidos. Agregarlos no requiere migraciones ni tocar el motor. Cada envío guarda `form_slug` + `form_version` + respuestas (JSONB).                              |
| **Un solo esquema de validación (Zod) para cliente y servidor**          | El servidor nunca confía en el cliente: vuelve a validar todo con el mismo esquema (estricto: rechaza claves desconocidas).                                                                     |
| **Subida directa de fotos a Storage con URL firmada**                    | Las funciones de Vercel limitan el cuerpo de la petición (~4,5 MB). Cada URL sirve para un único archivo, con nombre generado por el servidor.                                                  |
| **Reducción de fotos en el celular** (máx. 1920 px, JPEG)                | Ahorra datos móviles, normaliza formatos (p. ej. HEIC) y elimina metadatos EXIF (incluida la ubicación).                                                                                        |
| **Bucket privado + RLS sin políticas**                                   | Ninguna foto ni tabla es accesible públicamente. Solo el servidor (clave secreta) lee/escribe. Las fotos se verán mediante enlaces firmados y temporales (cuando se defina quién las consulta). |
| **`create_submission` atómica e idempotente**                            | El envío y sus adjuntos se guardan juntos o no se guardan. El navegador genera el `id`; un reintento por mala señal no duplica nada.                                                            |
| **CSP sin nonces + cabeceras de seguridad**                              | Mantiene las páginas estáticas. Ver `next.config.ts`.                                                                                                                                           |
| **La estación se valida en el servidor contra `src/config/stations.ts`** | Una prueba comprueba que la base de datos y la configuración tengan las mismas 9 estaciones.                                                                                                    |

## 3. Nivel de acceso (decisión pendiente del supervisor)

Hoy: **nivel 1** — cualquiera con el enlace puede elegir una estación y enviar. La estación elegida
se recuerda en el dispositivo, pero **no es una autenticación**: el servidor valida que la estación
exista, no quién la eligió. Mitigaciones actuales: límite de peticiones, señuelo anti-bots,
validación estricta, robots.txt/noindex.

Opciones si se requiere más control (no cambian el enlace):

2. **Código de acceso por estación** (PIN rotable, sin cuentas).
3. **Cuentas personales** (Supabase Auth), si hay que saber _quién_ envió cada formulario.

## 3.1 Modo demostración (pruebas sin servicios reales)

Mientras no exista un proyecto de Supabase autorizado, `DEMO_MODE=true` (o `pnpm demo`) sustituye a
Supabase por una simulación **en memoria** dentro de la propia aplicación:

- `getSupabaseAdmin()` devuelve `createDemoSupabase()` (`src/lib/demo/`), que imita solo lo que usa la
  app: firmar subidas, consultar/eliminar archivos y `create_submission` (idempotente por `id`).
- Las fotos se suben a `/api/demo/storage/v1/...` en el **mismo origen** que la página. Es necesario
  porque el navegador sube directo a la URL de Storage: un servicio simulado en otro puerto del
  contenedor no sería alcanzable desde el navegador de quien revisa.
- El servidor indica `demo: true` en la respuesta de `/api/uploads`; el navegador no necesita
  variables propias. La ruta simulada aplica las mismas reglas que el bucket real (token de un solo
  uso, sin sobrescritura, tipo y tamaño).
- **Salvaguardas:** se ignora en producción (`VERCEL_ENV=production`), la ruta simulada responde 404
  fuera del modo demostración, y una barra amarilla permanente avisa que no es el sistema real. Hay
  pruebas que rompen cada salvaguarda a propósito y comprueban que se detecta.
- **Límites:** los datos están en la memoria de un solo proceso y se pierden al reiniciar (en Vercel,
  con varias instancias, no sería coherente: es solo para uso local o de revisión). No sustituye la
  prueba de integración con Supabase real.
- **Cómo quitarlo:** borrar `src/lib/demo/`, `src/app/api/demo/`, `src/components/layout/demo-banner.tsx`,
  `scripts/demo.mjs`, y las 3 referencias en `getSupabaseAdmin()`, `/api/uploads` y el cliente de subida.

## 4. Limitaciones conocidas (honestas)

- **No se ha probado contra un proyecto real de Supabase.** Las migraciones se validaron en
  PostgreSQL real en memoria (PGlite) y el flujo de navegador con Supabase simulado (red interceptada
  y modo demostración). Falta una
  **prueba de integración real** (crear proyecto, aplicar migraciones, subir una foto de verdad)
  antes de producción.
- **No se ha probado con celulares reales** (cámara en iPhone/Android, HEIC). Las pruebas e2e usan
  un navegador de escritorio con emulación móvil, que no ejercita la cámara real.
- **Límite de peticiones en memoria**: en Vercel cada instancia tiene su propia memoria, por lo que
  es de "mejor esfuerzo". Para protección real, agregar una regla de rate limiting en Vercel
  Firewall (WAF) o un servicio con estado compartido.
- **Las URLs firmadas de subida duran 2 horas** (lo fija Supabase; no es configurable). El riesgo se
  acota porque cada una es de un solo archivo, sin sobrescritura, y el bucket limita tipo y tamaño.
- **No se verifica el contenido real del archivo** (firma/magic bytes): se confía en el tipo MIME
  que aplica Storage. Endurecimiento posible: inspeccionar los primeros bytes en el servidor.
- **Fotos huérfanas**: si alguien sube fotos y abandona el formulario, quedan en Storage sin envío
  asociado. Pendiente: tarea programada de limpieza.
- **Código HTTP de formulario inexistente**: `/formularios/<no-existe>` muestra la pantalla de
  "no encontrada" pero responde 200 porque la página se transmite por partes (streaming).
- **Sin panel de administración**: por ahora los datos se consultan desde Supabase.
- **Identidad visual provisional**: no hay logotipo ni colores oficiales; todo está en
  `src/app/globals.css`, `src/config/site.ts` y el encabezado.
- **Código de referencia** (`JG-XXXXXXXX`) son los 8 primeros caracteres del id: sirve para ubicar
  un envío junto con estación y fecha, pero no es único por diseño (la clave real es el UUID).

## 5. Pendientes por confirmar con la empresa

1. Identidad de marca (logotipo, colores, tipografía, nombre legal) y nombres oficiales de estaciones.
2. Dominio y cuentas de Vercel / Supabase (plan, titular, quién administra el DNS).
3. Nivel de acceso (sección 3).
4. Quién consulta las respuestas y cómo (Supabase, panel, exportación, notificaciones).
5. Fotos: máximo por formulario, plazo de conservación, si se requiere fecha/hora/ubicación como
   evidencia, y política de privacidad (personas, placas).
6. Conectividad de las estaciones (¿se necesita modo sin conexión?).
7. Los formularios reales: cuáles, campos, obligatoriedad, fotos por campo o generales.
