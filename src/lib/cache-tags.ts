/**
 * Etiquetas de caché. Cuando guardas algo en el panel se invalidan estas etiquetas y el sitio
 * público se vuelve a generar en la siguiente visita (sin esperar los minutos de revalidación).
 */
export const TAG_CONTENT = "contenido";
export const TAG_SITES = "sitios";

/** Tiempo (segundos) que una página pública puede servirse desde la caché sin volver a generarse. */
export const PAGE_REVALIDATE = 300;

/** Los .txt/.xml/.webmanifest cambian poco: se cachean una hora. */
export const FILE_REVALIDATE = 3600;
