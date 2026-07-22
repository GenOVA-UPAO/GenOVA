# Misma prueba de carga que run-load.ps1, ejecutada con Apache JMeter, para
# contrastar herramientas sobre el mismo escenario (mismos endpoints, mismos
# pesos, mismo think time y el mismo reparto 80/20 entre usuario y administrador).
#
# Requisitos:
#   1. Backend arriba en modo carga:  ./scripts/serve-load.ps1
#   2. JMeter 5.6.3+ y Java 8+. Ruta por defecto: %USERPROFILE%\tools\apache-jmeter-5.6.3
#
# Uso:
#   ./tests/load/run-load-jmeter.ps1
#   ./tests/load/run-load-jmeter.ps1 -Niveles 10,50 -Duracion 120
#   ./tests/load/run-load-jmeter.ps1 -JMeterHome "D:\apache-jmeter-5.6.3"

param(
    [int[]]$Niveles = @(10, 50, 100),
    [int]$Duracion = 120,
    [string]$ApiHost = 'localhost',
    [int]$Puerto = 8000,
    [string]$JMeterHome = "$env:USERPROFILE\tools\apache-jmeter-5.6.3",
    [switch]$SinLimpieza
)

$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
$jmeter = Join-Path $JMeterHome 'bin/jmeter.bat'
if (-not (Test-Path $jmeter)) {
    Write-Host "[carga] no encuentro JMeter en $jmeter. Pasa -JMeterHome con la ruta real." -ForegroundColor Red
    exit 1
}
$python = Join-Path (Split-Path -Parent (Split-Path -Parent $aqui)) 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path $python)) { $python = 'python' }

try {
    if ((Invoke-WebRequest -Uri "http://${ApiHost}:$Puerto/health" -TimeoutSec 5 -UseBasicParsing).StatusCode -ne 200) { throw }
}
catch {
    Write-Host "[carga] el backend no responde en http://${ApiHost}:$Puerto. Arráncalo con ./scripts/serve-load.ps1" -ForegroundColor Red
    exit 1
}

foreach ($total in $Niveles) {
    # Mismo reparto que Locust: 4 de cada 5 usuarios normales, 1 administrador.
    $admins = [math]::Max(1, [math]::Round($total / 5))
    $usuarios = $total - $admins
    $rampa = [math]::Max(1, [math]::Round($total / 5))
    $jtl = Join-Path $aqui "jmeter_$total.jtl"
    $informe = Join-Path $aqui "jmeter-report-$total"
    Remove-Item $jtl -ErrorAction SilentlyContinue
    Remove-Item $informe -Recurse -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "=== JMeter · $total concurrentes ($usuarios usuarios + $admins admin, ${Duracion}s) ===" -ForegroundColor Cyan
    # Los argumentos van en un array: con continuación de línea PowerShell le
    # entregaba a JMeter los -J vacíos y la corrida terminaba con 0 muestras.
    $argumentos = @(
        '-n', '-t', (Join-Path $aqui 'genova-loadtest.jmx'), '-l', $jtl, '-e', '-o', $informe,
        "-Jhost=$ApiHost", "-Jport=$Puerto", "-Jusers=$usuarios", "-JadminUsers=$admins",
        "-Jrampup=$rampa", "-Jduration=$Duracion"
    )
    Write-Host "jmeter $($argumentos -join ' ')" -ForegroundColor DarkGray
    & $jmeter @argumentos
}

if (-not $SinLimpieza) {
    Write-Host ""
    Write-Host '=== limpieza de los datos creados por la carga ===' -ForegroundColor Cyan
    & $python (Join-Path $aqui 'cleanup_load_data.py')
}

Write-Host ""
Write-Host 'Informes HTML: tests/load/jmeter-report-<nivel>/index.html' -ForegroundColor Cyan
