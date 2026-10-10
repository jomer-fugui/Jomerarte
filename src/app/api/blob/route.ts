import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { BLOB_UPLOAD_MAX } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Entrega un permiso temporal para que el navegador suba el archivo DIRECTO a Vercel Blob
 * (así se evita el límite de 4,5 MB de las funciones de Vercel). Solo para el administrador.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Vercel Blob no está configurado en este proyecto." }, { status: 400 });
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAdmin())) throw new Error("No autorizado. Vuelve a iniciar sesión.");
        return {
          allowedContentTypes: ["image/*", "video/*", "audio/*", "application/pdf"],
          maximumSizeInBytes: BLOB_UPLOAD_MAX,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "No se pudo preparar la subida." },
      { status: 400 },
    );
  }
}
