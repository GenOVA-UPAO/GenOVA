# post-edit.ps1 — Hook PostToolUse (Edit|Write)
# Corre lint rapido tras editar cualquier archivo.
# Frontend: pnpm lint | Backend: ruff check

param([string]$FilePath = $env:CLAUDE_TOOL_INPUT_FILE_PATH)

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$errors = @()

# Detecta si el archivo es frontend o backend
if ($FilePath -match "frontend[/\\]") {
    Write-Host "[harness] Lint frontend (pnpm lint)..."
    $result = pnpm lint 2>&1 | Select-Object -Last 8
    if ($LASTEXITCODE -ne 0) {
        $errors += "ESLint FALLA:`n$($result -join "`n")"
    }
}
elseif ($FilePath -match "backend[/\\]") {
    Write-Host "[harness] Lint backend (ruff check)..."
    Push-Location backend
    $result = python -m ruff check . 2>&1 | Select-Object -Last 8
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        $errors += "ruff FALLA:`n$($result -join "`n")"
    }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "[harness] ADVERTENCIA — Lint falló:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
} else {
    Write-Host "[harness] Lint OK" -ForegroundColor Green
}
