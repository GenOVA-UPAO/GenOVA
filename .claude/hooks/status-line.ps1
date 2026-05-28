# status-line.ps1 - Status line for Claude Code prompt.
# Format: GENOVA <branch> | <feature_in_progress | idle>
# Keep ASCII-only so PowerShell 5.1 (default in Windows) parses without BOM.

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$branch = (git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $branch) { $branch = "no-branch" }

$activeFeature = "idle"
$featureList = Join-Path $root "feature_list.json"
if (Test-Path $featureList) {
    try {
        $data = Get-Content $featureList -Raw -Encoding UTF8 | ConvertFrom-Json
        $inp = $data.features | Where-Object { $_.status -eq "in_progress" } | Select-Object -First 1
        if ($inp) { $activeFeature = "$($inp.id)" }
    } catch {
        $activeFeature = "?"
    }
}

Write-Output "GENOVA $branch | $activeFeature"
