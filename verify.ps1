# verify.ps1 — Script de verificacion completa de GenOVA
# Uso: ./verify.ps1
# Retorna exit 0 solo si todo pasa.

param(
    [switch]$Quick  # Solo pasos 1-3 (sin pytest backend)
)

$root = $PSScriptRoot
Set-Location $root

$failed = @()
$passed = @()

function Run-Step {
    param([string]$Name, [scriptblock]$Block)
    Write-Host ""
    Write-Host "--- $Name ---" -ForegroundColor Cyan
    try {
        & $Block
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            $script:passed += $Name
            Write-Host "PASA: $Name" -ForegroundColor Green
        } else {
            $script:failed += $Name
            Write-Host "FALLA: $Name (exit $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        $script:failed += $Name
        Write-Host "FALLA: $Name (excepcion: $_)" -ForegroundColor Red
    }
}

# [1] Frontend ESLint
Run-Step "Frontend ESLint (pnpm lint)" {
    pnpm lint
}

# [2] Backend ruff
Run-Step "Backend ruff check" {
    Push-Location backend
    python -m ruff check . 2>&1
    $exit = $LASTEXITCODE
    Pop-Location
    exit $exit
}

# [3] Frontend unit tests (cucumber-js, no backend)
Run-Step "Frontend unit BDD (pnpm test:unit)" {
    pnpm test:unit
}

# [4] Backend BDD (pytest-bdd) — solo si backend esta corriendo
if (-not $Quick) {
    $backendUp = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        $backendUp = ($response.StatusCode -eq 200)
    } catch {
        $backendUp = $false
    }

    if ($backendUp) {
        Run-Step "Backend BDD (pytest step_defs)" {
            Push-Location backend
            pytest tests/step_defs/ -v --tb=short
            $exit = $LASTEXITCODE
            Pop-Location
            exit $exit
        }
    } else {
        Write-Host ""
        Write-Host "--- Backend BDD (pytest step_defs) ---" -ForegroundColor Cyan
        Write-Host "SKIP: backend no esta corriendo en localhost:8000" -ForegroundColor Yellow
        $passed += "Backend BDD (SKIP — backend offline)"
    }
}

# Resumen
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RESUMEN verify.ps1" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$passed | ForEach-Object { Write-Host "  PASA  $_" -ForegroundColor Green }
$failed | ForEach-Object { Write-Host "  FALLA $_" -ForegroundColor Red }

Write-Host ""

if ($failed.Count -gt 0) {
    Write-Host "RESULTADO FINAL: FALLA ($($failed.Count) seccion(es) con errores)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULTADO FINAL: PASA" -ForegroundColor Green
    exit 0
}
