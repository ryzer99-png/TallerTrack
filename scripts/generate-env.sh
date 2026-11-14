#!/usr/bin/env bash
set -euo pipefail

# Cargar .env local si existe (útil en desarrollo local)
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
TELERADIO_WHATSAPP="${TELERADIO_WHATSAPP:-}"
TELERADIO_DIRECCION="${TELERADIO_DIRECCION:-Taller de Electrónica Teleradio}"
DEFAULT_COUNTRY_CODE="${DEFAULT_COUNTRY_CODE:-57}"

cat > env.js <<EOF
// Generado automáticamente por scripts/generate-env.sh
window.__TELERADIO_ENV__ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
  TELERADIO_WHATSAPP: "${TELERADIO_WHATSAPP}",
  TELERADIO_DIRECCION: "${TELERADIO_DIRECCION}",
  DEFAULT_COUNTRY_CODE: "${DEFAULT_COUNTRY_CODE}"
};
EOF

echo "env.js generado correctamente."

