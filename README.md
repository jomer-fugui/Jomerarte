# Jomerarte

Sitio web de **Jomer Worrhis**: servicios de electricidad, cámaras, páginas web y cursos; tienda vinculada a
Mercado Libre, Hotmart, AliExpress, Amazon y otras; recomendaciones, truchadas, frases, poesías, canciones,
CielInfier, inventos, listas de precios y donaciones.

Hecho con **Next.js 16 + PostgreSQL (Drizzle ORM)**. Todo el contenido se edita desde el panel **`/admin`**.

---

## 1. Qué subir a GitHub (y qué NO)

✅ **Sube solo esto** (son unos 70 archivos, el más pesado ocupa menos de 0,5 MB):

```
src/                  public/
package.json          package-lock.json
next.config.ts        tsconfig.json
postcss.config.mjs    eslint.config.mjs
drizzle.config.json   README.md
.gitignore            .env.example
```

❌ **NUNCA subas:**

| Carpeta / archivo     | Por qué |
|-----------------------|---------|
| `node_modules/`       | Tiene miles de archivos. Vercel los instala solo con `npm install`. |
| `.next/`              | Es el resultado de compilar (`npm run build`). Vercel lo genera en cada despliegue. Por eso GitHub te daba error: archivos enormes y carpetas con más de 1000 archivos. |
| `.env`, `.env.local`  | Contienen contraseñas. Esas variables se cargan en Vercel (paso 2.2). |

El archivo **`.gitignore`** hace que Git (GitHub Desktop o la terminal) ignore esas carpetas automáticamente.

**Si subes desde la web de GitHub (arrastrando archivos):** GitHub acepta hasta 100 archivos y 25 MB por archivo en
cada subida. Sin `node_modules` ni `.next` el proyecto entra en una sola subida. Arrastra el contenido de la lista
de arriba. En Mac, pulsa `Cmd + Shift + .` para ver los archivos ocultos (`.gitignore`, `.env.example`).

**Si ya subiste `.next` o `node_modules` por error:**

- Opción fácil: borra el repositorio (Settings → Danger Zone → Delete) y crea uno nuevo subiendo solo la lista de arriba.
- Opción con terminal:
  ```bash
  git rm -r --cached .next node_modules .env .env.local
  git commit -m "Quitar archivos generados"
  git push
  ```

---

## 2. Publicar en Vercel

> **¿Vas a mudar el sitio a un servidor propio (VPS de Hostinger con Coolify)?** Está todo explicado, paso a paso,
> en **[`docs/MIGRACION-HOSTINGER.md`](docs/MIGRACION-HOSTINGER.md)**: el repositorio ya trae el `Dockerfile`, la
> forma de pasar los datos desde Neon y las tareas de copia de seguridad.

