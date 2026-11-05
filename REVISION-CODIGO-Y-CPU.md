# Revisión del código de Jomerarte y del aviso de CPU de Vercel

**Fecha:** 5 de noviembre de 2026
**Alcance:** revisión **solo lectura** de todo el repositorio (100 archivos en `src/`, ~18.100 líneas),
más `npm install` + `tsc --noEmit` + `eslint .` + `next build` en un entorno local para verificar que
compila y para ver **cómo queda configurada cada ruta**.
**No se modificó ninguna línea de código.** El único archivo nuevo es este informe.

> **Nota (5/11/2026):** este documento es el diagnóstico **del estado inicial**, escrito antes de tocar nada; por
> eso dice que todas las rutas son dinámicas. Las correcciones aplicadas y su verificación medida están en
> **`INFORME-VERIFICACION.md`**.

---

## 1. Veredicto en 30 segundos

El código está **bien escrito**. No es el típico proyecto generado por IA y parcheado a mano: hay criterio,
comentarios que explican *por qué* de cada decisión, tipos estrictos, validación de datos que vienen del panel,
sesiones firmadas, aislamiento por sitio y cero errores de compilación o de lint. En calidad de código te pondría
un 8/10.

El problema del aviso de Vercel **no es un bug**. Es una decisión de arquitectura: **el sitio entero se renderiza
en el servidor en cada visita y no tiene ni una sola caché**. El build lo confirma sin lugar a dudas:

```
Route (app)                    ← resultado real de `next build`
┌ ƒ /                          ƒ = dinámica (se renderiza en cada request)
├ ƒ /_not-found
├ ƒ /[...slug]                 ← todas las páginas de contenido
├ ƒ /admin…                    (9 rutas del panel)
├ ƒ /api/…                     (11 rutas)
├ ƒ /buscar
├ ƒ /llms.txt  ├ ƒ /llms-full.txt
├ ƒ /robots.txt ├ ƒ /sitemap.xml ├ ƒ /manifest.webmanifest
├ ○ /icon.svg                  ← la ÚNICA ruta estática de todo el sitio
```

Traducido: **cada** visita, **cada** página que abre un buscador, **cada** bot de IA, **cada** imagen guardada en la
base y **cada** `sitemap.xml` que pide Google **despierta una función y la hace trabajar desde cero**: consultar
Postgres, armar el menú, generar el HTML, generar los datos estructurados JSON-LD, serializar el payload de React.

Fluid Active CPU mide exactamente eso: **tiempo de CPU realmente ocupado** (no tiempo de reloj esperando a la base
de datos). Tu plan gratuito incluye 4 h = **14.400 segundos de CPU por mes**; al 90 % estás en ~13.000 s.
Para que te des una idea: si una página cuesta del orden de 40–100 ms de CPU (render de React + HTML + JSON-LD),
esos 13.000 s equivalen a **unas 130.000–320.000 páginas renderizadas en el mes**. Un sitio con tu tráfico humano no
llega a eso: la diferencia la ponen los **bots y los crawlers**.

> Las 40–100 ms son una **estimación** de orden de magnitud, no una medición tuya. Para confirmarlo, en Vercel:
> **Observability → Fluid Active CPU**, agrupado por ruta. Vas a ver de inmediato qué rutas se comen el tiempo.

---

## 2. Por qué el sitio terminó 100 % dinámico

No fue un capricho: es la consecuencia lógica de cómo se resolvieron los subdominios.

`src/lib/site.ts` decide qué sitio mostrar leyendo `headers()` (el dominio) y `cookies()` (el sitio que el
administrador eligió en el panel). **En Next.js, usar `headers()` o `cookies()` en un layout obliga a renderizar
esa página en cada request.** Y como esa decisión se toma en `getCurrentSite()`, que usan *todos* los datos
(`getSettings`, `getPageTexts`, `getMenuModel`, `getItems`…), la decisión se contagia a **todo** el árbol.

