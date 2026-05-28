# post-edit.ps1 — Hook PostToolUse (Edit|Write)
# Corre lint rapido tras editar cualquier archivo.
# Frontend: pnpm lint | Backend: ruff check

param([string]$FilePath = $env:CLAUDE_TOOL_INPUT_FILE_PATH)

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

function Show-Lint($label, $output, $exitCode) {
    if ($exitCode -eq 0) {
        Write-Host "[harness] $label OK" -ForegroundColor Green
        return
    }
    Write-Host ""
    Write-Host "[harness] ADVERTENCIA — $label fallo:" -ForegroundColor Yellow
    $lines = @($output)
    if ($lines.Count -le 20) {
        $lines | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        Write-Host "(... $($lines.Count - 20) lineas anteriores omitidas ...)" -ForegroundColor DarkGray
        $lines[-20..-1] | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    Write-Host ""
}

if ($FilePath -match "frontend[/\\]") {
    Write-Host "[harness] Lint frontend (pnpm lint)..."
    Push-Location frontend
    $result = pnpm lint 2>&1
    $exit = $LASTEXITCODE
    Pop-Location
    Show-Lint "ESLint" $result $exit
}
elseif ($FilePath -match "backend[/\\]") {
    Write-Host "[harness] Lint backend (ruff check)..."
    Push-Location backend
    $result = python -m ruff check . 2>&1
    $exit = $LASTEXITCODE
    if ($exit -ne 0) {
        # python sin ruff: fallback a uv
        $result2 = uv run ruff check . 2>&1
        $exit2 = $LASTEXITCODE
        if ($exit2 -eq 0) { $exit = 0; $result = $result2 } else { $result = $result2 }
    }
    Pop-Location
    Show-Lint "ruff" $result $exit
}
