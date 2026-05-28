# on-stop.ps1 - Hook Stop
# Ejecuta verify.ps1 completo antes de cerrar la sesion.
# BLOQUEA cierre si detecta secretos en archivos modificados.

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [harness] Verificacion de cierre de sesion" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1) verify.ps1 completo
& "$root\verify.ps1"
$verifyExit = $LASTEXITCODE

Write-Host ""

if ($verifyExit -ne 0) {
    Write-Host "[harness] verify.ps1 FALLO - revisa los errores antes de cerrar." -ForegroundColor Red
    Write-Host "          No se propone commit hasta que el repo este en verde." -ForegroundColor Yellow
    exit 0  # No bloquear stop por fallo de tests; secret gate si bloquea
}

# 2) Scan de secretos en archivos modificados
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
$changedFiles = (git diff --name-only HEAD 2>$null)
if (-not $changedFiles) { $changedFiles = (git diff --cached --name-only 2>$null) }
$secretsFound = @()
foreach ($file in $changedFiles) {
    if (Test-Path $file) {
        # Saltar binarios / lockfiles / fixtures conocidos
        if ($file -match "\.(png|jpg|jpeg|gif|ico|zip|pdf|lock)$") { continue }
        if ($file -match "(uv\.lock|pnpm-lock\.yaml|package-lock\.json)$") { continue }
        $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) { $secretsFound += "$file : patron $pattern" }
        }
    }
}
if ($secretsFound.Count -gt 0) {
    Write-Host ""
    Write-Host "[harness] BLOQUEADO - Posibles secretos en archivos modificados:" -ForegroundColor Red
    $secretsFound | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "          NO se propondra commit. Revisa y limpia antes de cerrar." -ForegroundColor Red
    exit 1
}

# 3) Estado git
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "[harness] Hay cambios no commiteados en el repo." -ForegroundColor Yellow
    Write-Host "          El agente leader propondra un mensaje de commit." -ForegroundColor Yellow
    Write-Host "          Aprueba o rechaza explicitamente antes de ejecutar git commit." -ForegroundColor Yellow
} else {
    Write-Host "[harness] Repo limpio. Sin cambios pendientes." -ForegroundColor Green
}

Write-Host ""