Después se puso `export const dynamic = "force-dynamic"` en `src/app/layout.tsx`, en `(site)/page.tsx`,
en `(site)/[...slug]/page.tsx`, en `sitemap.ts`, `robots.ts`, `manifest.ts`, `llms.txt`, `llms-full.txt` y en
las 11 rutas de API. Resultado: **0 % de caché, 0 % de ISR, 0 % de HTML estático**.

Y hay una pista de que el diseño original *sí* pensaba en caché: en `src/app/admin/actions.ts`,
`menu-actions.ts` y `ml-actions.ts` hay `revalidatePath("/", "layout")` después de guardar. **Hoy esas llamadas no
hacen nada**, porque no hay nada cacheado que invalidar. La infraestructura para cachear ya está escrita; falta
darle algo que cachear.

### La cadena de costo de una sola visita a una página de sección

1. `getCurrentSite()` → cookie + `isAdmin()` (y si hay sesión, una consulta más para leer el secreto de sesión
   porque `SESSION_SECRET` no está configurado).
2. `getSiteSlugs()` → 1 consulta a `sites`.
3. `getSettings()` → 1 consulta a `settings` (todas las claves del sitio).
4. `getPageTexts()` → 1 consulta a `pages` + `getCustomSections()` → 1 consulta a `items`.
5. `getSeoContext()` → 1 consulta a `items` (tus otras páginas).
6. Render del layout: header, menú, footer, JSON-LD del sitio, botón de WhatsApp.
7. `getItems(sección)` → 1 consulta, y render de **toda** la lista.
8. Render de la página + JSON-LD de breadcrumbs y de la lista + payload RSC.

Son del orden de **5 a 12 consultas a Postgres** y **un render completo** por cada visita. En la portada, además,
`getRandomItem()` ×2 y `getFeatured()` con `ORDER BY random()`.

### Los multiplicadores que probablemente dispararon el número

| Multiplicador | Dónde | Por qué pega fuerte |
|---|---|---|
| **Bots de IA invitados explícitamente** | `src/lib/defaults.ts` → `aiPolicy: "all"`; `src/app/robots.ts` autoriza a `GPTBot`, `CCBot`, `ClaudeBot`, `Bytespider`, `PerplexityBot`… | Cada uno recorre el sitio completo, en dinámico, sin caché. Es el sospechoso número uno. |
| **SEO/IA agresivo** | `sitemap.xml`, `llms.txt`, `llms-full.txt`, IndexNow en cada guardado | Más superficie = más rastreo. `llms-full.txt` genera hasta 400.000 caracteres en cada visita que no venga del CDN. |
| **Sitemap dinámico** | `src/app/sitemap.ts` + `sitemap-entries.ts` | Cada pedido recorre `items` entero (`GROUP BY section` + segunda consulta de detalle). Los buscadores lo piden seguido. |
| **Imágenes servidas desde la base** | `src/app/api/media/[...path]/route.ts` | Si el archivo no está en Vercel Blob, **cada imagen es una invocación de función + consulta a la base**. La respuesta usa `max-age`, que cachea el *navegador*, pero Vercel cachea en su CDN con `s-maxage`: sin eso, cada visitante nuevo (y cada bot) vuelve a bajar la imagen por la función. |
| **Buscador** | `src/lib/search.ts` | `/buscar` trae **toda** la tabla `items` del sitio a memoria y puntúa en JavaScript, en cada búsqueda. Sin límite de filas ni índice de texto. |
| **Listas sin paginación** | `src/components/views/SectionView.tsx` → `Filterable` | Los ítems se renderizan **en el servidor** y se mandan ya dibujados a un componente cliente (`FilterableList`) como `node: ReactNode`. Mucho HTML, mucho payload y mucho render, para que el filtro sea instantáneo. |
| **Aleatoriedad en la portada** | `getFeatured(8, …)` con `ORDER BY random()` y `getRandomItem()` | Impide cachear la home tal como está. |

---

