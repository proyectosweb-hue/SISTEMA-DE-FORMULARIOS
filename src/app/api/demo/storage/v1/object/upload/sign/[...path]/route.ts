import { getDemoStore, setBounded } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/demo/mode";
import {
  ALLOWED_IMAGE_TYPES,
  EVIDENCE_BUCKET,
  MAX_UPLOAD_BYTES,
} from "@/lib/uploads/constants";

/**
 * SOLO MODO DEMOSTRACIÓN. Imita el endpoint de subida firmada de Supabase Storage
 * (PUT /storage/v1/object/upload/sign/{bucket}/{ruta}?token=...) en el mismo origen que la
 * página, para que la interfaz se pueda probar completa sin ningún servicio real.
 *
 * Aplica las mismas reglas que el bucket real: token de un solo uso emitido por el servidor,
 * sin sobrescritura, solo imágenes permitidas y con tope de tamaño. Fuera del modo
 * demostración (y siempre en producción) responde 404.
 */
function storageError(status: number, error: string, message: string) {
  return Response.json({ statusCode: String(status), error, message }, { status });
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/demo/storage/v1/object/upload/sign/[...path]">,
) {
  if (!isDemoMode()) return new Response(null, { status: 404 });

  const { path: segments } = await context.params;
  const [bucket, ...rest] = segments;
  const path = rest.join("/");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const store = getDemoStore();

  if (bucket !== EVIDENCE_BUCKET || !token || store.tokens.get(token) !== path) {
    return storageError(403, "Unauthorized", "Token de subida inválido o ya utilizado.");
  }
  if (store.files.has(path)) {
    return storageError(409, "Duplicate", "El recurso ya existe.");
  }

  let file: File | undefined;
  try {
    const form = await request.formData();
    file = [...form.values()].find((value): value is File => value instanceof File);
  } catch {
    return storageError(400, "Bad Request", "Cuerpo de subida inválido.");
  }
  if (!file) return storageError(400, "Bad Request", "No se recibió ningún archivo.");

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return storageError(415, "invalid_mime_type", "Tipo de archivo no permitido.");
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return storageError(
      413,
      "Payload too large",
      "El archivo excede el tamaño permitido.",
    );
  }

  setBounded(store.files, path, { size: file.size, contentType: file.type });
  store.tokens.delete(token); // un solo uso
  return Response.json({ Key: `${bucket}/${path}` });
}
