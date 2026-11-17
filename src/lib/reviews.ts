import type { Settings } from "./defaults";

/** Una reseña de Google, ya normalizada para mostrarla en el sitio. */
export type GoogleReview = {
  id: string;
  author: string;
  photo: string;
  rating: number;
  text: string;
  /** Fecha ya formateada en castellano (ej: “hace 2 semanas”) */
  when: string;
  /** Enlace a la reseña dentro de Google Maps */
  url: string;
};

/** Resumen de la ficha de Google: promedio, cantidad total y hasta 5 reseñas. */
export type GoogleSummary = {
  rating: number;
  total: number;
  reviews: GoogleReview[];
  /** Enlace a la ficha en Google Maps */
  mapsUrl: string;
};

/** Enlace que abre la ventanita de “Escribir una reseña” de la ficha de Google. */
export function googleReviewUrl(settings: Pick<Settings, "googleReviewUrl" | "googlePlaceId">): string {
  const direct = settings.googleReviewUrl.trim();
  if (direct) return direct;
  const placeId = settings.googlePlaceId.trim();
  if (placeId) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  return "";
}

/** Enlace público de la ficha (para “ver todas las reseñas”). */
export function googleMapsUrl(settings: Pick<Settings, "googlePlaceId" | "siteName" | "mapsUrl">): string {
  const placeId = settings.googlePlaceId.trim();
  if (placeId) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  // El enlace de Google Maps que se carga en Ajustes → Ubicación es más confiable que buscar por nombre
  const maps = settings.mapsUrl.trim();
  if (maps) return maps;
  return `https://www.google.com/maps/search/${encodeURIComponent(settings.siteName)}`;
}

/** ¿Hay un enlace confiable a la ficha de Google? (Place ID o el Maps cargado en Ajustes) */
export function hasGoogleMapsLink(settings: Pick<Settings, "googlePlaceId" | "mapsUrl">): boolean {
  return Boolean(settings.googlePlaceId.trim() || settings.mapsUrl.trim());
}

type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    name?: string;
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
  }[];
};

/**
 * Trae de Google el promedio, la cantidad de reseñas y hasta 5 comentarios (es el máximo que
 * permite la Places API). Se guarda en caché 6 horas para no gastar consultas y para que la
 * página no dependa de la velocidad de Google. Si falta la clave o el Place ID, no hace nada.
 */
export async function fetchGoogleSummary(settings: Settings): Promise<GoogleSummary | null> {
  const placeId = settings.googlePlaceId.trim();
  const key = (settings.googlePlacesKey || process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!placeId || !key) return null;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
      next: { revalidate: 21600 },
    });
    if (!res.ok) {
      console.warn(`[opiniones] Google respondió ${res.status} al pedir las reseñas.`);
      return null;
    }
    const data = (await res.json()) as PlacesResponse;
    const reviews: GoogleReview[] = (data.reviews ?? []).slice(0, 5).map((r, i) => ({
      id: r.name ?? `resena-${i}`,
      author: r.authorAttribution?.displayName ?? "Un cliente de Google",
      photo: r.authorAttribution?.photoUri ?? "",
      rating: Math.max(0, Math.min(5, Math.round(r.rating ?? 0))),
      text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
      when: r.relativePublishTimeDescription ?? "",
      url: r.googleMapsUri ?? data.googleMapsUri ?? "",
    }));
    return {
      rating: Math.round((data.rating ?? 0) * 10) / 10,
      total: data.userRatingCount ?? reviews.length,
      reviews,
      mapsUrl: data.googleMapsUri ?? googleMapsUrl(settings),
    };
  } catch (err) {
    console.warn("[opiniones] No se pudieron traer las reseñas de Google:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Texto de estrellas para mostrar en pantalla (★★★★☆). */
export function starsText(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}
