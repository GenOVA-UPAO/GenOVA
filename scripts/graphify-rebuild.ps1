# graphify-rebuild.ps1
# Extraccion semantica completa (docs + codigo).
# Cache interno (graphify-out/cache/) — archivos sin cambios se saltean automaticamente.
#
# Uso:
#   scripts/graphify-rebuild.ps1              # extract + label
#   scripts/graphify-rebuild.ps1 -LabelOnly   # solo renombrar comunidades (sin re-extract)

param(
    [switch]$LabelOnly
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Intentar GEMINI_API_KEY primero (mejor soporte JSON estructurado, nativo en graphify)
$geminiLine = Get-Content "backend\.env" -ErrorAction SilentlyContinue |
              Select-String "^GEMINI_API_KEY\s*="
if ($geminiLine) {
    $env:GEMINI_API_KEY = $geminiLine.ToString().Split("=", 2)[1].Trim().Trim('"').Trim("'")
    $backend = "gemini"
    Write-Host "graphify: usando backend gemini" -ForegroundColor Cyan
} else {
    # Fallback: OpenRouter via openai-compat
    $orLine = Get-Content "backend\.env" -ErrorAction SilentlyContinue |
              Select-String "^OPENROUTER_API_KEY\s*="
    if (-not $orLine) {
        Write-Host "ERROR: GEMINI_API_KEY ni OPENROUTER_API_KEY encontrados en backend\.env" -ForegroundColor Red
        exit 1
    }
    $env:OPENAI_API_KEY  = $orLine.ToString().Split("=", 2)[1].Trim().Trim('"').Trim("'")
    $env:OPENAI_BASE_URL = "https://openrouter.ai/api/v1"
    $env:OPENAI_MODEL    = "mistralai/mistral-small-3.2-24b-instruct"
    $backend = "openai"
    Write-Host "graphify: usando backend openrouter (mistral-small, mejor JSON que deepseek)" -ForegroundColor Cyan
}

if (-not $LabelOnly) {
    Write-Host ""
    Write-Host "graphify: Extraccion semantica (archivos sin cambios usan cache)..." -ForegroundColor Cyan
    graphify extract . --backend $backend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: graphify extract fallo (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "graphify: Nombrando comunidades..." -ForegroundColor Cyan
graphify label . --backend $backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: label fallo, comunidades quedan como Community N" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "graphify: Listo. Para actualizaciones de codigo usa graphify update . (gratis)." -ForegroundColor Green
