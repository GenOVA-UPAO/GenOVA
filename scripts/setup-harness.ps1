# setup-harness.ps1
# Syncs harness assets for multi-tool portability.
# Idempotent - safe to re-run after clone or after installing new skills.
#
# Managed sync:
#   .opencode/agents/*.md   <= transformed copies from .claude/agents/*.md
#   .claude/skills/<name>   ->  .agents/skills/<name> (per installed skill)

param(
    [switch]$Check  # Only verify, do not create or modify
)

$root = Split-Path -Parent $PSScriptRoot
$errors = 0
$changes = 0

function Ensure-Symlink {
    param([string]$Link, [string]$Target, [string]$Label)

    $linkFull = Join-Path $root $Link
    $targetFull = Join-Path $root $Target

    if (Test-Path $linkFull -PathType Container) {
        $item = Get-Item $linkFull -Force
        if ($item.LinkType -eq "SymbolicLink" -or $item.LinkType -eq "Junction") {
            Write-Host "  OK      $Label" -ForegroundColor Green
            return
        }
        Write-Host "  SKIP    $Label - path exists but is not a link (manual review needed)" -ForegroundColor Yellow
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
            $script:changes++
        }
        else {
            Write-Host "  FAILED  $Label - $result" -ForegroundColor Red
            $script:errors++
        }
    }
    catch {
        Write-Host "  FAILED  $Label - $_" -ForegroundColor Red
        $script:errors++
    }
}

function Get-AgentMode {
    param([string]$Name)

    if ($Name -eq "leader") {
        return @{
            mode = "primary"
            hidden = "false"
        }
    }

    return @{
        mode = "subagent"
        hidden = "true"
    }
}

function Convert-ClaudeAgentToOpencode {
    param(
        [string]$AgentName,
        [string]$RawContent
    )

    $normalized = $RawContent -replace "`r`n", "`n"
    $lines = $normalized -split "`n", -1

    if ($lines.Count -lt 3 -or $lines[0].Trim() -ne "---") {
        return $RawContent
    }

    $frontmatterEnd = -1
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq "---") {
            $frontmatterEnd = $i
            break
        }
    }

    if ($frontmatterEnd -lt 0) {
        return $RawContent
    }

    $front = $lines[1..($frontmatterEnd - 1)]
    $body = @()
    if (($frontmatterEnd + 1) -lt $lines.Count) {
        $body = $lines[($frontmatterEnd + 1)..($lines.Count - 1)]
    }

    $name = $AgentName
    $description = $null
    $tools = [ordered]@{}
    $inTools = $false

    foreach ($line in $front) {
        if ($line -match '^\s*name:\s*(.+)\s*$') {
            $name = $Matches[1]
            $inTools = $false
            continue
        }

        if ($line -match '^\s*description:\s*(.+)\s*$') {
            $description = $Matches[1]
            $inTools = $false
            continue
        }

        if ($line -match '^\s*tools:\s*(.+)\s*$') {
            $inlineTools = $Matches[1].Trim()
            if ($inlineTools.Length -gt 0) {
                foreach ($rawTool in ($inlineTools -split ',')) {
                    $toolName = $rawTool.Trim().ToLowerInvariant()
                    if ($toolName.Length -eq 0) {
                        continue
                    }
                    if ($toolName -eq "agent") {
                        $toolName = "task"
                    }
                    $tools[$toolName] = $true
                }
                $inTools = $false
            }
            else {
                $inTools = $true
            }
            continue
        }

        if ($inTools -and $line -match '^\s{2}([A-Za-z0-9_-]+):\s*(true|false)\s*$') {
            if ($Matches[2] -eq "true") {
                $toolName = $Matches[1].ToLowerInvariant()
                if ($toolName -eq "agent") {
                    $toolName = "task"
                }
                $tools[$toolName] = $true
            }
            continue
        }

        if ($inTools -and $line -match '^\S') {
            $inTools = $false
        }
    }

    if ($tools.Count -eq 0) {
        $tools["read"] = $true
    }

    $modeSettings = Get-AgentMode -Name $name
    $canEdit = $tools.Contains("edit") -or $tools.Contains("write")
    $canBash = $tools.Contains("bash")
    $canWebfetch = $tools.Contains("webfetch")

    $header = @()
    $header += "---"
    $header += "name: $name"
    if ($description) {
        $header += "description: $description"
    }
    $header += "mode: $($modeSettings.mode)"
    $header += "hidden: $($modeSettings.hidden)"
    $header += "tools:"
    foreach ($tool in $tools.Keys) {
        $header += "  $($tool): true"
    }
    $header += "permission:"
    $header += "  edit: $(if ($canEdit) { 'allow' } else { 'deny' })"
    $header += "  bash: $(if ($canBash) { 'allow' } else { 'deny' })"
    $header += "  webfetch: $(if ($canWebfetch) { 'allow' } else { 'deny' })"
    $header += "---"

    $result = $header -join "`n"
    if ($body.Count -gt 0) {
        $result += "`n" + ($body -join "`n")
    }

    return $result
}

