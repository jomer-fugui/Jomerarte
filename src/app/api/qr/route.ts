import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSettings } from "@/lib/data";
import { googleReviewUrl } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/**
 * Código QR del enlace de “Pedir reseñas” (para imprimir y pegar en el taller).
 * No acepta direcciones arbitrarias: siempre usa el enlace configurado en el panel.
 */
export async function GET() {
  const settings = await getSettings();
  const url = googleReviewUrl(settings);
  if (!url) {
    return NextResponse.json({ error: "Todavía no cargaste el enlace de reseñas en Ajustes." }, { status: 404 });
  }
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 900, errorCorrectionLevel: "M" });
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "content-disposition": 'attachment; filename="opiniones-google.svg"',
      "cache-control": "public, max-age=3600",
    },
  });
}
