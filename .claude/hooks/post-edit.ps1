# post-edit.ps1 - Hook PostToolUse (Edit|Write)
# Quick lint after edit. Frontend: pnpm lint. Backend: ruff check.
# Debounce: skips if same area (frontend/backend) was linted within DEBOUNCE_SECS seconds.

param([string]$FilePath = $env:CLAUDE_TOOL_INPUT_FILE_PATH)

$DEBOUNCE_SECS = 30
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

function Show-Lint($label, $output, $exitCode) {
    if ($exitCode -eq 0) {
        Write-Host "[harness] $label OK" -ForegroundColor Green
        return
    }
    Write-Host ""
    Write-Host "[harness] WARN - $label failed:" -ForegroundColor Yellow
    $lines = @($output)
    if ($lines.Count -le 20) {
        $lines | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        $skipped = $lines.Count - 20
        Write-Host "(... $skipped more lines above ...)" -ForegroundColor DarkGray
        $lines[-20..-1] | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    Write-Host ""
}

function Test-Debounce($area) {
    $stampFile = Join-Path $env:TEMP "genova_lint_$area.stamp"
    if (Test-Path $stampFile) {
        $lastRun = (Get-Item $stampFile).LastWriteTime
        if ((New-TimeSpan -Start $lastRun -End (Get-Date)).TotalSeconds -lt $DEBOUNCE_SECS) {
            Write-Host "[harness] Lint $area skipped (debounce ${DEBOUNCE_SECS}s)" -ForegroundColor DarkGray
            return $true
        }
    }
    $null | Out-File $stampFile
    return $false
}

if ($FilePath -match "frontend[/\\]") {
    if (Test-Debounce "frontend") { exit 0 }
    Write-Host "[harness] Lint frontend (pnpm lint)..."
    Push-Location frontend
    $result = pnpm lint 2>&1
    $exit = $LASTEXITCODE
    Pop-Location
    Show-Lint "Biome" $result $exit
}
elseif ($FilePath -match "backend[/\\]") {
    if (Test-Debounce "backend") { exit 0 }
    Write-Host "[harness] Lint backend (ruff check)..."
    Push-Location backend
    $result = python -m ruff check . 2>&1
    $exit = $LASTEXITCODE
    if ($exit -ne 0) {
        $result2 = uv run ruff check . 2>&1
        $exit2 = $LASTEXITCODE
        if ($exit2 -eq 0) { $exit = 0; $result = $result2 } else { $result = $result2 }
    }
    Pop-Location
    Show-Lint "ruff" $result $exit
}
