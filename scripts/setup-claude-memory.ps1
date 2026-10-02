#Requires -Version 7
<#
.SYNOPSIS
    Points Claude Code's project memory directory at .claude/memory/ in this repository.

.DESCRIPTION
    Claude Code reads project memory from %USERPROFILE%\.claude\projects\<path-slug>\memory, where the
    slug is derived from the repository's absolute path. This script replaces that directory with a
    junction into the repository, so memory is versioned and travels with git push / git pull.
    Run once per machine, from a non-elevated PowerShell 7. See docs/claude-multi-machine.md.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# The one path every machine must use. The memory directory is named after it.
$expectedRepoPath = 'C:\DATA\Cave\MyRepos\VMCI.Scanner'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
if ($repoRoot -ne $expectedRepoPath) {
    throw "This checkout is at '$repoRoot', but every machine must use '$expectedRepoPath' " +
          "(Claude's memory directory is named after the absolute path). Move the checkout first."
}

$slug = $repoRoot -replace '[^A-Za-z0-9]', '-'
$projectDir = Join-Path $env:USERPROFILE ".claude\projects\$slug"
$live = Join-Path $projectDir 'memory'
$target = Join-Path $repoRoot '.claude\memory'

if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
}

if (Test-Path $live) {
    $item = Get-Item $live -Force
    if ($item.LinkType -eq 'Junction' -and $item.Target -contains $target) {
        Write-Host "Already set up: $live -> $target"
        return
    }

    $backup = "$live.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Rename-Item $live $backup
    Write-Host "Existing memory kept as $backup - merge anything useful into .claude/memory/, then delete it."
}
elseif (-not (Test-Path $projectDir)) {
    New-Item -ItemType Directory -Path $projectDir | Out-Null
}

New-Item -ItemType Junction -Path $live -Target $target | Out-Null
Write-Host "Junction created: $live -> $target"
