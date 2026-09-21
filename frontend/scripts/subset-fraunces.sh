#!/usr/bin/env bash
# Regenera el subconjunto WOFF2 de Fraunces recortado al español y pesos 500-700 usando fonttools via uvx.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SRC_FONT="${ROOT_DIR}/frontend/node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2"
DEST_DIR="${ROOT_DIR}/frontend/src/assets/fonts"
DEST_FONT="${DEST_DIR}/fraunces-latin-wght-normal.woff2"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "${DEST_DIR}"

INST_TTF="${TMP_DIR}/fraunces-inst.ttf"

# Recorta el eje wght al rango 500:700
uvx --from "fonttools[woff]" --with brotli fonttools varLib.instancer "${SRC_FONT}" "wght=500:700" -o "${INST_TTF}" -q

# Recorta los caracteres a latín básico + español y signos tipográficos de interfaz
UNICODES="U+0020-007E,U+00A0,U+00A1,U+00AA,U+00AB,U+00B0,U+00B7,U+00BA,U+00BB,U+00BF,U+00C1,U+00C9,U+00CD,U+00D1,U+00D3,U+00D7,U+00DA,U+00DC,U+00E1,U+00E9,U+00ED,U+00F1,U+00F3,U+00FA,U+00FC,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2039,U+203A,U+20AC"

uvx --from "fonttools[woff]" --with brotli pyftsubset "${INST_TTF}" \
  --unicodes="${UNICODES}" \
  --flavor=woff2 \
  --output-file="${DEST_FONT}" \
  --layout-features=*

echo "Generado: ${DEST_FONT} ($(stat -c%s "${DEST_FONT}") bytes)"
