# setup-harness.ps1
# Creates and verifies symlinks for multi-tool harness portability.
# Idempotent - safe to re-run after clone or after installing new skills.
#
# Symlinks managed:
#   .claude/skills/<name>  ->  .agents/skills/<name>   (per installed skill)
#   .opencode/agents       ->  .claude/agents           (Opencode, same format)

param(
    [switch]$Check  # Only verify, do not create
)

$root = Split-Path -Parent $PSScriptRoot
$errors = 0

function Ensure-Symlink {
    param([string]$Link, [string]$Target, [string]$Label)

    $linkFull   = Join-Path $root $Link
    $targetFull = Join-Path $root $Target

    if (Test-Path $linkFull -PathType Container) {
        $item = Get-Item $linkFull -Force
        if ($item.LinkType -eq "SymbolicLink" -or $item.LinkType -eq "Junction") {
            Write-Host "  OK  $Label" -ForegroundColor Green
            return
        }
        Write-Host "  SKIP $Label - path exists but is not a link (manual review needed)" -ForegroundColor Yellow
        return
    }

    if ($Check) {
        Write-Host "  MISSING $Label" -ForegroundColor Red
        $script:errors++
        return
    }

    $parent = Split-Path $linkFull -Parent
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    try {
        # Use Junction (mklink /J) - no admin required on Windows
        $result = cmd /c mklink /J "$linkFull" "$targetFull" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  CREATED $Label" -ForegroundColor Cyan
        } else {
            Write-Host "  FAILED $Label - $result" -ForegroundColor Red
            $script:errors++
        }
    } catch {
        Write-Host "  FAILED $Label - $_" -ForegroundColor Red
        $script:errors++
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "  setup-harness: symlink check"
Write-Host "============================================"

# .opencode/agents -> .claude/agents  (Opencode uses identical YAML+MD format)
Ensure-Symlink -Link ".opencode/agents" -Target ".claude/agents" -Label ".opencode/agents -> .claude/agents"

# .claude/skills/<name> -> .agents/skills/<name>  (one per installed skill)
$skillsSource = Join-Path $root ".agents/skills"
if (Test-Path $skillsSource) {
    Get-ChildItem $skillsSource -Directory | ForEach-Object {
        $name = $_.Name
        $linkLabel = ".claude/skills/$name -> .agents/skills/$name"
        Ensure-Symlink -Link ".claude/skills/$name" -Target ".agents/skills/$name" -Label $linkLabel
    }
} else {
    Write-Host "  INFO .agents/skills/ not found - no skill symlinks to verify" -ForegroundColor Gray
}

Write-Host ""
if ($errors -gt 0) {
    Write-Host "  $errors issue(s) found." -ForegroundColor Red
    exit 1
} else {
    Write-Host "  All symlinks OK." -ForegroundColor Green
}
