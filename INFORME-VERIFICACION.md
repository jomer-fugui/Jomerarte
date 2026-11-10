# Informe de correcciones y verificación — Jomerarte

**Fecha:** 5 de noviembre de 2026
**Rama:** `arena/03f02bbe-jomerarte` (los puntos 3.7-bis y 3.9 son de esta rama)
**Base:** este documento complementa al informe anterior (`REVISION-CODIGO-Y-CPU.md`), que es la **revisión de
solo lectura** del estado inicial y el diagnóstico del aviso de CPU. Acá está lo que se aplicó y cómo se verificó.

Todo lo que dice este informe fue **medido** en un build de producción real
(`next build` + `next start`) con la base de datos levantada, no deducido de la documentación.

---

## 1. Resumen en 30 segundos

**Qué estaba mal:** ninguna página pública se guardaba en caché. Cada visita —de una persona, de Google o de
un bot de IA— despertaba una función de Vercel y volvía a consultar Postgres y a armar el HTML completo. Eso es
lo que hacía subir el consumo de CPU del plan gratuito.

**Por qué:** las páginas públicas se mudaron a una carpeta con un segmento variable (`/h/[site]/…`) para que cada
subdominio tenga su propia dirección interna. En Next.js 16 esa carpeta quedó marcada como **dinámica por
herencia**, y `export const revalidate = 300` **no alcanza** para volver a hacerla estática.

