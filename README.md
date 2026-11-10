# Junquito Gas · Plataforma de formularios

Plataforma web centralizada para que las **9 estaciones de servicio** de Junquito Gas completen
y envíen formularios, con **evidencia fotográfica**, desde un único enlace fijo. Es responsive
(celular, tablet y computadora) y está preparada para desplegarse en Vercel.

> **Estado:** fundación y núcleo funcional listos. Todavía **no existen formularios de la empresa**:
> el supervisor aún no los ha definido y no se inventan formularios, campos ni procesos.
> Solo hay un _formulario técnico de prueba_ que existe únicamente en desarrollo y vistas previas.

## Qué incluye hoy

- Página de inicio con selección de estación (se recuerda en el dispositivo).
- Motor genérico de formularios (definiciones declarativas, validación compartida cliente/servidor).
- Captura de fotos desde la **cámara** o la **galería**, con reducción y normalización en el celular.
- Subida directa y segura a un bucket **privado** de Supabase Storage (URLs firmadas).
- Guardado atómico e idempotente de cada envío y sus fotos, asociado a su estación.
- Cabeceras de seguridad, límite de peticiones, señuelo anti-bots y validación estricta en servidor.
- Pruebas unitarias, de migraciones (PostgreSQL real en memoria) y end-to-end (celular y escritorio).

Lo que **no** incluye (no fue solicitado): panel de administración, exportaciones, notificaciones.

## Requisitos

- Node.js 22 (ver `.nvmrc`) y [pnpm](https://pnpm.io) 10.

## Primeros pasos

```bash
pnpm install
cp .env.example .env.local   # completa los valores (ver "Configuración de Supabase")
pnpm dev                     # http://localhost:3000
```

Para ver el formulario técnico de prueba en local, agrega `ENABLE_TECHNICAL_FORM=true` a `.env.local`.

## Probar la interfaz completa sin Supabase (modo demostración)

No hace falta ninguna cuenta, credencial ni servicio externo:

```bash
pnpm demo                    # http://localhost:3000
```

Esto inicia el servidor de desarrollo con `DEMO_MODE=true` y el formulario técnico de prueba. Supabase
se sustituye por una **simulación en memoria**: se puede elegir estación, tomar o elegir fotos,
enviar y ver la confirmación con su código de referencia. Una barra amarilla "MODO DEMOSTRACIÓN"
recuerda en todo momento que no es el sistema real.

- Los datos viven en la memoria del servidor y **se pierden al detenerlo**.
- **Nunca se activa en producción**: se ignora si `VERCEL_ENV=production`.
- Si compilas con `pnpm build`, define `DEMO_MODE=true` al compilar **y** al iniciar.
- Es solo para pruebas locales o de revisión; no sustituye la prueba de integración real con Supabase.

## Scripts

| Comando          | Qué hace                                                     |
| ---------------- | ------------------------------------------------------------ |
| `pnpm dev`       | Servidor de desarrollo                                       |
| `pnpm demo`      | Servidor de desarrollo en modo demostración (sin Supabase)   |
| `pnpm build`     | Compilación de producción                                    |
| `pnpm lint`      | ESLint                                                       |
| `pnpm typecheck` | TypeScript (genera antes los tipos de rutas)                 |
| `pnpm test`      | Pruebas unitarias y de migraciones (Vitest)                  |
| `pnpm e2e`       | Pruebas end-to-end con Playwright (compila y levanta la app) |
| `pnpm format`    | Da formato con Prettier (`format:check` solo verifica)       |
| `pnpm check`     | Lint + tipos + pruebas                                       |

> En este entorno de pruebas se usó un Chromium ya instalado:
> `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e`. En CI se instala con Playwright.

## Estructura

```
src/
  app/                      Rutas: inicio, /formularios/[slug], /enviado/[codigo], /ayuda, API
    api/uploads/            Firma las subidas de fotos (POST)
    api/submissions/        Guarda un formulario con sus fotos (POST)
  components/               Piezas de interfaz reutilizables
  config/                   Estaciones y datos del sitio (fuente única de verdad)
  features/
    forms/                  Motor de formularios: tipos, esquema, registro, componentes
    photos/                 Campo de fotografías (cámara / galería)
    stations/               Selección y recuerdo de la estación
  lib/                      Supabase, subidas, compresión de imágenes, límites, HTTP
supabase/migrations/        Esquema de base de datos y bucket de almacenamiento
e2e/                        Pruebas end-to-end
docs/arquitectura.md        Decisiones de arquitectura, limitaciones y pendientes
```

## Configuración de Supabase

Aún **no se ha creado ni modificado ningún proyecto de Supabase**. Para conectarlo:

1. Crea un proyecto en Supabase (para producción, un plan que no se pause por inactividad).
2. Aplica las migraciones de `supabase/migrations/` en orden (con la CLI de Supabase o pegando el
   SQL en el editor SQL). Crean las tablas, activan RLS sin políticas públicas, la función
   `create_submission` y el bucket privado `evidencias`.
3. En _Project Settings → API_ copia la URL y las claves y defínelas como variables de entorno:

| Variable                               | Dónde se usa         | Notas                                   |
| -------------------------------------- | -------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | navegador y servidor | URL del proyecto                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador            | Clave pública (publishable/anon)        |
| `SUPABASE_SECRET_KEY`                  | **solo servidor**    | Clave secreta; nunca con `NEXT_PUBLIC_` |

## Despliegue en Vercel con enlace fijo

1. Importa el repositorio en Vercel (para uso empresarial, en un equipo con plan comercial).
2. Define las variables de entorno de la tabla anterior en _Production_ y _Preview_.
   **No** definas `ENABLE_TECHNICAL_FORM` en producción (además, el código lo ignora allí).
3. En _Settings → Domains_ asigna el dominio definitivo (por ejemplo `formularios.<dominio-de-la-empresa>`).
   Ese dominio apunta siempre a la última versión de producción (rama `main`): las
   actualizaciones **no cambian el enlace**, y cada cambio propuesto tiene una URL de vista
   previa distinta para revisarlo antes de publicar.

## Cómo agregar un formulario real (cuando se defina)

1. Crea `src/features/forms/definitions/<nombre>.ts` con `defineForm({ ... })`
   (usa `definitions/technical.ts` como referencia de formato).
2. Agrégalo a `BUSINESS_FORMS` en `src/features/forms/registry.ts`.
3. Si cambian sus campos más adelante, **sube `version`**: cada envío guarda la versión usada.

No hace falta tocar el motor, la API ni la base de datos.

## Más información

Decisiones, limitaciones conocidas y puntos pendientes de confirmar: [`docs/arquitectura.md`](docs/arquitectura.md).
