const MB = 1024 * 1024;

/** Tamaño máximo por archivo usando Vercel Blob (subida directa desde el navegador). */
export const BLOB_UPLOAD_MAX = 500 * MB;

export type UploadConfig = {
  /** "blob" = Vercel Blob · "db" = dentro de la base de datos */
  mode: "blob" | "db";
  maxBytes: number;
  vercel: boolean;
};

export function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Vercel limita cada petición a 4,5 MB: sin Blob, los archivos deben pesar menos. */
export function dbUploadMax(): number {
  return process.env.VERCEL ? 4 * MB : 50 * MB;
}

export function uploadConfig(): UploadConfig {
  const blob = blobEnabled();
  return {
    mode: blob ? "blob" : "db",
    maxBytes: blob ? BLOB_UPLOAD_MAX : dbUploadMax(),
    vercel: Boolean(process.env.VERCEL),
  };
}

export function isBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
