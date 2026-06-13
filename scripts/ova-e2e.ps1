# ova-e2e.ps1 — Harness E2E de OVAs sobre Docker.
#
# Levanta el backend en Docker (Supabase prod), captura sus logs en vivo, y corre
# el driver HTTP (scripts.ova_e2e) que ejercita: login -> RAG/upload -> seleccion
# de modelos -> generacion -> descarga SCORM -> verificacion. Deja una carpeta
# navegable en backend/test-output/<timestamp>/.
#
# Uso:
#   ./scripts/ova-e2e.ps1 -Prompt "Regresion lineal simple"
#   ./scripts/ova-e2e.ps1 -Prompt "..." -Profiles default,openrouter -TimeoutMin 8 -KeepUp

param(
    [Parameter(Mandatory = $true)][string]$Prompt,
    [string]$Profiles = "default,openrouter",
    [double]$TimeoutMin = 8,
    [string]$Resources = "",
    [string]$UploadFile = "",
    [switch]$NoRag,
    [switch]$KeepUp
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# test-output fuera de backend/ (montado con --reload): escribir dentro dispara
# reloads de uvicorn que matan el thread de generacion.
$ts = Get-Date -Format "yyyy-MM-dd_HHmmss"
$out = Join-Path $root "test-output/$ts"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = Join-Path $out "backend.log"

Write-Host "[docker] build + up backend..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build backend

# Espera /health (<=90s)
$ready = $false
for ($i = 0; $i -lt 18; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 4
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 5 }
}
if (-not $ready) {
    Write-Host "[docker] backend NO respondio /health en 90s" -ForegroundColor Red
    docker compose logs --tail 50 backend
    exit 1
}
Write-Host "[docker] backend healthy on :8000" -ForegroundColor Green

# Captura de logs en vivo -> archivo (en background).
$logJob = Start-Job -ScriptBlock {
    param($dir, $file)
    Set-Location $dir
    docker compose logs -f --since 1s backend *>&1 | Out-File -FilePath $file -Encoding utf8
} -ArgumentList $root, $log

try {
    $driverArgs = @(
        "run", "python", "-m", "scripts.ova_e2e",
        "--prompt", $Prompt,
        "--profiles", $Profiles,
        "--timeout-min", $TimeoutMin,
        "--out-dir", $out,
        "--base-url", "http://localhost:8000"
    )
    if ($Resources) { $driverArgs += @("--resources", $Resources) }
    if ($UploadFile) { $driverArgs += @("--upload-file", $UploadFile) }
    if ($NoRag) { $driverArgs += "--no-rag" }

    Push-Location (Join-Path $root "backend")
    & uv @driverArgs
    $code = $LASTEXITCODE
    Pop-Location
} finally {
    Stop-Job $logJob -ErrorAction SilentlyContinue | Out-Null
    Receive-Job $logJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $logJob -Force -ErrorAction SilentlyContinue | Out-Null
    if (-not $KeepUp) {
        Write-Host "[docker] stop backend" -ForegroundColor Cyan
        docker compose stop backend | Out-Null
    }
}

Write-Host "`nsalida -> $out" -ForegroundColor Green
Write-Host "  abre  $out/report.md  y  $out/<perfil>/scorm/index.html"
exit $code
