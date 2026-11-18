# Migrar Jomerarte de Vercel a un VPS de Hostinger (con Coolify)

Esta guía está pensada para hacerla de punta a punta en una tarde, sin saber Linux de memoria: los pasos son
copiar, pegar y tocar botones. Al final el sitio queda igual que ahora, pero en tu propio servidor, sin límites de
CPU ni cuentas que se pausan.

**Lo que vas a tener**

```
   Visitante
      │
      ▼
  Cloudflare (gratis: DNS, SSL, freno de bots)   ← opcional pero recomendado
      │
      ▼
  VPS Hostinger KVM 1 (Brasil) · 1 IP
      ├─ Coolify  (panel en http://IP:8000)
      ├─ Aplicación Next.js (este repositorio, en Docker)
      ├─ PostgreSQL 17 (los datos del sitio)
      └─ Tareas programadas (precios de Mercado Libre + copias de seguridad)
```

**Archivos que agregué al repositorio para esto**

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile` | Compila y empaqueta el sitio para correr en el VPS |
| `.dockerignore` | Deja la imagen liviana |
| `docker-compose.yml` | Probar todo en tu computadora o desplegar sin Coolify |
| `scripts/migrar-desde-neon.sh` | Trae los datos de Neon a la base nueva |
| `scripts/backup-base.sh` | Copia de seguridad diaria de la base |
| `src/proxy.ts` (cambio) | Corta los escaneos de robots antes de que gasten CPU |

---

## Antes de empezar: checklist

- [ ] Tenés el **usuario y la contraseña** de Hostinger y la **IP del VPS** (hPanel → VPS → Administrar).
- [ ] Tenés la **cadena de conexión de Neon** a mano (Neon → Connect → *Connection string*, con `sslmode=require`).
- [ ] Anotaste tu **contraseña del panel** (`ADMIN_PASSWORD`) y el **`SESSION_SECRET`** que tenías en Vercel
      (Settings → Environment Variables). Si no lo tenés, no es grave: se genera uno nuevo y hay que volver a
      entrar al panel.
- [ ] El repositorio de GitHub ya tiene estos archivos nuevos (rama `main`).
- [ ] Tenés una copia de tu contenido: la bajaste desde Neon y/o tenés un respaldo del repositorio de GitHub.

> **Consejo:** no borres nada de Vercel todavía. Cuando todo funcione en el VPS, recién ahí movés el dominio.
> Si algo sale mal, volvés atrás cambiando el DNS.

---

## Paso 1 · Entrar a Coolify

1. Abrí en el navegador: **`http://LA-IP-DEL-VPS:8000`**.
2. La primera vez te pide crear el usuario administrador (email y contraseña). **Anotá esa contraseña.**
3. Listo: ya estás en el panel. Todo lo que sigue se hace ahí.

---

## Paso 2 · Crear el proyecto

- Menú **Projects → + Add** → nombre: `Jomerarte` → **Create**.

## Paso 3 · Crear la base de datos

1. Dentro del proyecto: **+ New → Database → PostgreSQL**.
2. Elegí **PostgreSQL 17** (es la versión de Neon; así el respaldo entra sin problemas).
3. En la configuración ponele:
   - **Name:** `jomerarte-db`
   - **PostgreSQL User:** `jomer`
   - **PostgreSQL Password:** una larga (generala con el botón de dados)
   - **PostgreSQL DB:** `jomerarte`
4. Tocá **Deploy** y esperá a que diga *Running*.
5. Entrá al recurso y copiá la **PostgreSQL URL (Internal)**:
   `postgresql://jomer:CLAVE@jomerarte-db:5432/jomerarte`
   Esa dirección es interna de Docker: no se puede abrir desde afuera, y por eso es segura.

## Paso 4 · Crear la aplicación

1. **+ New → Application → Public Repository**.
2. Pegá la dirección del repositorio: `https://github.com/jomer-fugui/Jomerarte`
3. **Branch:** `main`
4. **Build Pack:** `Dockerfile`  ← importante, no dejes *Nixpacks*.
5. En **General / Network**:
   - **Ports Exposes:** `3000`
   - **Domains:** dejalos vacíos por ahora (los cargamos en el paso 6).
6. **Save**. Todavía no despliegues: primero van las variables (paso 5).

## Paso 5 · Variables de entorno

