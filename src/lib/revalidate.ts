import { revalidatePath, revalidateTag } from "next/cache";
import { TAG_CONTENT, TAG_SITES } from "./cache-tags";

/**
 * Avisa que el sitio público cambió: la próxima visita vuelve a generar la página (y el resto
 * se sigue sirviendo desde la caché). Se llama después de guardar algo en el panel.
 *
 * Ojo con el segundo argumento de `revalidateTag`: es el "perfil" de caché y decide qué pasa
 * con las entradas viejas.
 *   - `"max"`        → las marca como *vencidas pero servibles*: la visita siguiente recibe
 *                      todavía el HTML viejo y la página se regenera de fondo (se nota recién
 *                      unos segundos después). Sirve para revalidar de a poco, NO para el panel.
 *   - `{ expire: 0 }` → las descarta en el acto: la visita siguiente ya trae el contenido nuevo.
 * Por eso el panel usa `{ expire: 0 }`: guardás y el cambio se ve enseguida.
 */
export function refreshSite(): void {
  revalidateTag(TAG_CONTENT, { expire: 0 });
  // Las páginas públicas viven en /h/<sitio>/…: se invalidan todas de una vez. En Next 16 sólo
  // funciona la ruta "patrón" (con [site]), no la ruta concreta.
  for (const path of ["/h/[site]", "/h/[site]/[...slug]"]) {
    try {
      revalidatePath(path, "layout");
    } catch {
      // Si esta versión de Next no acepta la ruta con segmentos dinámicos, alcanza con la etiqueta.
    }
  }
}

/** Además del contenido, cambió la lista de sitios (se creó o se borró un subdominio). */
export function refreshSites(): void {
  revalidateTag(TAG_SITES, { expire: 0 });
  refreshSite();
}
