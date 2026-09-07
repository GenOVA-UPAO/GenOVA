# Arranca el backend en modo prueba de carga.
#
# Dos diferencias con el arranque normal, ambas necesarias para que la medición
# signifique algo:
#   RATE_LIMIT_ENABLED=0 — SlowAPI corta a 10 req/min en /login y similares; con
#                          el límite activo la corrida mide 429, no capacidad.
#   LLM_FAKE=1           — el encolado de generación se mide igual (auth, validación,
#                          inserción y cola), pero el worker no llama al proveedor:
#                          100 concurrentes contra el LLM real gastarían créditos
#                          y medirían la latencia del proveedor, no la de GenOVA.
#
# Uso:  ./scripts/serve-load.ps1

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

$env:RATE_LIMIT_ENABLED = '0'
$env:LLM_FAKE = '1'

Write-Host '[carga] backend con RATE_LIMIT_ENABLED=0 y LLM_FAKE=1' -ForegroundColor Cyan
& "$raiz/backend/.venv/Scripts/uvicorn.exe" main:app --port 8000 --app-dir "$raiz/backend"