## 3. Cómo cada una de tus 5 tandas de cambios fue sumando consumo

| # | Cambio que hiciste | Lo que agregó al costo por visita |
|---|---|---|
| 1 | Menú en celulares, Telegram, ortografía, **páginas editables** | Cada página editable = una fila en `pages`/`items` que hay que leer antes de dibujar. Se pasó de "contenido fijo en el código" a "consultar la base en cada request". |
| 2 | **Subdominios independientes** | Es el cambio más caro: para saber qué sitio mostrar hay que leer el dominio y la cookie → `headers()`/`cookies()` → **todo dinámico, para siempre**. La solución al clonado fue correcta, pero el precio es no poder cachear. |
| 3 | Juegos con categorías, lupa, descargas, 404 en subdominios | Render de listas completas + cliente que recibe nodos ya renderizados; y `/buscar` hace un escaneo completo de la tabla. |
| 4 | **Mercado Libre** | El cron diario está bien hecho (`maxDuration = 60`, presupuesto de 50 s, `mlCronDue`). Pero `/api/og` baja y parsea hasta 800 KB de HTML ajeno, y la sincronización también se dispara al guardar. Impacto real: bajo, comparado con el resto. |
| 5 | Orden de menú, categorías alfabéticas, destacados aleatorios, editar páginas fijas | Más consultas para armar el modelo de menú en cada render, y la aleatoriedad de destacados hace que la portada no se pueda cachear sin cambiar el enfoque (p. ej. elegir el azar en el navegador sobre una lista cacheada). |

**Nada de esto está "mal hecho".** Cada función que pediste está bien implementada. El problema es que todas se
resolvieron del lado del servidor, en vivo, y sin caché.

---

## 4. Lo que está bien (y no es poco)

- **TypeScript estricto, `tsc --noEmit` limpio, `eslint .` limpio, `next build` sin errores ni advertencias.**
  Esto, en un proyecto editado muchas veces por herramientas distintas, es raro y habla bien del estado del repo.
- **Seguridad bien resuelta:** sesión con HMAC-SHA256 y comparación de tiempo constante (`timingSafeEqual`),
  contraseña con `scrypt` + sal, cookie `httpOnly`/`sameSite`, secreto de sesión rotado al cambiar la contraseña,
  `httpOnly` en la cookie de sitio, y acciones de servidor con `requireAdmin()` en **todas** las que tocan datos.
- **Texto enriquecido sin XSS:** `richTextToHtml()` escapa primero y después aplica negritas, enlaces y listas
  (`src/lib/format.ts`). No hay `dangerouslySetInnerHTML` con contenido crudo en ningún lado.
- **SQL siempre parametrizado** (Drizzle o `sql` con placeholders). La lectura por rangos de `/api/media` está bien
  hecha, incluso con `Content-Range` y 416.
- **Aislamiento de subdominios correcto:** columna `site` en `items` y `settings`, plantillas de creación,
  clonado de contenido, borrado en cascada por sitio y el aviso de "cambiaste de sitio en otra pestaña"
  (`SITE_MISMATCH`). Es la parte más delicada de todo el proyecto y está bien pensada.
- **Precios de Mercado Libre** con token cifrado en la base, refresco, presupuesto de tiempo y resumen de corrida.
  Muy por encima de lo que suele verse en proyectos así.
- **Detalles de oficio:** `attachDatabasePool` de `@vercel/functions`, pool con reconexión, conexión perezosa para
  que el build no dependa de la base, `after()` para IndexNow, `AbortSignal.timeout` en todos los `fetch` externos,
  `robots` con `noindex` en el panel, `X-Robots-Tag` en `/admin`, JSON-LD saneado.
- **Comentarios en castellano que explican el "por qué"**, no el "qué". Eso hace que el proyecto se pueda mantener.

---

## 5. Problemas concretos que encontré

### Graves para la factura

1. **Todo dinámico, sin caché** (`dynamic = "force-dynamic"` en 8 archivos de página + sitemap/robots/llms).
   Es el 90 % del problema.
