# pre-commit-check.ps1 - PreToolUse hook (Bash, filtered to "git commit*" via "if")
# Runs full verify.ps1 + secret scan ONLY before a git commit.
# Blocks the commit (permissionDecision=deny) if secrets are detected.
# Messages go to stderr; stdout is JSON only (Cursor requires valid JSON in PreToolUse).

$ErrorActionPreference = "Continue"
function Write-HookMsg([string]$Message, [string]$Color = "White") {
    [Console]::Error.WriteLine($Message)
}

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-HookMsg ""
Write-HookMsg "============================================"
Write-HookMsg "  [harness] Pre-commit verification"
Write-HookMsg "============================================"
Write-HookMsg ""

# 1) full verify.ps1 (does not block the commit on test failure, only warns)
& "$root\verify.ps1"
$verifyExit = $LASTEXITCODE

Write-HookMsg ""

if ($verifyExit -ne 0) {
    Write-HookMsg "[harness] verify.ps1 FAILED - review the errors before confirming the commit."
}

# 2) Scan de secretos en archivos staged (fallback: working tree)
$secretPatterns = @(
    'GROQ_API_KEY\s*=\s*gsk_[A-Za-z0-9]{16,}',
    'OPENROUTER_API_KEY\s*=\s*sk-or-[A-Za-z0-9-]{16,}',
    'GEMINI_API_KEY\s*=\s*AIza[A-Za-z0-9_-]{30,}',
    'AKIA[0-9A-Z]{16}',                                # AWS access key
    'sk_live_[A-Za-z0-9]{20,}',                        # Stripe secret
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',  # JWT
    'SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9._-]{40,}',
    'password\s*=\s*[\x22\x27][^\x22\x27]{4,}[\x22\x27]',
    'secret\s*=\s*[\x22\x27][^\x22\x27]{4,}[\x22\x27]'
)
$changedFiles = (git diff --cached --name-only 2>$null)
if (-not $changedFiles) { $changedFiles = (git diff --name-only HEAD 2>$null) }
$secretsFound = @()
foreach ($file in $changedFiles) {
    if (Test-Path $file) {
        # Skip known binaries / lockfiles / fixtures
        if ($file -match "\.(png|jpg|jpeg|gif|ico|zip|pdf|lock)$") { continue }
        if ($file -match "(uv\.lock|pnpm-lock\.yaml|package-lock\.json)$") { continue }
        $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) { $secretsFound += "$file : pattern $pattern" }
        }
    }
}

if ($secretsFound.Count -gt 0) {
    Write-HookMsg ""
    Write-HookMsg "[harness] BLOCKED - Possible secrets in files to be committed:"
    $secretsFound | ForEach-Object { Write-HookMsg "  $_" }
    Write-HookMsg ""
    $reason = "Possible secrets detected: " + ($secretsFound -join "; ")
    $output = @{
        hookSpecificOutput = @{
            hookEventName = "PreToolUse"
            permissionDecision = "deny"
            permissionDecisionReason = $reason
        }
    }
    $output | ConvertTo-Json -Depth 5 -Compress
    exit 0
}

# 3) Orphan wireframes (implementer PHASE 0 without a completed real implementation)
$wireframeDir = Join-Path $root "frontend\src\wireframes"
if (Test-Path $wireframeDir) {
    $wireframes = Get-ChildItem $wireframeDir -Filter "*.jsx" -ErrorAction SilentlyContinue
    if ($wireframes.Count -gt 0) {
        Write-HookMsg "[harness] WARNING - Temporary wireframes present (PHASE 0 session not closed):"
        $wireframes | ForEach-Object { Write-HookMsg "  frontend/src/wireframes/$($_.Name)" }
        Write-HookMsg "          Remove after real implementation or resume them next session."
    }
}

Write-HookMsg "[harness] Pre-commit OK. Continuing with the commit."
Write-HookMsg ""

# Allow: stdout must be valid PreToolUse JSON (no log noise).
@{
    hookSpecificOutput = @{
        hookEventName = "PreToolUse"
        permissionDecision = "allow"
    }
} | ConvertTo-Json -Depth 5 -Compress
exit 0