En la aplicación → **Environment Variables**. Cargá una por una (botón *+ Add*):

| Variable | ¿Obligatoria? | Valor |
|---|---|---|
| `DATABASE_URL` | **Sí** | La *PostgreSQL URL (Internal)* del paso 3 |
| `SESSION_SECRET` | **Sí** | Texto largo y al azar (ver abajo cómo generarlo) |
| `ADMIN_PASSWORD` | **Sí** | La contraseña con la que entrás al panel |
| `NEXT_PUBLIC_SITE_URL` | **Sí** | `https://jomerarte.com` |
| `CRON_SECRET` | Recomendada | Otro texto al azar: protege la actualización de precios |
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | Si usás precios de Mercado Libre | Los mismos que tenías en Vercel |
| `NEXT_TELEMETRY_DISABLED` | Recomendada | `1` |

**No cargues `BLOB_READ_WRITE_TOKEN`**: es exclusivo de Vercel. Sin esa variable, las fotos y archivos que subas se
guardan dentro de la base (hasta 50 MB por archivo), y eso funciona igual en el VPS.

Para generar un secreto, en Coolify hay un botón de “dados” al lado de cada variable. Si preferís a mano, cualquier
texto de 40 caracteres mezclando letras y números sirve.

## Paso 6 · Dominios y certificado

1. En la app → **Configuration → Domains**, agregá (separados por coma):

   ```
   https://jomerarte.com,https://www.jomerarte.com,https://juegos.jomerarte.com,https://frases.jomerarte.com,https://cielinfier.jomerarte.com
   ```

   > Cada subdominio tiene que estar acá porque el sitio decide qué mostrar según el dominio.

2. **En el DNS** (en Hostinger o en Cloudflare, donde tengas el dominio):

   | Tipo | Nombre | Valor |
   |---|---|---|
   | A | `@` | IP del VPS |
   | A | `www` | IP del VPS |
   | A | `juegos` | IP del VPS |
   | A | `frases` | IP del VPS |
   | A | `cielinfier` | IP del VPS |
   | A | `*` | IP del VPS (opcional: cubre cualquier subdominio futuro) |