2. **`aiPolicy: "all"` por defecto** y `robots.ts` autorizando a los 17 bots de IA (9 asistentes + 8 de
   entrenamiento). Un sitio dinámico con `llms.txt` es un imán para ellos.
3. **Imágenes desde la base sin `s-maxage`.** `api/media` responde `Cache-Control: public, max-age=31536000, immutable`.
   Ojo: en Vercel, el CDN cachea respuestas de funciones con **`s-maxage`**; `max-age` es solo para el navegador.
   Además, cuando el archivo está en Blob, la respuesta es un `307` **sin** cabeceras de caché → una invocación +
   una consulta a la base por cada visualización.
4. **`/api/cron/mercadolibre` es público si no configurás `CRON_SECRET`.** Cualquiera puede hacer que sincronice
   (consume CPU y llama a la API de ML). El README lo recomienda, pero el código no lo obliga.
5. **`/buscar` sin límite**: trae toda la tabla y puntúa en JS. Con pocos cientos de ítems se nota; con miles, duele.

### Bugs reales (no de rendimiento)

6. **`robots.txt`, `sitemap.xml` y `BingSiteAuth.xml` en la raíz del repo no se publican.** Next solo sirve
   `public/`. Y son de una versión vieja:
   - `robots.txt` dice `Sitemap: https://jomerararte.com/sitemap.xml` → **dominio mal escrito** (jomerararte ≠ jomerarte).
   - `sitemap.xml` está **malformado**: empieza con el texto "Crea un archivo sitemap.xml con todas tus URLs:" y mete
     varios `<loc>` dentro de un mismo `<url>`.
   Sirven los de verdad (`src/app/robots.ts`, `src/app/sitemap.ts`), así que hoy no rompen nada… pero si alguna vez
   los movés a `public/` te rompen el SEO. Conviene **borrarlos**.
7. **`src/app/BingSiteAuth.xml` y `src/app/(site)/BingSiteAuth.xml` no son rutas** (una ruta necesita `route.ts`).
   Si Bing te validó, fue por el `<meta name="msvalidate.01">`, no por ese archivo.
8. **Falta `package-lock.json`, `.gitignore` y `.env.example`**, que son justamente los tres archivos que el propio
   README (§1) te pide subir. Sin lockfile, cada deploy puede instalar versiones distintas de las dependencias.
9. **`getItem(id)` no filtra por sitio** (`src/lib/data.ts`): la página valida `item.site !== site.slug` y da 404,
   pero `generateMetadata` del detalle solo compara `item.section` — una URL de un producto de otro sitio genera
   metadatos (título/descripción) antes de dar 404. Defensa en profundidad: filtrar por sitio ya en la consulta.
10. **`ensureSeeded()` está en el camino de cada request.** En cada arranque de instancia hace
    `SELECT __schema_version` y, si cambió la versión, corre **todo el DDL** dentro del request. Y si la migración
    falla, `seedPromise` se resetea y **se reintenta en cada visita** (con `ON CONFLICT` y locks, pero se reintenta).
11. **Los errores de base se silencian** (`getSettings`, `getPageTexts`, `getSiteSlugs` hacen `catch` y devuelven
    valores por defecto). Si Neon se cae, el sitio se ve **vacío** en lugar de mostrar un error: más difícil de
    detectar y, peor, sigue "funcionando" y gastando CPU.
12. **`existingSchemaVersion`/`SCHEMA_SQL` con `UPDATE`s de corrección ortográfica** ("Jomer Works" → "Jomer Worrhis",
    "Herje" → "Hereje") mezclados con el DDL de migración. Funciona, pero es deuda técnica: cada bump de versión
    reejecuta correcciones de texto sobre toda la tabla.

### Menores / deuda

13. **Sin paginación** en ninguna lista (servicios, tienda, frases, juegos). A medida que cargues contenido, cada
    página pesa más.
