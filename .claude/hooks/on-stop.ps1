# on-stop.ps1 — Hook Stop
# Ejecuta verify.ps1 completo antes de cerrar la sesion.
# Si hay cambios en git, informa al usuario para que proponga el commit.

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [harness] Verificacion de cierre de sesion" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ejecutar verify.ps1
& "$root\verify.ps1"
$verifyExit = $LASTEXITCODE

Write-Host ""

if ($verifyExit -ne 0) {
    Write-Host "[harness] verify.ps1 FALLO — revisa los errores antes de cerrar." -ForegroundColor Red
    Write-Host "          No se propone commit hasta que el repo este en verde." -ForegroundColor Yellow
} else {
    # Verificar si hay cambios en git
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        Write-Host "[harness] Hay cambios no commiteados en el repo." -ForegroundColor Yellow
        Write-Host "          El agente leader propondra un mensaje de commit." -ForegroundColor Yellow
        Write-Host "          Aprueba o rechaza explicitamente antes de ejecutar git commit." -ForegroundColor Yellow
    } else {
        Write-Host "[harness] Repo limpio. Sin cambios pendientes." -ForegroundColor Green
    }
}

Write-Host ""
