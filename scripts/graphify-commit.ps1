# graphify-commit.ps1
# Stages all graphify-out/ changes and commits with a standard message.
#
# Usage:
#   scripts/graphify-commit.ps1              # commit current graphify-out state
#   scripts/graphify-commit.ps1 -Message "custom note"

param(
    [string]$Message = ""
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$changed = git status --porcelain graphify-out/
if (-not $changed) {
    Write-Host "graphify-commit: no changes in graphify-out/. Nothing to commit." -ForegroundColor Yellow
    exit 0
}

git add graphify-out/

$date = Get-Date -Format "yyyy-MM-dd"
$body = if ($Message) { "`n`n$Message" } else { "" }
$commitMsg = "chore(graphify): update knowledge graph $date$body`n`nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git commit -m $commitMsg

if ($LASTEXITCODE -eq 0) {
    Write-Host "graphify-commit: committed." -ForegroundColor Green
} else {
    Write-Host "ERROR: git commit failed (exit $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}