14. **Sin `loading.tsx`**: como todo es dinámico, la navegación se siente lenta (no hay feedback hasta que el
    servidor termina).
15. **Imágenes `<img>` sin `width`/`height`** → saltos de maquetación (CLS) en el hero y en las tarjetas.
16. **`public/` pesa 12 MB**, con PNGs de 1,2 a 2,8 MB usados como imagen de portada de sección
    (`frases V2.png`, `materiales V2.png`, `Cielinfier V2.png`…). No es CPU, pero es **transferencia**: en WebP,
    cada una bajaría a 150–300 KB.
17. **`drizzle.config.json` con `postgresql://postgres:postgres@127.0.0.1` fijo.** Inofensivo, pero confunde.
18. **Sin `loading` ni `error` boundary por sección** y sin cabeceras de seguridad (CSP, `X-Frame-Options`,
    `Referrer-Policy`). No es urgente; el panel sí las merecería.
19. **`/api/health` consulta la base.** Si lo usás con un monitor cada minuto, son ~43.000 invocaciones al mes
    (poco CPU, pero suma).

---

## 6. Plan de acción, de menor a mayor esfuerzo

Todo esto **no está aplicado**: es lo que yo haría, en este orden.

### Nivel 0 — esta semana, sin tocar la arquitectura (30–60 min)

1. **Confirmar el diagnóstico** en Vercel → Observability → Fluid Active CPU por ruta. Si `/sitemap.xml`,
   `/api/media/*`, `/buscar` y `/[slug]` están arriba, el plan de abajo es el correcto.
2. **Crear `CRON_SECRET`** en Vercel (texto largo al azar). Cierra `/api/cron/mercadolibre` al público.
3. **Crear `SESSION_SECRET`** (32 bytes hex). Evita una consulta a la base por request de cada sesión de admin.
4. **Bajar la política de IA** en `/admin/seo` de "todos" a "solo asistentes, sin entrenamiento" mientras dure el
   problema: los bots de entrenamiento (`GPTBot`, `CCBot`, `Bytespider`…) son los que más páginas recorren y no te
   traen visitas.
5. **Cachear las imágenes en el CDN**: agregar `s-maxage=31536000, stale-while-revalidate` a `/api/media` y a la
   redirección a Blob, y `s-maxage` en las respuestas 404.
6. **Borrar** `robots.txt`, `sitemap.xml` y `BingSiteAuth.xml` de la raíz (son archivos muertos y uno tiene el
   dominio mal escrito).

### Nivel 1 — una tarde: devolverle la caché al sitio público (la mayor parte del ahorro)

7. **Sacar `force-dynamic` del sitio público** y reemplazarlo por ISR:
   `export const revalidate = 300` (5 min) en `(site)/page.tsx` y `[...slug]/page.tsx`, y `revalidate = 3600` en
   `sitemap.ts`, `robots.ts`, `manifest.ts`, `llms.txt` y `llms-full.txt`.
   Las llamadas a `revalidatePath("/", "layout")` que **ya existen** en `admin/actions.ts`, `menu-actions.ts` y
   `ml-actions.ts` van a empezar a funcionar solas: publicás algo y la caché se refresca al instante.
8. **Envolver la lectura de datos en `unstable_cache` con tags** (`settings`, `pages`, `items:<sección>`, `menu`)
   en lugar de solo `cache()` de React, que dura un único request. Así una visita no caliente sigue sin tocar la base.
9. **Resolver el "todo depende del dominio"**: mover la detección de subdominio a un `proxy.ts` (middleware) que
   reescriba a un segmento interno, o pasar el host a las funciones de datos como parámetro cacheable. Es el único
   cambio de verdad estructural del nivel 1 y es lo que desbloquea el resto.
10. **Portada sin aleatoriedad en el servidor**: cachear 20–30 destacados y elegir 8 en el cliente, o revalidar cada
    5 minutos y aceptar que los destacados cambien cada 5 minutos en lugar de cada visita.
