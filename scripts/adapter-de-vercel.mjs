/**
 * Adaptador mínimo para reproducir en tu computadora el build que hace Vercel.
 *
 * Vercel no corre `next build` pelado: al final le enchufa un "adapter" que revisa todo el
 * resultado del build y arma la salida. Ese paso extra tiene sus propios chequeos, y hay errores
 * que SOLO aparecen ahí (por ejemplo, el "Invariant: failed to find source route … for prerender …"
 * que tiraban el sitemap, robots.txt y manifest.webmanifest).
 *
 * Este archivo no hace nada: solo existe para que Next ejecute esos chequeos.
 * Se usa con `npm run build:vercel`. En Vercel no interviene.
 */
export const name = "chequeo-local-de-vercel";

export async function onBuildComplete() {
  return undefined;
}