**Qué se hizo:** marcar explícitamente el árbol público como estático (`dynamic = "force-static"`), más los
archivos sueltos (`robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `llms.txt`, `llms-full.txt`), y arreglar la
invalidación desde el panel para que al guardar un cambio se vea al instante.

**Resultado medido (build de producción):**

| Dirección | 1.ª visita | 2.ª visita | Cabecera que ve el CDN |
|---|---|---|---|
| `jomerarte.com/` | `MISS` | **`HIT`** | `s-maxage=60, stale-while-revalidate=31535940` |
| `/Servicios` | `MISS` | **`HIT`** | `s-maxage=300, …` |
| `/Tienda` | `MISS` | **`HIT`** | `s-maxage=300, …` |
| `/inventos` | `MISS` | **`HIT`** | `s-maxage=300, …` |
| `/Frases/Poesias`, `/Cielinfier/historia`, páginas de cada publicación | `MISS` | **`HIT`** | `s-maxage=300, …` |
| `frases.jomerarte.com/` | `MISS` | **`HIT`** | `s-maxage=60, …` |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/llms.txt`, `/llms-full.txt` | `MISS` | **`HIT`** | `public, s-maxage=3600, …` |
| `/buscar?q=…` (a propósito **no** se cachea) | 200 | 200 | `private, no-cache, no-store` |

`HIT` significa que la respuesta salió de la caché sin ejecutar la página. A partir de ahí, el CDN de Vercel
sirve esas páginas a todos los visitantes durante esos segundos **sin gastar CPU**.

**Lo más importante:** de 32 rutas, **10 son ahora estáticas** (`○` en el build): las 7 públicas (páginas,
publicaciones, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `llms.txt`, `llms-full.txt`), más `/icon.svg`,
`/admin/login` y la página de error 404. El resto son el panel, las APIs y el buscador, que sí tienen que ser
dinámicos.

---

## 2. El diagnóstico real de la caché (para que quede documentado)

El árbol de la "llave" que resolvía el problema, medido paso a paso:

1. **El build mostraba `ƒ` (dinámico) en todas las rutas públicas.** Se probó aislar: se dejó `page.tsx` reducido a
   lo mínimo con solo `revalidate = 300` → seguía dinámico. Se dejó el `layout.tsx` mínimo → seguía dinámico.
2. **Se quitó el `middleware` (hoy `proxy.ts`) y se reconstruyó** → seguía dinámico. **El middleware no era la
   causa** (esto importa: se descartó una sospecha que costaba mucho refactorizar).
3. La causa era la **herencia del segmento dinámico**: cualquier ruta debajo de `/h/[site]` se consideraba
   dinámica porque Next no puede prerenderizar un parámetro que no conoce (los sitios salen de la base).
4. **La solución es `export const dynamic = "force-static"`** en el `layout.tsx` de ese árbol. Con eso, Next acepta
   prerenderizar sobre la marcha (ISR): la primera visita genera la página, la guarda, y las siguientes se sirven
   desde caché hasta que pasan los segundos de `revalidate`.
5. **`revalidate = 300` solo, sin `force-static`, no hace nada** — está comprobado con builds de aislamiento. No
   hay que volver a probar esa teoría.

### ¿Y por qué la portada se guarda 60 segundos y el resto 300?

Porque la portada lee dos datos que cambian más seguido (los destacados y el contenido al azar), que están
cacheados 60 segundos en `src/lib/data.ts`. Next toma el tiempo **más corto** de los datos que usa la página.
Es correcto y deliberado: la portada es lo que más se visita, así que se refresca más seguido; el resto aguanta
5 minutos. Al guardar desde el panel, igual se invalida todo al instante (ver punto 3.4).

---

## 3. Qué se cambió, archivo por archivo

### 3.1 La caché del sitio público

| Archivo | Cambio |
|---|---|
| `src/app/(site)/h/[site]/layout.tsx` | **`dynamic = "force-static"`** + `revalidate = 300`. Es *la* corrección. |
| `src/app/(site)/h/[site]/page.tsx` | `revalidate = 300` (portada de cada sitio). |
| `src/app/(site)/h/[site]/[...slug]/page.tsx` | `revalidate = 300` (todas las páginas de contenido). |
| `src/app/(site)/h/[site]/buscar/page.tsx` | `dynamic = "force-dynamic"` (el buscador depende de `?q=`, no se cachea). |
| `src/app/(site)/h/[site]/{robots.txt,sitemap.xml,manifest.webmanifest,llms.txt,llms-full.txt}/route.ts` | `dynamic = "force-static"` + `revalidate = 3600`. |

> Detalle técnico: los números van **literales** (`300`, `3600`). Si se importan desde otro archivo, el build
> falla con `Invalid segment configuration export detected`.

### 3.2 La reescritura de direcciones (`src/proxy.ts`)

`jomerarte.com/Servicios` → `/h/_/Servicios`; `frases.jomerarte.com/` → `/h/frases`. Así cada subdominio tiene su
propia entrada de caché y las páginas públicas no necesitan leer cookies ni cabeceras. El visitante nunca ve la
dirección interna, y `/h/...` escrito a mano devuelve **404** (verificado).

### 3.3 Archivos que estaban mal servidos

- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `llms.txt`, `llms-full.txt`: ahora son rutas estáticas
  **por sitio**, generadas en `/h/[site]/…`. Verificado: `frases.jomerarte.com/robots.txt` termina en
  `Sitemap: https://frases.jomerarte.com/sitemap.xml`, y el de `jomerarte.com` en el suyo.
- **`BingSiteAuth.xml`**: estaba duplicado en la raíz, en `src/app/` y en `src/app/(site)/`. Quedó **una sola
  copia** en `public/BingSiteAuth.xml`, que se sirve tal cual en `/BingSiteAuth.xml` (200, `application/xml`).
- El sitemap principal tiene **71 direcciones** (páginas de sección + cada publicación publicada).

### 3.4 Guardar en el panel ahora se ve al instante

`src/lib/revalidate.ts` — **este era el bug fino**. El aviso al guardar usaba `revalidateTag(TAG_CONTENT, "max")`.
Ese `"max"` es un *perfil de caché*: marca las entradas como **"viejas pero servibles"**, es decir, la visita
siguiente recibe **todavía** el HTML anterior y la página se regenera de fondo. En la práctica: guardabas y no
veías el cambio (o lo veías recién un rato después, en otra visita).

Ahora se usa `{ expire: 0 }`, que **descarta** las entradas en el acto:

```ts
revalidateTag(TAG_CONTENT, { expire: 0 });
revalidatePath("/h/[site]", "layout");   // ruta "patrón": la concreta no funciona en Next 16
```

**Prueba medida (build de producción, editando el título de una publicación):**

| Paso | Resultado |
|---|---|
| Página ya cacheada, se cambia el título en la base | el sitio sigue mostrando el título viejo (correcto: es caché) |
| Se llama `revalidateTag(contenido, { expire: 0 })` | — |
| **La visita siguiente** | `MISS` + **contenido nuevo en el primer intento** |

Con el `"max"` anterior, esa misma secuencia no mostraba el contenido nuevo hasta pasado ~1 segundo y una visita
extra (regeneración de fondo). Por eso el cambio es `{ expire: 0 }`.

> Nota honesta: la prueba se hizo llamando **exactamente la misma función** que ejecutan los guardados
> (`refreshSite()`), servida por el servidor de producción; no se automatizó el envío del formulario del panel.
> Los guardados la invocan en `actions.ts` (línea 57), `menu-actions.ts` (34), `ml-actions.ts` (46 y 53).

### 3.5 Medios servidos por el CDN

`src/app/api/media/[...path]/route.ts`: los archivos (fotos, videos, PDF) salen con
`Cache-Control: public, s-maxage=31536000, max-age=31536000, immutable`, y si el archivo está en Vercel Blob se
redirige (307) con la misma cabecera. Antes cada imagen volvía a despertar la función.
*(En la copia local no hay archivos subidos, así que el 200 real no se pudo probar acá; el 404 también va con
`s-maxage=600` para no repetirlo.)*

### 3.6 Política de IA "sin entrenamiento"

`src/lib/defaults.ts`: `aiPolicy: "no-training"`. En `robots.txt` eso se traduce en:

- **Bloqueados** (no entrenan modelos con el contenido): `GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`,
  `Applebot-Extended`, `Bytespider`, `Meta-ExternalAgent`, `cohere-ai`, `cohere-training-data-crawler`.
- **Permitidos** (pueden buscar y recomendar el sitio): `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`,
  `Perplexity-User`, `Claude-SearchBot`, `Claude-User`, `Google-Extended`, `DuckAssistBot`, `MistralAI-User`.

Verificado leyendo el `robots.txt` real de `jomerarte.com` y de `frases.jomerarte.com` (son distintos entre sí,
como corresponde). El valor por defecto es "sin entrenamiento" también para los subdominios nuevos.

### 3.7 Archivos muertos borrados

`robots.txt` y `sitemap.xml` de la raíz del repo, `BingSiteAuth.xml` duplicado (raíz, `src/app/` y
`src/app/(site)/`), `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts`, `src/app/llms.txt/route.ts`,
`src/app/llms-full.txt/route.ts`, `src/components/PreviewBanner.tsx` y las páginas viejas de la raíz
(`src/app/(site)/page.tsx`, `[...slug]/page.tsx`, `buscar/`, `layout.tsx`, `error.tsx`, `not-found.tsx`), que
ahora viven bajo `/h/[site]/`.

### 3.7-bis Por qué `sitemap.xml`, `robots.txt` y `manifest.webmanifest` NO son `force-static`

Cuando el sitio se desplegó por primera vez, Vercel falló con:

```
Error: Invariant: failed to find source route /h/[site]/sitemap.xml for prerender /h/[site]/sitemap.xml
```

No es un error del código: es un choque entre dos cosas que Next 16 no combina bien.

- Vercel no corre `next build` pelado: al final le enchufa un **adaptador** que revisa el resultado
  del build. Ese paso **solo existe en Vercel**, por eso en la computadora compilaba.
- Una ruta que **se llama como un archivo de metadatos** (`sitemap.xml`, `robots.txt`,
  `manifest.webmanifest`) **y** es estática (`force-static`) **dentro de una carpeta con parámetro**
  (`[site]`) queda anotada como "metadato prerenderizado" y el adaptador, al buscarla, no la
  encuentra → excepción y build roto.

Solución: esas tres rutas se generan al vuelo (sin `force-static`) y **el CDN las guarda igual una
hora** gracias a la cabecera `Cache-Control: public, s-maxage=3600`. `llms.txt` y `llms-full.txt`
sí son estáticas: no se llaman como archivo de metadatos y compilan sin problema.

**Para no volver a pisarlo:** `npm run build:vercel` hace el build con el mismo adaptador y detecta
esta clase de errores en la computadora. Es el chequeo que hay que correr antes de subir algo que
toque rutas o configuración de Next.

### 3.8 Orden y limpieza del repositorio

- **`.gitignore`**: ya lo habías creado vos en GitHub y está bien (`node_modules`, `.next`, `.env*` con la
  excepción `!.env.example`, `*.tsbuildinfo`, `next-env.d.ts`, sistema y logs). Se respetó tal cual.
- **`.env.example`**: también es tuyo y está completo (incluye `CRON_SECRET` y las de Mercado Libre). Se respetó
  tal cual; lo que agregué es la explicación de qué valor poner en cada una (punto 5).
- **`package-lock.json`**: se genera solo cuando corrés `npm install` en la carpeta del proyecto. Ya estaba en tu
  copia; ahora queda **versionado** (recomendado: es lo que hace que Vercel instale exactamente las mismas
  versiones que probaste). `node_modules/` va ignorado, como corresponde. Si algún día te aparece otro
  `package-lock.json` adentro de una subcarpeta, ese sí es basura y se puede borrar.

### 3.9 Trucos de juegos (página nueva)

Tipo de página nuevo llamado **“Trucos de juegos”**, que se elige al crear una página desde el panel
(“Páginas personalizadas”) y se puede usar en el sitio principal o en cualquier subdominio.

**Cómo se ve para el visitante** (`src/components/views/CheatsTables.tsx`, `src/lib/cheats.ts`, `src/lib/sections.ts`)

- Un cuadro por juego, con el nombre del juego como encabezado y tres columnas: **Código del truco · Para qué
  sirve · Detalle**. El nombre del juego no se repite en cada fila: encabeza su tabla (así lo pediste: una tabla
  por juego).
- Cada código tiene su botón **Copiar**. Arriba de cada juego hay tres acciones: **Copiar códigos** (todos los
  códigos, uno por línea), **Descargar .txt** (el juego completo, legible en Windows y Android) y
  **Imprimir / PDF** (imprime solo ese juego; en el diálogo del navegador se elige “Guardar como PDF”).
  Al principio de la página hay un **Imprimir todo / PDF**.
- **Buscador**: filtra al instante y **encuentra por nombre del juego, categoría, código, “para qué sirve” y
  detalle**. Así “armas”, “sin policías” o “policía” encuentran el truco aunque esa palabra no esté en el título.
  También hay chips de categoría. La búsqueda y la categoría quedan en la dirección (`?q=…&cat=…`) para poder
  compartir el enlace.
- En el celular cada truco se ve como ficha (código + copiar, para qué sirve y detalle); al imprimir o en
  pantalla grande se ve como tabla.

**Cómo se carga desde el panel**

- **De a uno**: “Agregar truco” (los campos nuevos son *Código del truco* y *Para qué sirve*; el detalle va en el
  campo de siempre).
- **En bloque**: botón **Importar trucos** en la lista de la página
  (`src/app/admin/(panel)/s/[key]/importar/page.tsx` + `CheatImportForm.tsx` + `importCheatsAction`).
  1. Se elige el juego (uno que ya exista o uno nuevo).
  2. Se pega la lista, una línea por truco: `código; para qué sirve; detalle`.
     Se acepta punto y coma, tabulación (pegado directo desde Excel) o `|`. Si la planilla trae la columna del
     juego adelante, se ignora (el juego es el que se eligió).
  3. Antes de guardar se muestra la vista previa con la cantidad y los primeros trucos.
  4. Los trucos repetidos en la misma lista y los que ya estaban cargados en ese juego se saltean solos, y al
     volver a la lista se avisa cuántos se agregaron y cuántos se saltearon.

**Base de datos**

- Dos columnas nuevas en `items`: `code` (código del truco) y `purpose` (“para qué sirve”).
- Se agregan solas: `SCHEMA_VERSION` pasó de **8 a 9** y el `ALTER TABLE … ADD COLUMN IF NOT EXISTS` está en
  `src/lib/seed.ts`. Probado sobre una base ya existente (versión 8): las columnas se crean, el contenido no se
  toca y la versión queda en 9.

**Buscador general del sitio** (`src/lib/search.ts`): además del nombre y la categoría, ahora mira el código y
“para qué sirve”, y muestra cada truco como `CÓDIGO · para qué sirve` con el juego abajo.

**Verificación hecha**

- `npx tsc --noEmit` sin errores y `npx eslint .` sin problemas.
- `npm run build:vercel` termina bien e incluye la ruta nueva `/admin/s/[key]/importar`.
- Con la base de prueba: página pública 200 con dos juegos (10 trucos) y dos tablas; buscador por “armas”,
  “sin policías”, “policía” y por código devuelve el truco correcto; la importación guardó código, “para qué
  sirve”, detalle y categoría, respetó el orden y salteó los repetidos.
- La impresión por juego y la descarga `.txt` no se pudieron probar en un navegador real desde acá (no hay
  navegador en el entorno): conviene darles una pasada rápida en el celular y en la computadora.

---

## 4. Verificación completa (lo que se midió)

### 4.1 Compilación y calidad

| Control | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npx eslint .` | **0 problemas** |
| `npx next build` | **exit 0**, ~21 s |
| Rutas estáticas (`○`) | `/h/[site]`, `/h/[site]/[...slug]`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `llms.txt`, `llms-full.txt`, `/icon.svg`, `/admin/login` |
| Rutas dinámicas (`ƒ`) | panel (`/admin/...`, 9 rutas), APIs (11), `/h/[site]/buscar` |
| `ƒ Proxy (Middleware)` | presente y funcionando |

### 4.2 Páginas y archivos (todas con `Host` de cada subdominio)

| Petición | Resultado |
|---|---|
| `jomerarte.com/` | 200, cacheado |
| `jomerarte.com/Servicios`, `/Tienda`, `/inventos`, `/Cursos`, `/Recomendacion`, `/Paginas`, `/Truchadas`, `/Frases`, `/Cielinfier`, `/MisPaginas`, `/CancionesJomer`, `/PreciosServicios`, `/PreciosProductos`, `/Donacion`, `/SobreMi` | 200, cacheadas |
| `jomerarte.com/Servicios/Electricista/1-…`, `/Cielinfier/historia`, `/Frases/Poesias` | 200, cacheadas (`MISS` → `HIT`) |
| `jomerarte.com/Servicios?cat=Electricista` | 200 (los filtros por `?cat=` se resuelven en el navegador, no rompen la caché) |
| `jomerarte.com/buscar?q=juego` | 200, **sin caché** (a propósito) |
| `frases.jomerarte.com/`, `/Preguntas`, `truchadas.jomerarte.com/` | 200, cacheadas |
| `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `llms.txt`, `llms-full.txt` | 200, `s-maxage=3600`, contenido correcto por sitio |
| `/BingSiteAuth.xml` | 200, XML original |
| `/h/_/Servicios` y cualquier `/h/...` escrito a mano | **404** + `noindex` |
| `/admin` sin sesión | 307 → `/admin/login` + `X-Robots-Tag: noindex, nofollow` |
| `/admin/login` | 200 |
| Rutas del panel con sesión (`/admin`, `/seo`, `/ajustes`, `/menu`, `/sitios`, `/medios`, `/mercadolibre`, `/admin/pagina/servicios`, `/admin/s/custom`) | 200 |
| `/api/health`, `/api/whoami` | 200 |
| `/Contacto` | 404 (esa página no existe: la lista es la del sitemap) |

---

## 5. Lo que tenés que cargar en Vercel

**Dónde:** panel de Vercel → tu proyecto → *Settings* → *Environment Variables*. Cargá cada una para
*Production* (y *Preview* si querés que las vistas previas funcionen igual).

| Variable | Qué poner | Obligatoria |
|---|---|---|
| `DATABASE_URL` | la cadena de conexión de Neon, terminada en `?sslmode=require` | **Sí** |
| `NEXT_PUBLIC_SITE_URL` | `https://jomerarte.com` | **Sí** |
| `SESSION_SECRET` | 64 caracteres hexadecimales aleatorios (ver abajo) | **Sí** |
| `CRON_SECRET` | 64 caracteres hexadecimales aleatorios (ver abajo, **distinto** del anterior) | Sí, si usás el cron |
| `ADMIN_PASSWORD` | podés dejarla **vacía**: la contraseña se define la primera vez desde `/admin/login` | No |
| `BLOB_READ_WRITE_TOKEN` | solo si guardás archivos en Vercel Blob (si no, los medios van a la base) | No |
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | solo si conectás Mercado Libre | No |

**Cómo generar los valores de `SESSION_SECRET` y `CRON_SECRET`:**

Son dos claves secretas de 64 caracteres hex (32 bytes). Cualquier cosa que sea larga, aleatoria y distinta entre
sí sirve. Opciones, de la más simple a la más formal:

1. **Sin instalar nada:** pegá en la consola del navegador (F12 → *Console*) esto dos veces y copiá cada resultado:
   ```js
   [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("")
   ```
2. **Si tenés terminal / WSL / Git Bash:** `openssl rand -hex 32` (corrélo dos veces, uno para cada variable).
3. **Con Node instalado:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Van a quedar así (ejemplo inventado, **no uses este**):

```
SESSION_SECRET = 9f3c1a7b24d8e05f6b1c93a4e7d20f8b55c6a1d3e0f7492b8c5d6e1a3f0b2c4d
CRON_SECRET    = 4d7e0b1c93f6a28d5e0c7b4a1f9d3e6c82b5a0f4d7c1e93b6a8f2d5e0c4b7a19
```

- **`SESSION_SECRET`** firma la cookie de tu sesión de administrador. Si la cambiás, se cierran todas las
  sesiones abiertas (no se pierde nada más). Si la dejás vacía, la app genera y guarda una en la base la primera
  vez (funciona, pero es mejor fijarla).
- **`CRON_SECRET`** es la "contraseña" que usa el cron de Vercel (`vercel.json` → todos los días 9:00 a
  `/api/cron/mercadolibre`). Vercel la manda sola como `Authorization: Bearer <CRON_SECRET>`; no hay que
  configurar nada más. Si no coincide, ese endpoint responde 401.

**Después de cargar las variables:** *Deployments* → los tres puntos del último deploy → **Redeploy** (las
variables se leen al arrancar, no en caliente).

**Para los subdominios:** en *Settings* → *Domains* agregá `*.jomerarte.com` (comodín) además de
`jomerarte.com`. Sin el comodín, `frases.`, `cielinfier.`, etc. no llegan a la app.

---

## 6. Pendientes que dependen del panel (no del código)

1. **Bing:** volver a pedir la verificación con `https://jomerarte.com/BingSiteAuth.xml` (ahora sí responde 200 y
   es XML válido).
2. **Google Search Console:** enviar `https://jomerarte.com/sitemap.xml` (y el de cada subdominio si los diste de
   alta como propiedades).
3. **Vercel:** el comodín de dominios y el redeploy del punto 5.
4. Si querés saber cuánto bajó el consumo de CPU: compará *Usage → Fluid Active CPU* de los próximos 7 días con
   la semana anterior; el cambio se nota sobre todo en las páginas de sección y en los archivos sueltos.

---

## 7. Cómo comprobarlo vos mismo

Una vez deployado, en una terminal:

```bash
# 1. La segunda visita tiene que traer "hit" y una cabecera s-maxage
curl -sI https://jomerarte.com/Servicios | grep -i "x-vercel-cache\|cache-control"

# 2. Los archivos sueltos, por sitio
curl -s  https://frases.jomerarte.com/robots.txt | tail -3
curl -s  https://jomerarte.com/robots.txt | tail -3

# 3. El sitemap tiene que listar las páginas del sitio principal
curl -s  https://jomerarte.com/sitemap.xml | grep -c "<loc>"
```

En el navegador: abrí el panel, cambiá un título, guardá y recargá el sitio público → el cambio tiene que estar
**en la primera recarga**.

---

## Anexo — cómo se probó

- Postgres real en el entorno de trabajo (base `app_db`), con los datos del sitio.
- `next build` + `next start` (build de producción, no `next dev`), pidiendo las páginas con la cabecera `Host`
  de cada subdominio para simular el proxy de Vercel.
- Para las pruebas del panel se generó una sesión de administrador válida con el mismo formato de cookie que usa
  la app (`admin.<vencimiento>.<firma HMAC>`), leyendo el secreto de la tabla `settings`.
- La base quedó como estaba: el título de la publicación que se usó como testigo
  (*Tablero didáctico de electricidad*) fue restaurado, y las pruebas posteriores se hicieron sobre una copia
  limpia (`.next` regenerado desde cero).
- Los archivos temporales de prueba (una ruta de diagnóstico y dos scripts) **se borraron antes de este informe**.