function Sync-OpencodeAgents {
    $sourceDir = Join-Path $root ".claude/agents"
    $targetDir = Join-Path $root ".opencode/agents"

    if (-not (Test-Path $sourceDir)) {
        Write-Host "  FAILED  .claude/agents not found" -ForegroundColor Red
        $script:errors++
        return
    }

    if ($Check) {
        if (-not (Test-Path $targetDir)) {
            Write-Host "  MISSING .opencode/agents directory" -ForegroundColor Red
            $script:errors++
            return
        }

        $targetItem = Get-Item $targetDir -Force
        if ($targetItem.LinkType -eq "SymbolicLink" -or $targetItem.LinkType -eq "Junction") {
            Write-Host "  MISMATCH .opencode/agents is a link; expected transformed directory" -ForegroundColor Red
            $script:errors++
            return
        }

        $sourceFiles = Get-ChildItem $sourceDir -File -Filter "*.md"
        foreach ($sourceFile in $sourceFiles) {
            $targetFile = Join-Path $targetDir $sourceFile.Name
            if (-not (Test-Path $targetFile)) {
                Write-Host "  MISSING .opencode/agents/$($sourceFile.Name)" -ForegroundColor Red
                $script:errors++
                continue
            }

            $sourceRaw = Get-Content $sourceFile.FullName -Raw
            $expected = Convert-ClaudeAgentToOpencode -AgentName $sourceFile.BaseName -RawContent $sourceRaw
            $actual = (Get-Content $targetFile -Raw) -replace "`r`n", "`n"
            if ($actual -ne $expected) {
                Write-Host "  DRIFT   .opencode/agents/$($sourceFile.Name)" -ForegroundColor Yellow
                $script:errors++
            }
            else {
                Write-Host "  OK      .opencode/agents/$($sourceFile.Name)" -ForegroundColor Green
            }
        }

        return
    }

    if (Test-Path $targetDir) {
        $targetItem = Get-Item $targetDir -Force
        if ($targetItem.LinkType -eq "SymbolicLink" -or $targetItem.LinkType -eq "Junction") {
            try {
                $result = cmd /c rmdir "$targetDir" 2>&1
                if (Test-Path $targetDir) {
                    Write-Host "  FAILED  could not remove .opencode/agents link - $result" -ForegroundColor Red
                    $script:errors++
                    return
                }
                Write-Host "  UPDATED .opencode/agents link removed (switching to transformed copies)" -ForegroundColor Cyan
                $script:changes++
            }
            catch {
                Write-Host "  FAILED  could not remove .opencode/agents link - $_" -ForegroundColor Red
                $script:errors++
                return
            }
        }
    }

    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Write-Host "  CREATED .opencode/agents directory" -ForegroundColor Cyan
        $script:changes++
    }

    $sourceFiles = Get-ChildItem $sourceDir -File -Filter "*.md"
    foreach ($sourceFile in $sourceFiles) {
        $targetFile = Join-Path $targetDir $sourceFile.Name
        $sourceRaw = Get-Content $sourceFile.FullName -Raw
        $transformed = Convert-ClaudeAgentToOpencode -AgentName $sourceFile.BaseName -RawContent $sourceRaw

        $shouldWrite = $true
        if (Test-Path $targetFile) {
            $current = (Get-Content $targetFile -Raw) -replace "`r`n", "`n"
            if ($current -eq $transformed) {
                $shouldWrite = $false
            }
        }

        if ($shouldWrite) {
            Set-Content -Path $targetFile -Value $transformed -NoNewline
            Write-Host "  SYNCED  .opencode/agents/$($sourceFile.Name)" -ForegroundColor Cyan
            $script:changes++
        }
        else {
            Write-Host "  OK      .opencode/agents/$($sourceFile.Name)" -ForegroundColor Green
        }
    }

    $sourceNames = @{}
    foreach ($sourceFile in $sourceFiles) {
        $sourceNames[$sourceFile.Name] = $true
    }

    Get-ChildItem $targetDir -File -Filter "*.md" | ForEach-Object {
        if (-not $sourceNames.ContainsKey($_.Name)) {
            Remove-Item -LiteralPath $_.FullName -Force
            Write-Host "  REMOVED .opencode/agents/$($_.Name) (no longer in source)" -ForegroundColor Cyan
            $script:changes++
        }
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "  setup-harness: sync and verification"
Write-Host "============================================"

# .opencode/agents/*.md <= transformed copies from .claude/agents/*.md
Sync-OpencodeAgents

# .claude/skills/<name> -> .agents/skills/<name> (one per installed skill)
$skillsSource = Join-Path $root ".agents/skills"
if (Test-Path $skillsSource) {
    Get-ChildItem $skillsSource -Directory | ForEach-Object {
        $name = $_.Name
        $linkLabel = ".claude/skills/$name -> .agents/skills/$name"
        Ensure-Symlink -Link ".claude/skills/$name" -Target ".agents/skills/$name" -Label $linkLabel
    }
}
else {
    Write-Host "  INFO    .agents/skills/ not found - no skill symlinks to verify" -ForegroundColor Gray
}

Write-Host ""
if ($errors -gt 0) {
    Write-Host "  $errors issue(s) found." -ForegroundColor Red
    exit 1
}

if ($Check) {
    Write-Host "  Harness check OK." -ForegroundColor Green
}
else {
    Write-Host "  Harness sync OK. Changes: $changes" -ForegroundColor Green
}
