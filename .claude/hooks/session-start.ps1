# session-start.ps1 - Hook SessionStart
# Quick repo verification + timestamp into sdd/progress/current.md + warn about stale features.
# ASCII-only source so PowerShell 5.1 parses without BOM.

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [harness] Session start - quick check" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1) verify.ps1 -Quick (no backend, no e2e)
& "$root\verify.ps1" -Quick
$verifyExit = $LASTEXITCODE
Write-Host ""

if ($verifyExit -ne 0) {
    Write-Host "[harness] verify.ps1 -Quick FAILED. Fix before implementing anything." -ForegroundColor Red
} else {
    Write-Host "[harness] verify.ps1 -Quick OK." -ForegroundColor Green
}

# 2) Stamp sdd/progress/current.md if Inicio is still the empty placeholder.
# The placeholder uses an em-dash (U+2014) so we build the regex with [char].
$currentMd = Join-Path $root "progress\current.md"
if (Test-Path $currentMd) {
    $content = Get-Content $currentMd -Raw -Encoding UTF8
    $branch  = (git rev-parse --abbrev-ref HEAD 2>$null)
    $stamp   = (Get-Date -Format "yyyy-MM-dd HH:mm")
    $dash    = [char]0x2014
    $pattern = "\*\*Inicio:\*\*\s*_${dash}_"
    if ($content -match $pattern) {
        $updated = $content -replace $pattern, "**Inicio:** $stamp | branch=$branch"
        Set-Content -Path $currentMd -Value $updated -Encoding UTF8
        Write-Host "[harness] sdd/progress/current.md initialized ($stamp on $branch)." -ForegroundColor Green
    }
}

# 3) Stale in_progress features?
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
                Write-Host "[harness] WARN: in_progress feature(s) untouched for $([int]$ageHrs)h:" -ForegroundColor Yellow
                $stale | ForEach-Object { Write-Host "  - $($_.id) $($_.title)" -ForegroundColor Yellow }
            }
        }
    } catch {
        # Malformed JSON: stay silent so it doesn't block the session.
    }
}

Write-Host ""