3. Volvé a Coolify y tocá **Deploy**. Traefik pide solo los certificados (Let's Encrypt) y en un par de minutos
   `https://jomerarte.com` abre sin advertencias.
4. Si usás Cloudflare con la nube naranja, mirá la sección **Cloudflare** más abajo (SSL en *Full (strict)*).

## Paso 7 · Primer arranque

1. Coolify → app → **Deployments**: esperá a que termine el build (la primera vez tarda unos 4–6 minutos).
2. Comprobá:
   - `https://jomerarte.com/api/health` → tiene que devolver `{"ok":true}`
   - Abrí el sitio: se ve igual que en Vercel (por ahora con el contenido de ejemplo o vacío).
   - `https://jomerarte.com/admin` → entrá con `ADMIN_PASSWORD`.
3. Si `/api/health` da error 500, es que `DATABASE_URL` está mal o la base no está corriendo.

## Paso 8 · Traer tu contenido desde Neon

Hay dos caminos. **Usá el A** salvo que no puedas.

### A) Con `pg_dump` (recomendado, 2 minutos)

Se corre dentro del contenedor de la base, que ya trae las herramientas. En Coolify:

1. Abrí el recurso de PostgreSQL → pestaña **Terminal** (o *Execute Command*).
2. Pegá esto, cambiando la URL de Neon por la tuya:

   ```bash
   pg_dump "postgresql://USUARIO:CLAVE@ep-xxxx.neon.tech/neondb?sslmode=require" \
     --schema=public --format=plain --no-owner --no-privileges --no-comments --clean --if-exists \
     -f /tmp/datos.sql
   ```

3. Y después restaurá en la base local:

   ```bash
   psql -U jomer -d jomerarte -v ON_ERROR_STOP=1 -f /tmp/datos.sql
   ```

4. Comprobá los números:

   ```bash
   psql -U jomer -d jomerarte -c "select 'items', count(*) from items union all select 'pages', count(*) from pages union all select 'settings', count(*) from settings;"
   ```

Si preferís hacerlo desde tu computadora, el script del repositorio hace todo junto:

```bash
./scripts/migrar-desde-neon.sh "postgresql://…neon.tech/neondb?sslmode=require" "postgresql://jomer:CLAVE@IP:5432/jomerarte"
```

(para eso la base tiene que estar publicada en un puerto; en Coolify se hace en *PostgreSQL → Public Port*).

### B) Con los archivos que ya bajaste de Neon

Si tenés los `.sql` de cada tabla (`items`, `pages`, `settings`, `sites`, `media`, `feedback`):

1. Subí esos archivos al VPS (Coolify tiene un editor de archivos, o por `scp`).
2. En la terminal de la base:

   ```bash
   for t in sites items pages settings media feedback; do
     psql -U jomer -d jomerarte -v ON_ERROR_STOP=1 -f /tmp/$t.sql
   done
   ```

3. **Arreglá los contadores** (si no, al crear contenido nuevo da error de “id repetido”):

   ```bash
   psql -U jomer -d jomerarte -c "select setval(pg_get_serial_sequence('items','id'), coalesce((select max(id) from items), 1));
   select setval(pg_get_serial_sequence('pages','id'), coalesce((select max(id) from pages), 1));
   select setval(pg_get_serial_sequence('feedback','id'), coalesce((select max(id) from feedback), 1));
   select setval(pg_get_serial_sequence('media','id'), coalesce((select max(id) from media), 1));"
   ```

> `pages` y `sites` usan texto como clave, no número: si esos dos `setval` dan error, ignorá ese mensaje.

**Ojo con la tabla `media`:** si tus fotos estaban en **Vercel Blob** (las direcciones terminan en
`blob.vercel-storage.com`), no vienen en el respaldo. Ver *Fotos y archivos* más abajo.

## Paso 9 · Precios de Mercado Libre (lo que hacía Vercel)

En Vercel el `vercel.json` disparaba la actualización a las 9:00. En el VPS eso no existe: se reemplaza con una
tarea programada de Coolify.

1. App → **Scheduled Tasks → + Add**.
2. Nombre: `precios-mercadolibre` · Frecuencia: `0 9 * * *` · Comando:

   ```bash
   curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" http://127.0.0.1:3000/api/cron/mercadolibre
   ```

3. Guardá. Podés probarla con **Execute now**: devuelve un JSON con cuántos precios actualizó.

El `vercel.json` queda en el repositorio sin molestar (en el VPS no se usa).

## Paso 10 · Copias de seguridad

Dos capas, porque la base es lo único que no se puede rehacer:

1. **Coolify**: recurso PostgreSQL → **Backups → + Add** → frecuencia diaria, retención 14 días. Si querés, con
   destino en un servicio de almacenamiento (S3, R2 de Cloudflare). Con dejarlo en el servidor ya estás cubierto
   ante un error humano; para cubrirte de que se rompa el VPS, mejor activar el destino externo.
2. **Script del repositorio** (opcional): en el recurso de la base → *Scheduled Tasks*:

   ```bash
   bash /ruta/backup-base.sh
   ```

**Cómo restaurar** (anotalo, es el día que más lo vas a necesitar):

```bash
psql -U jomer -d jomerarte -c "drop schema public cascade; create schema public;"
pg_restore -U jomer -d jomerarte --no-owner /app/backups/jomerarte-AAAAMMDD-HHMM.dump
```

## Paso 11 · Fotos y archivos

- Si las imágenes están **guardadas en la base** (direcciones como `/api/media/123` o rutas internas), ya vinieron
  con el respaldo y no hay que hacer nada.
- Si en *Panel → Archivos subidos* ves direcciones que terminan en **`blob.vercel-storage.com`**, esas hay que
  bajarlas de Vercel y **volver a subirlas** desde el panel del sitio nuevo. Después, editá los elementos que las
  usaban y elegí la imagen nueva (la vieja dirección va a dejar de funcionar).
- De ahora en más los archivos se guardan en la base: hasta 50 MB por archivo.

---

## Cloudflare: ¿hace falta?

**No es obligatorio, pero te conviene.** Coolify ya te da el certificado y el sitio funciona sin Cloudflare.
Lo que agrega el plan gratis:

| Beneficio | Por qué te importa |
|---|---|
| **Freno de bots** (*Bot Fight Mode*) | Es justo el problema que te comió la CPU: robots y escáneres |
| **DNS rápido y estable** | Si algún día cambiás de servidor, cambiás una IP y listo |
| **Caché de imágenes y archivos** | El servidor trabaja menos y el sitio carga más rápido |
| **Ocultar la IP del VPS** | Menos ataques dirigidos a tu servidor |
| **SSL gratis** | Ya lo tenés con Coolify; Cloudflare lo complementa |

**Cómo ponerlo (15 minutos):**

1. Creá la cuenta gratis en `cloudflare.com` → **Add a site** → `jomerarte.com` → plan **Free**.
2. Cloudflare te muestra dos servidores de nombres (nameservers): cambialos en el panel donde compraste el dominio
   (Hostinger → Dominios → Servidores DNS). Puede tardar unas horas.
3. En Cloudflare → **DNS**: cargá los mismos registros A del Paso 6 (con la **nube naranja** activada).
4. En **SSL/TLS → Overview**: elegí **Full (strict)**. (Si lo dejás en *Flexible*, el sitio entra en un bucle de
   redirecciones.)
5. En **Seguridad → Bots**: activá **Bot Fight Mode**.
6. En **Reglas → Cache Rules**: no hace falta tocar nada: el HTML se cachea solo en el servidor (Next ya lo hace) y
   Cloudflare por defecto no cachea HTML, que es lo correcto para un panel con login.

> Mientras Cloudflare emite el certificado del sitio puede pasar por un rato de error. Si te pasa, y para no
> pelearte: en **SSL/TLS → Edge Certificates** dejá *Always Use HTTPS* activado y esperá unos minutos.

---

## Sobre lo que viste en el Firewall de Vercel

Es normal, y confirma el diagnóstico: en el gráfico de “corta fuegos” se ven **picos de tráfico denegado** y una
lista de IP con cientos de pedidos (616, 268, 249…). Casi todas son de datacenters (Hetzner, DigitalOcean, etc.):
son robots que escanean el sitio buscando paneles de WordPress, archivos `.env` y cosas así. Vercel los frenaba
*solo algunos* y el resto llegaba a tu app, que renderizaba una página entera y consultaba la base para responder
un 404. Por eso se consumieron las 4 horas de CPU.

Con dos cosas eso no vuelve a pasar:

1. El cambio que hice en `src/proxy.ts`: cualquier archivo o carpeta de escaneo se responde con un 404 liviano
   **antes** de tocar la base de datos.
2. Cloudflare con *Bot Fight Mode* adelante.

---

## Probar todo en tu computadora antes (opcional)

Si tenés Docker instalado:

```bash
docker compose up --build
# abrí http://localhost:3000
```

Levanta el sitio y una base Postgres vacía, igual que en el VPS. Para entrar al panel usá la contraseña de
`ADMIN_PASSWORD` (por defecto `clave-de-prueba` en ese archivo).

## Checklist final

- [ ] `/api/health` responde `{"ok":true}`
- [ ] La portada abre por `https://` sin advertencias
- [ ] Los subdominios (`juegos.`, `frases.`, `cielinfier.`) abren bien
- [ ] El panel `/admin` abre y puedo guardar un cambio
- [ ] Se ven los textos, las frases, los juegos y los trucos que tenía
- [ ] Las fotos se ven (si alguna era de Vercel Blob, se volvió a subir)
- [ ] La tarea de precios de Mercado Libre devuelve OK
- [ ] La copia de seguridad de la base está programada
- [ ] Cambié el DNS del dominio (o lo haré cuando esté todo conforme)

## Si algo sale mal

| Síntoma | Causa habitual | Solución |
|---|---|---|
| El deploy falla en “npm ci” | Falta `package-lock.json` en la rama | Subir el archivo o cambiar a `npm install` |
| `/api/health` da 500 | `DATABASE_URL` mal o base apagada | Copiar de nuevo la URL interna |
| El panel dice contraseña incorrecta | `ADMIN_PASSWORD` distinto al que usabas | Cambiarla y volver a desplegar |
| Página en bucle de redirecciones | Cloudflare en *Flexible* | Poner *Full (strict)* |
| “id repetido” al crear contenido | Faltó el `setval` | Correr el bloque del Paso 8-B |
| Las imágenes están rotas | Estaban en Vercel Blob | Volver a subirlas desde el panel |
| El sitio abre con otro subdominio | Falta ese dominio en *Domains* | Agregarlo y redesplegar |
