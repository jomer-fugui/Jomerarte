#!/usr/bin/env bash
#
# Copia de seguridad de la base. Pensado para programarlo en Coolify:
#   Recurso de PostgreSQL → Scheduled Tasks → 0 4 * * *  →  bash /ruta/backup-base.sh
# Deja un archivo comprimido por día y borra los que tengan más de N días.
#
# Variables (opcionales):
#   BACKUP_DIR   carpeta donde guardar (por defecto /app/backups)
#   BACKUP_DAYS  días a conservar  (por defecto 14)
#   DATABASE_URL  si existe se usa; si no, se usan POSTGRES_USER / POSTGRES_DB del contenedor.

set -euo pipefail

DIR="${BACKUP_DIR:-/app/backups}"
DIAS="${BACKUP_DAYS:-14}"
mkdir -p "$DIR"

ARCHIVO="$DIR/jomerarte-$(date +%Y%m%d-%H%M).dump"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$ARCHIVO"
else
  pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
    --format=custom --no-owner --no-privileges --file="$ARCHIVO"
fi

find "$DIR" -name 'jomerarte-*.dump' -mtime +"$DIAS" -delete

echo "Copia guardada: $ARCHIVO"
echo "Guardadas en $DIR: $(find "$DIR" -name 'jomerarte-*.dump' | wc -l)"