11. **Agregar `loading.tsx`** al grupo `(site)` para que la navegación se sienta instantánea con ISR.
12. **Revisar el `prefetch` de los enlaces del menú**: con páginas dinámicas, pasar el mouse por el menú puede
    disparar precargas que se renderizan en el servidor. `prefetch={false}` en los enlaces secundarios del menú.

### Nivel 2 — arquitectura (lo que haría distinto de raíz)

13. **Separar el panel del sitio público.** `/admin` puede ser dinámico y sin caché (lo usa una sola persona);
    el sitio público debe ser estático/ISR. Hoy comparten layout raíz y ese layout es el que fuerza todo a dinámico.
14. **Búsqueda en SQL, no en JavaScript**: `WHERE site = $1 AND published AND (title ILIKE … OR categories::text ILIKE …)`
    con índice GIN/trigram, y paginación de resultados (24 por página).
15. **Paginación en las listas** (24–48 ítems) y filtrar en el cliente solo sobre esa página.
16. **Migraciones fuera del request**: aplicar el DDL en el deploy (script en `build` o `drizzle-kit migrate`),
    dejando en el request solo una verificación barata. Y separar las correcciones de texto de las migraciones.
17. **Archivos a Vercel Blob por defecto** (ya está el soporte, `uploadConfig()` lo detecta): las imágenes dejan de
    pasar por la función y las sirve el CDN de Blob.
18. **No silenciar errores de base**: loguear y mostrar un `error.tsx` decente en vez de un sitio vacío.

### Nivel 3 — si el plan gratuito no alcanza

19. **Poner Cloudflare gratis delante** (proxy naranja) con "Cache Everything" para HTML y `Bypass` para `/admin`
    y `/api/*` con cookies: se puede recortar muchísimo sin tocar una línea de código.
20. **Vercel Pro (USD 20/mes)** resuelve el límite, pero **no arregla el problema**: con el mismo tráfico vas a pagar
    por uso bajo demanda. Primero el nivel 1, después decidís.
21. Alternativa de fondo: como el sitio es un CMS sobre Postgres, mover el renderizado a un VPS o a Cloudflare
    Workers + Hyperdrive. Es un proyecto aparte, no urgente.

---

## 7. Si tuviera que elegir solo tres cosas

1. **`revalidate` + `unstable_cache` en el sitio público** y sacar `force-dynamic` del sitio público.
   Estimación: **entre 80 % y 95 % menos CPU**, porque un HTML cacheado cuesta 0 ms de CPU por visita.
2. **Bajar la política de IA y cachear `/api/media` en el CDN.** Sin tocar código de páginas.
3. **Configurar `CRON_SECRET` y `SESSION_SECRET`.** Dos variables de entorno, cinco minutos.

Con eso deberías volver a entrar cómodo en las 4 horas gratuitas. El nivel 2 es para que el problema no vuelva
cuando el sitio crezca.

---

## Anexo — qué revisé

- Configuración: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vercel.json`,
  `drizzle.config.json`, `postcss.config.mjs`.
- Datos: `src/db/index.ts`, `src/db/schema.ts`, `src/lib/{data,site,sites,seed,seed-data,nav,sections,defaults,seo,seo-server,sitemap-entries,search,llms,indexnow,mercadolibre,ml-ref,hosts,storage,format,auth,links,platforms,social,site-templates}.ts`.
- Rutas: las 13 páginas de `(site)` y `admin`, y las 11 rutas de `api`.
- Componentes: `Header`, `Footer`, `MobileNav`, `HeaderSearch`, `FilterableList`, `ui`, `client`, `media`, `icons`,
  `JsonLd`, `PreviewBanner`, `views/{SectionView,PageViews,SubsiteHome}` y el panel completo.
- Verificaciones ejecutadas: `npx tsc --noEmit` (sin errores), `npx eslint .` (sin avisos),
  `npx next build` (compila; 1 ruta estática de 31).
