#!/usr/bin/env bash
#
# Trae TODO el contenido de la base de Neon (Vercel) a la base nueva del VPS.
#
#   ./scripts/migrar-desde-neon.sh "postgresql://...neon.tech/neondb?sslmode=require" \
#                                  "postgresql://postgres:clave@localhost:5432/jomerarte"
#
# Se puede correr en cualquier máquina o contenedor que tenga `pg_dump` y `psql`
# (el contenedor de PostgreSQL de Coolify ya los trae). Hace tres cosas:
#   1. Baja una copia completa de Neon (estructura + datos del esquema "public", sin dueños ni permisos).
#   2. La vuelve a subir a la base nueva, limpiando lo que hubiera antes.
#   3. Comprueba cuántas filas quedaron de cada tabla.
#
# El archivo queda en /tmp por si hay que repetirlo.

set -euo pipefail

ORIGEN="${1:-}"
DESTINO="${2:-}"
ARCHIVO="${3:-/tmp/jomerarte-datos.sql}"

if [[ -z "$ORIGEN" || -z "$DESTINO" ]]; then
  echo "Uso: $0 \"URL_DE_NEON\" \"URL_DE_LA_BASE_NUEVA\" [archivo]" >&2
  exit 1
fi

echo "→ 1/3  Bajando la copia de Neon…"
# Solo el esquema "public": es el que usa el sitio. El esquema "neon_auth" es de Neon y no hace falta.
pg_dump "$ORIGEN" \
  --schema=public \
  --format=plain \
  --no-owner \
  --no-privileges \
  --no-comments \
  --clean \
  --if-exists \
  --file="$ARCHIVO"
echo "   Guardada en $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

echo "→ 2/3  Restaurando en la base nueva…"
psql "$DESTINO" -v ON_ERROR_STOP=1 --quiet --file="$ARCHIVO"

echo "→ 3/3  Comprobando…"
psql "$DESTINO" --quiet --tuples-only --command="
  SELECT 'items', count(*) FROM items
  UNION ALL SELECT 'pages', count(*) FROM pages
  UNION ALL SELECT 'settings', count(*) FROM settings
  UNION ALL SELECT 'sites', count(*) FROM sites
  UNION ALL SELECT 'media', count(*) FROM media;
"

echo
echo "Listo. Entrá al sitio y comprobá: /api/health devuelve ok, el panel abre y se ven tus páginas."
echo "Si el panel no toma la contraseña vieja, borrá la variable ADMIN_PASSWORD o cambiala."
