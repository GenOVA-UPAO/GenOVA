# session-start.ps1 - Hook SessionStart
# Verifica que el repo este verde al abrir sesion + marca timestamp en progress/current.md.
# Avisa de features 'in_progress' estancadas (>72h sin tocar).

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [harness] Inicio de sesion - verificacion rapida" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1) verify.ps1 -Quick (sin backend ni e2e)
& "$root\verify.ps1" -Quick
$verifyExit = $LASTEXITCODE
Write-Host ""

if ($verifyExit -ne 0) {
    Write-Host "[harness] verify.ps1 -Quick FALLO. Repara antes de implementar nada." -ForegroundColor Red
} else {
    Write-Host "[harness] verify.ps1 -Quick OK." -ForegroundColor Green
}

# 2) Anotar timestamp en progress/current.md si el campo Inicio sigue vacio
$currentMd = Join-Path $root "progress\current.md"
if (Test-Path $currentMd) {
    $content = Get-Content $currentMd -Raw -Encoding UTF8
    $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
    $stamp  = (Get-Date -Format "yyyy-MM-dd HH:mm")
    if ($content -match "\*\*Inicio:\*\*\s*_—_") {
        $updated = $content -replace "\*\*Inicio:\*\*\s*_—_", "**Inicio:** $stamp | branch=$branch"
        Set-Content -Path $currentMd -Value $updated -Encoding UTF8
        Write-Host "[harness] progress/current.md inicializado ($stamp on $branch)." -ForegroundColor Green
    }
}

# 3) Feature in_progress estancada?
$featureList = Join-Path $root "feature_list.json"
if (Test-Path $featureList) {
    try {
        $data = Get-Content $featureList -Raw -Encoding UTF8 | ConvertFrom-Json
        $stale = $data.features | Where-Object { $_.status -eq "in_progress" }
        if ($stale) {
            $listMtime = (Get-Item $featureList).LastWriteTime
            $ageHrs = (New-TimeSpan -Start $listMtime -End (Get-Date)).TotalHours
            if ($ageHrs -gt 72) {
                Write-Host ""
                Write-Host "[harness] AVISO: feature(s) en in_progress sin tocar hace $([int]$ageHrs)h:" -ForegroundColor Yellow
                $stale | ForEach-Object { Write-Host "  - $($_.id) $($_.title)" -ForegroundColor Yellow }
            }
        }
    } catch {
        # JSON malformado: silenciar para no bloquear sesion
    }
}

Write-Host ""
