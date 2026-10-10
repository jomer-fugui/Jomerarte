# Jomerarte

Sitio web de **Jomer Works**: servicios de electricidad, cámaras, páginas web y cursos; tienda vinculada a
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

## 3. Dominio jomerarte.com y subdominios

En Vercel → **Settings → Domains** agrega:

- `jomerarte.com` y `www.jomerarte.com`
- `frases.jomerarte.com` → abre directamente **Frases de un Herje** (`/Frases`, `/Colmos`, `/Poesias`)
- `cielinfier.jomerarte.com` → abre directamente **CielInfier** (`/`, `/historia`, `/proceso`)

Luego crea en tu proveedor de dominio los registros DNS que Vercel te indique. El sitio detecta los subdominios solo.

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
| La página tarda la primera vez | Neon “despierta” la base tras un rato sin uso; es normal que la primera visita demore 1 o 2 segundos. |
