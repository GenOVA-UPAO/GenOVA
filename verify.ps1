# verify.ps1 — Script de verificacion completa de GenOVA
# Uso: ./verify.ps1
# Retorna exit 0 solo si todo pasa.

param(
    [switch]$Quick,  # Solo pasos 1-3 (sin pytest backend)
    [switch]$E2E     # Incluye playwright E2E (requiere :5173 y :8000 activos)
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

# [2] Backend ruff (try python -m ruff; fall back to uv run ruff if missing).
Run-Step "Backend ruff check" {
    Push-Location backend
    python -m ruff check . 2>&1 | Out-Host
    $exit = $LASTEXITCODE
    if ($exit -ne 0) {
        $needsFallback = (& python -c "import ruff" 2>&1) -match "No module"
        if ($needsFallback) {
            uv run ruff check . 2>&1 | Out-Host
            $exit = $LASTEXITCODE
        }
    }
    Pop-Location
    exit $exit
}

# [3] Frontend unit tests (cucumber-js, no backend)
Run-Step "Frontend unit BDD (pnpm test:unit)" {
    pnpm test:unit
}

# Helper: probe puerto con reintentos progresivos (3s -> 6s -> 9s).
function Test-Endpoint {
    param([string]$Url)
    foreach ($t in 3, 6, 9) {
        try {
            $r = Invoke-WebRequest -Uri $Url -TimeoutSec $t -ErrorAction Stop
            if ($r.StatusCode -lt 400) { return $true }
        } catch {}
    }
    return $false
}

# [4] Backend BDD (pytest-bdd) — solo si backend esta corriendo
if (-not $Quick) {
    $backendUp = Test-Endpoint "http://localhost:8000/health"

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

# [5] E2E — solo si -E2E y ambos servers activos
if ($E2E) {
    $frontendUp = Test-Endpoint "http://localhost:5173"
    $backendUp = Test-Endpoint "http://localhost:8000/health"

    if ($frontendUp -and $backendUp) {
        Run-Step "E2E Playwright (pnpm test:e2e)" {
            pnpm test:e2e
        }
    } else {
        Write-Host ""
        Write-Host "--- E2E Playwright ---" -ForegroundColor Cyan
        Write-Host "SKIP: frontend (:5173=$frontendUp) o backend (:8000=$backendUp) no estan corriendo" -ForegroundColor Yellow
        $passed += "E2E Playwright (SKIP — servers offline)"
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
