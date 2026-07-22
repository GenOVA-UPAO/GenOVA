# Backend en modo carga con el pool de base de datos ampliado.
#
# Sirve para medir el efecto del cuello de botella detectado a 100 concurrentes:
# con la configuración por defecto (DB_POOL_SIZE=10, DB_MAX_OVERFLOW=10) las
# peticiones se encolan hasta agotar el timeout de 30 s del pool y el backend
# devuelve 500. Este arranque sube el pool para comparar el mismo escenario.
#
# Uso:  ./scripts/serve-load-pool.ps1 [-Pool 40] [-Overflow 40]

param(
    [int]$Pool = 40,
    [int]$Overflow = 40
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

$env:RATE_LIMIT_ENABLED = '0'
$env:LLM_FAKE = '1'
$env:DB_POOL_SIZE = "$Pool"
$env:DB_MAX_OVERFLOW = "$Overflow"

Write-Host "[carga] backend con pool $Pool + overflow $Overflow" -ForegroundColor Cyan
& "$raiz/backend/.venv/Scripts/uvicorn.exe" main:app --port 8000 --app-dir "$raiz/backend"