### 2.1 Importar el proyecto
1. En [vercel.com](https://vercel.com) → **Add New… → Project** → elige tu repositorio de GitHub.
2. Framework: **Next.js** (se detecta solo). No cambies los comandos de build.
3. Si el proyecto está dentro de una subcarpeta del repositorio, indícala en **Root Directory**.

### 2.2 Variables de entorno
En **Settings → Environment Variables** agrega:

| Variable                | Valor                                                  | ¿Necesaria? |
|-------------------------|--------------------------------------------------------|-------------|
| `ADMIN_PASSWORD`        | La contraseña para entrar a `/admin`                   | Recomendada |
| `SESSION_SECRET`        | Un texto largo al azar (40 letras y números)           | Recomendada |
| `NEXT_PUBLIC_SITE_URL`  | `https://jomerarte.com`                                | Opcional    |
| `DATABASE_URL`          | Se crea **sola** al conectar Neon (paso 2.3)           | Obligatoria |
| `BLOB_READ_WRITE_TOKEN` | Se crea **sola** al conectar Blob (paso 2.4)           | Recomendada |

### 2.3 Base de datos (obligatoria)
1. En tu proyecto de Vercel → pestaña **Storage** → **Create Database** → **Neon** (Postgres, tiene plan gratuito).
2. Elige una región cercana a tu público y crea la base.
3. Conéctala al proyecto marcando **Production**, **Preview** y **Development**. Si te pide un prefijo para las
   variables, déjalo vacío. Vercel agrega sola la variable `DATABASE_URL`.

> No hace falta correr ningún comando: **las tablas y el contenido de ejemplo se crean solos en la primera visita.**
> También funciona con Supabase, Railway o cualquier PostgreSQL: pega su conexión como `DATABASE_URL`.

### 2.4 Fotos y videos con Vercel Blob (recomendado)
Vercel limita cada subida que pasa por el servidor a **4,5 MB**. Para subir videos y archivos grandes:

1. **Storage → Create Database → Blob** → créalo y conéctalo al proyecto.
2. Vercel agrega sola la variable `BLOB_READ_WRITE_TOKEN` y el panel empieza a subir los archivos directo a Blob (hasta 500 MB).

Sin Blob el sitio igual funciona: los archivos se guardan en la base de datos con un máximo de 4 MB. Las fotos se
achican solas al subirlas; los videos largos conviene subirlos a YouTube y pegar el enlace.

### 2.5 Volver a desplegar
Las variables nuevas solo se aplican en un despliegue nuevo: **Deployments → ⋯ (último despliegue) → Redeploy**.

### 2.6 Entrar al panel
Abre `https://tu-sitio.vercel.app/admin` y entra con tu `ADMIN_PASSWORD` (si no la configuraste, la primera vez te pide crear una).

> **Importante:** el contenido (textos, fotos, productos, frases…) se guarda en la base de datos, **no en GitHub**.
> Lo editas desde `/admin` cuando quieras, sin volver a desplegar. Solo los cambios de **código** se suben a GitHub
> (Vercel vuelve a publicar solo con cada cambio).

---

## 3. Dominio jomerarte.com y subdominios independientes

Cada subdominio es **un sitio completamente independiente**: tiene su propio nombre, logo, colores, portada,
descripción, contacto, redes, menú, páginas y contenido. Lo que cambies en uno **no afecta** a los demás.

- `frases.jomerarte.com` y `cielinfier.jomerarte.com` ya vienen creados como sitios independientes
  (se les copió el contenido que tenías; desde ahora se editan por separado).
- Para crear otro (por ejemplo `juegos.jomerarte.com`): **/admin → Sitios → Crear un subdominio nuevo**, elige una
  plantilla (en blanco, frases, anime/videojuego, tienda, servicios, portafolio o blog) y listo.
- Para editarlo: elige el sitio en el selector de arriba del panel (**“¿Qué sitio quieres editar?”**). Todo lo que
  hagas (Ajustes, páginas, contenido) se guarda solo en ese sitio. Con **Vista previa** lo ves antes de conectarlo.
- En **Ajustes → Portada** de cada subdominio eliges qué página se muestra en su portada.

**Para publicarlos en internet**, en Vercel → **Settings → Domains** agrega:

- `jomerarte.com` y `www.jomerarte.com`
- cada subdominio: `frases.jomerarte.com`, `cielinfier.jomerarte.com`, `juegos.jomerarte.com`…
  (o un comodín `*.jomerarte.com`, que requiere usar los nameservers de Vercel)

Luego crea en tu proveedor de dominio los registros DNS que Vercel te indique (normalmente un CNAME por subdominio).
No hace falta volver a desplegar: el sitio reconoce el subdominio solo.

> Configura `NEXT_PUBLIC_SITE_URL=https://jomerarte.com` en Vercel: así el panel arma bien los enlaces de cada
> subdominio y la sesión del panel sirve para todos (entras una vez y puedes editar desde cualquiera).

---

## 4. Trabajar en tu computadora (opcional)

Necesitas [Node.js](https://nodejs.org) 20.9 o superior y una base PostgreSQL (puede ser la misma de Neon).

```bash
npm install
cp .env.example .env.local    # y completa DATABASE_URL
npm run dev                   # abre http://localhost:3000
```

`npm run build` solo sirve para probar la versión de producción: la carpeta `.next` que genera **no se sube** a GitHub.

---

## 5. Problemas comunes

| Problema | Solución |
|----------|----------|
| `DATABASE_URL is required` o la página dice **“Falta conectar la base de datos”** | Haz el paso 2.3 y vuelve a desplegar (2.5). |
| Error al subir un video | Activa Vercel Blob (2.4) o sube el video a YouTube y pega el enlace. |
| Olvidé la contraseña del panel | Cambia `ADMIN_PASSWORD` en Vercel y vuelve a desplegar. |
| GitHub no deja subir los archivos | No subas `node_modules` ni `.next` (ver sección 1). |
| Un subdominio muestra el sitio principal | Revisa que exista en /admin → Sitios y que esté agregado en Vercel → Domains. |
| La página tarda la primera vez | Neon “despierta” la base tras un rato sin uso; es normal que la primera visita demore 1 o 2 segundos. |

---

## 6. Crear páginas nuevas (desde el panel)

En **/admin → Crear página nueva** (o con “+ Página nueva aquí” en cada sección del panel):

1. Escribe el **nombre** (ej: *Emprendedores*).
2. Elige **dónde ubicarla** en el menú: Servicios, Tienda, Recomendaciones, No recomendable, Frases, CielInfier o Más.
   La dirección se arma sola: *Emprendedores* en Recomendaciones → `jomerarte.com/Recomendacion/Emprendedores`;
   *Seguridad* en Tienda → `jomerarte.com/Tienda/Seguridad`.
3. Elige el **tipo de página**: libre (texto, fotos y videos), recomendaciones, productos, servicios, no recomendable,
   frases, poesías, preguntas, publicaciones con galería, avances, personajes, capítulos, canciones, enlaces,
   lista de precios o medios de pago.
4. Guarda y agrega su contenido. Cuando quieras puedes cambiar el nombre, el tipo, la ubicación, el ícono, el orden
   o ocultarla, sin perder lo que cargaste.

## 7. Redes sociales

En **/admin → Ajustes → Redes sociales** puedes cargar Instagram, Facebook, YouTube, TikTok, X y **Telegram**
(el enlace `https://t.me/usuario` o simplemente `@usuario`). Aparecen en el pie de página y en el menú del celular.

---

## 8. Juegos, varias categorías, buscador y botones de descarga

- **Tipo de página “Juegos”**: al crear una página (o un subdominio con la plantilla *Juegos*) elige el tipo
  **Juegos**. Cada juego tiene portada, plataforma, tamaño, desarrollador, precio, puntuación, descripción,
  tráiler, capturas y **botones de descarga**.
- **Varias categorías por publicación**: en el formulario toca las categorías sugeridas o escribe nuevas
  (separadas por comas). Funciona en juegos, productos, frases, poesías, recomendaciones, personajes, etc.
- **Buscador (lupa)**: los visitantes pueden buscar por nombre o categoría dentro de cada lista (los juegos siempre
  tienen buscador; las demás listas lo muestran cuando tienen 8 o más elementos) y también en todo el sitio con la
  lupa de arriba (`/buscar`). Las categorías se pueden tocar para filtrar.
- **Botones con nombre personalizado**: “Agregar enlace” → escribe el nombre (ej: *Descargar por Mediafire*,
  *Descargar por Google Drive*) y pega el enlace. El color y el ícono se ponen solos (Mediafire, Google Drive, MEGA,
  Dropbox, Steam, itch.io, Google Play…).

## 9. Archivos viejos que hay que reemplazar en GitHub

Si subes los archivos arrastrándolos a GitHub, **los archivos que se borraron en una versión nueva siguen en el
repositorio**. Por eso, sube siempre la carpeta `src` completa. Importante:

| Archivo          | Qué hacer |
|------------------|-----------|
| `src/proxy.ts`   | Súbelo de nuevo (reemplaza al viejo). La versión antigua mandaba los subdominios *frases* y *cielinfier* a direcciones que ya no existen y daba **error 404**. |

Para comprobarlo: abre `src/proxy.ts` en GitHub; la versión correcta dice *“este archivo REEMPLAZA a la versión
antigua”* al principio.

---

## 10. Precios automáticos de Mercado Libre (con tu link de afiliado)

Los precios de tus productos de Mercado Libre se actualizan solos **una vez por día o cada 2 días** (lo eliges).
**Tu link de afiliado no se modifica nunca**: el botón “Comprar” sigue usando tu link; solo cambia el precio.
Si hay una promoción, se muestra el precio anterior tachado y el “% OFF”; si se queda sin stock, aparece el aviso.

**Configurar (una sola vez):** en **/admin → Precios ML** sigue los pasos:

1. Crea una aplicación gratis en *Mercado Libre Developers → Mis aplicaciones* con tu cuenta.
2. Pega la **URI de redirección** que te muestra el panel (ej: `https://jomerarte.com/api/mercadolibre/callback`)
   y marca los permisos de lectura y `offline_access`.
3. Copia el **App ID** y la **clave secreta** en el panel (o en Vercel como `ML_CLIENT_ID` y `ML_CLIENT_SECRET`).
4. Pulsa **Conectar con Mercado Libre** y acepta.

**Vincular cada producto:** edítalo y, en el recuadro amarillo *Precio automático de Mercado Libre*:

- Si tu link de afiliado es **largo**, el código se detecta solo.
- Si es **corto** (`meli.la/…` o `mercadolibre.com/sec/…`), abre el producto en el navegador y pega ese enlace
  (o el código, ej: `MLA12345678`) y pulsa **Detectar y traer precio**.
- Funcionan mejor los enlaces de **página de producto** (los que tienen `/p/` en la dirección): Mercado Libre no
  siempre deja consultar publicaciones sueltas de otros vendedores.

**En Vercel (plan gratuito):** el archivo `vercel.json` ya programa la actualización una vez por día (cerca de las
6:00 de Argentina). Vercel gratis no permite más de una vez por día. Recomendado: crea la variable `CRON_SECRET`
con un texto largo al azar para que solo Vercel pueda iniciarla. En el panel puedes **actualizar a mano** cuando quieras.

---

## 11. Menú y orden, páginas predeterminadas, categorías y destacados

- **Menú y orden** (`/admin/menu`): ordena las secciones del menú y las páginas de cada sección (las predeterminadas
  y las que creaste, mezcladas), renombra las secciones, oculta páginas y muévelas de sección. Las páginas
  predeterminadas conservan su dirección (por ejemplo, `/Cursos` sigue siendo `/Cursos`). El botón **Restaurar menú
  original** vuelve todo como estaba.
- **Editar páginas predeterminadas**: en cada sección (Electricista, Frases, Inventos…) usa **“Editar nombre, textos,
  imagen, ícono y ubicación”**. Las páginas principales (Servicios, Tienda, Recomendaciones, No recomendable) también
  se editan desde ahí; su nombre es el de la sección en el menú.
- **Categorías**: en cada sección con categorías abre **“Categorías”** para elegir el orden (alfabético —por defecto—,
  más usadas primero o personalizado con flechas) y cómo las ve el visitante: **deslizables** en una sola fila (por
  defecto, con botón para ver todas y buscar), **botón desplegable** o **todas visibles**. En el formulario de cada
  publicación, las sugerencias de categorías se ordenan de la A a la Z y se filtran mientras escribes.
- **Destacados**: la portada muestra como máximo 8 elementos destacados, elegidos al azar en cada visita. Si quieres
  más variedad, marca más elementos como destacados (estrella en el panel).

---

## 12. Google y asistentes con IA (ChatGPT, Gemini, Copilot, Claude, Perplexity)

El sitio entrega a los buscadores y a las IA toda tu información en formatos que entienden:

- **Datos estructurados (schema.org)** en cada página: tu negocio (tipo, dirección, coordenadas, zona de trabajo,
  horarios, teléfono, redes), el buscador del sitio, migas de pan y cada publicación con su tipo: servicios, cursos,
  productos (con precio y stock de Mercado Libre), juegos, reseñas de recomendaciones, frases, poesías, canciones,
  capítulos, novedades, listas de precios y preguntas frecuentes.
- **Metadatos completos**: título, descripción, imagen para compartir, dirección canónica (evita páginas duplicadas),
  idioma y región (es-AR) y ubicación.
- **`/llms.txt` y `/llms-full.txt`**: resumen del sitio y todas tus publicaciones en texto, para que las IA lo lean
  fácil (estándar llmstxt.org).
- **`robots.txt`** con permisos explícitos para los asistentes con IA (puedes limitarlos en Ajustes).
- **`sitemap.xml`** con fechas de actualización e imágenes, y **IndexNow**: cada vez que publicas o cambias algo se
  avisa al instante a Bing (que usan ChatGPT y Copilot).

**Qué tienes que hacer (una vez):**

1. **/admin → Ajustes → Ubicación y zona de trabajo**: tipo de negocio, ciudad, provincia, zonas donde trabajas,
   horarios y el enlace de tu ficha de Google Maps.
2. **/admin → Ajustes → Google e inteligencia artificial**: título y descripción para Google (con lo que haces y dónde).
3. Crea tu **Perfil de Empresa en Google** (business.google.com) con los mismos datos y pide reseñas.
4. Verifica el sitio en **Google Search Console** y en **Bing Webmaster Tools**, y envía `https://jomerarte.com/sitemap.xml`.
   Si verificas el dominio por DNS en Search Console, cubre también todos los subdominios.
5. Revisa **/admin → Google e IA**: muestra qué falta completar, cómo te ve Google y enlaces para probar todo.

> Cada subdominio tiene sus propios datos (en sus Ajustes), su sitemap, su robots.txt y su llms.txt.
