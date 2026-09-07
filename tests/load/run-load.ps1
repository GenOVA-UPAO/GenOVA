# Prueba de carga completa de GenOVA: 10, 50 y 100 usuarios concurrentes contra
# los 120 endpoints de la API, con un informe HTML+CSV por nivel.
#
# Requisitos previos:
#   1. Backend arriba en modo carga:  ./scripts/serve-load.ps1
#      (RATE_LIMIT_ENABLED=0 y LLM_FAKE=1; ver el encabezado de ese script)
#   2. Dependencias:  pip install -r tests/load/requirements.txt
#
# Uso:
#   ./tests/load/run-load.ps1                    # 10, 50 y 100 concurrentes, 2 min cada uno
#   ./tests/load/run-load.ps1 -Duracion 5m       # corridas más largas
#   ./tests/load/run-load.ps1 -Niveles 10        # sólo un nivel
#   ./tests/load/run-load.ps1 -SinLimpieza       # conserva los datos creados
#
# Los endpoints costosos (generación, regeneración, agentes 5E y subida con
# indexado RAG) sólo se ejercitan en la corrida de 10 concurrentes: en 50 y 100
# saturarían la cola del worker y medirían al proveedor, no a GenOVA.

param(
    [int[]]$Niveles = @(10, 50, 100),
    [string]$Duracion = '2m',
    [string]$ApiHost = 'http://localhost:8000',
    [switch]$SinLimpieza
)

$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
$python = Join-Path (Split-Path -Parent (Split-Path -Parent $aqui)) 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path $python)) { $python = 'python' }

try {
    $salud = Invoke-WebRequest -Uri "$ApiHost/health" -TimeoutSec 5 -UseBasicParsing
    if ($salud.StatusCode -ne 200) { throw }
}
catch {
    Write-Host "[carga] el backend no responde en $ApiHost. Arráncalo con ./scripts/serve-load.ps1" -ForegroundColor Red
    exit 1
}

$resumen = @()
foreach ($usuarios in $Niveles) {
    $rampa = [math]::Max(1, [math]::Round($usuarios / 5))
    $prefijo = Join-Path $aqui "report_$usuarios"
    # Sólo el nivel más bajo ejercita los endpoints que gastan cuota del proveedor.
    $env:LOAD_COSTOSOS = if ($usuarios -eq ($Niveles | Measure-Object -Minimum).Minimum) { '1' } else { '0' }

    Write-Host ""
    Write-Host "=== $usuarios concurrentes ($Duracion, rampa $rampa/s, costosos=$($env:LOAD_COSTOSOS)) ===" -ForegroundColor Cyan
    & $python -m locust -f (Join-Path $aqui 'locustfile.py') --headless `
        -u $usuarios -r $rampa -t $Duracion --host $ApiHost `
        --csv $prefijo --html "$prefijo.html"

    Write-Host "--- umbrales RN-001 ($usuarios concurrentes) ---" -ForegroundColor Cyan
    & $python (Join-Path $aqui 'check_thresholds.py') "${prefijo}_stats.csv"
    $resumen += [pscustomobject]@{ Concurrencia = $usuarios; Umbrales = if ($LASTEXITCODE -eq 0) { 'PASA' } else { 'FALLA' }; Informe = "$prefijo.html" }
}

if (-not $SinLimpieza) {
    Write-Host ""
    Write-Host '=== limpieza de los datos creados por la carga ===' -ForegroundColor Cyan
    & $python (Join-Path $aqui 'cleanup_load_data.py')
}

Write-Host ""
Write-Host '=== RESUMEN ===' -ForegroundColor Cyan
$resumen | Format-Table -AutoSize
