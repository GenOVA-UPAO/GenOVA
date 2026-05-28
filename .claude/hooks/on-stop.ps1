# on-stop.ps1 - Hook Stop
# Ejecuta verify.ps1 completo antes de cerrar la sesion.
# Si hay cambios en git, informa al usuario para que proponga el commit.

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [harness] Verificacion de cierre de sesion" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ejecutar verify.ps1
& "$root\verify.ps1"
$verifyExit = $LASTEXITCODE

Write-Host ""

if ($verifyExit -ne 0) {
    Write-Host "[harness] verify.ps1 FALLO - revisa los errores antes de cerrar." -ForegroundColor Red
    Write-Host "          No se propone commit hasta que el repo este en verde." -ForegroundColor Yellow
} else {
    # Scan de secretos en archivos modificados
    $secretPatterns = @(
        'GROQ_API_KEY\s*=\s*gsk_',
        'OPENROUTER_API_KEY\s*=\s*sk-or-',
        'GEMINI_API_KEY\s*=\s*AIza',
        'password\s*=\s*[\x22\x27][^\x22\x27]{4,}[\x22\x27]',
        'secret\s*=\s*[\x22\x27][^\x22\x27]{4,}[\x22\x27]'
    )
    $changedFiles = (git diff --name-only HEAD 2>$null)
    if (-not $changedFiles) { $changedFiles = (git diff --cached --name-only 2>$null) }
    $secretsFound = @()
    foreach ($file in $changedFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
            foreach ($pattern in $secretPatterns) {
                if ($content -match $pattern) { $secretsFound += "$file : patron $pattern" }
            }
        }
    }
    if ($secretsFound.Count -gt 0) {
        Write-Host ""
        Write-Host "[harness] ADVERTENCIA - Posibles secretos en archivos modificados:" -ForegroundColor Red
        $secretsFound | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        Write-Host "          Revisa antes de commitear." -ForegroundColor Yellow
    }

    # Verificar si hay cambios en git
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        Write-Host "[harness] Hay cambios no commiteados en el repo." -ForegroundColor Yellow
        Write-Host "          El agente leader propondra un mensaje de commit." -ForegroundColor Yellow
        Write-Host "          Aprueba o rechaza explicitamente antes de ejecutar git commit." -ForegroundColor Yellow
    } else {
        Write-Host "[harness] Repo limpio. Sin cambios pendientes." -ForegroundColor Green
    }
}

Write-Host ""
