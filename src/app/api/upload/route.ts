import { db } from "@/db";
import { media } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { dbUploadMax, isBlobUrl, uploadConfig } from "@/lib/storage";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "application/pdf": "pdf",
};

function safeName(name: string, type: string): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "archivo";
  const origExt = (name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "").toLowerCase();
  const ext = EXT[type] || origExt || "bin";
  return `${base}.${ext}`;
}

function allowedType(type: string): boolean {
  return /^(image|video|audio)\//.test(type) || type === "application/pdf";
}

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

/** Configuración de subida para el panel: Vercel Blob o base de datos, y tamaño máximo. */
export async function GET() {
  return Response.json(uploadConfig(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "No autorizado. Vuelve a iniciar sesión." }, { status: 401 });
  }

  // 1) Registro de un archivo ya subido a Vercel Blob (para la biblioteca de archivos)
  if ((req.headers.get("content-type") || "").includes("application/json")) {
    const body = (await req.json().catch(() => null)) as {
      url?: unknown;
      filename?: unknown;
      contentType?: unknown;
      size?: unknown;
    } | null;
    const url = typeof body?.url === "string" ? body.url : "";
    if (!isBlobUrl(url)) return Response.json({ error: "Enlace de archivo inválido." }, { status: 400 });
    const type =
      typeof body?.contentType === "string" && body.contentType ? body.contentType.slice(0, 120) : "application/octet-stream";
    const filename = safeName(typeof body?.filename === "string" ? body.filename : "archivo", type);
    const size = Math.max(0, Math.min(2_000_000_000, Math.round(Number(body?.size) || 0)));
    const [row] = await db.insert(media).values({ filename, mimeType: type, size, url }).returning({ id: media.id });
    return Response.json({ id: row.id, url, filename, mimeType: type });
  }

  // 2) Subida guardada dentro de la base de datos
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  const max = dbUploadMax();
  if (file.size > max) {
    return Response.json(
      {
        error: `El archivo supera los ${mb(max)}. Activa Vercel Blob para subir archivos grandes, o sube el video a YouTube y pega el enlace.`,
      },
      { status: 413 },
    );
  }
  const type = file.type || "application/octet-stream";
  if (!allowedType(type)) {
    return Response.json({ error: "Tipo de archivo no permitido (solo imágenes, videos, audios o PDF)." }, { status: 415 });
  }
  const data = Buffer.from(await file.arrayBuffer());
  const filename = safeName(file.name || "archivo", type);
  const [row] = await db
    .insert(media)
    .values({ filename, mimeType: type, size: data.length, data })
    .returning({ id: media.id });
  return Response.json({ id: row.id, url: `/api/media/${row.id}/${filename}`, filename, mimeType: type });
}
