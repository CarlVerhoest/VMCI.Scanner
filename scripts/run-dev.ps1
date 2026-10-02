#Requires -Version 7
<#
.SYNOPSIS
    Starts the API and the Vite dev server for local development, each in its own PowerShell window.

.DESCRIPTION
    API:      https://localhost:7300 (launch profile "Run Server Only", Development environment)
    Frontend: http://localhost:3300 (https when the mkcert certificates exist), proxying /api to the API

    Close a window, or press Ctrl+C in it, to stop that server. Claude Code sessions do not use this
    script: they start the same two servers from .claude/launch.json.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$api = Join-Path $repoRoot 'backend\VMCI.Scanner.WebApi'
$frontend = Join-Path $repoRoot 'frontend\VMCI.Scanner.App'

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    throw "Frontend dependencies are missing. Run 'npm install' in $frontend first."
}

Start-Process pwsh -WorkingDirectory $api -ArgumentList @(
    '-NoExit', '-Command', 'dotnet run --launch-profile "Run Server Only"'
)
Start-Process pwsh -WorkingDirectory $frontend -ArgumentList @(
    '-NoExit', '-Command', 'npm run dev'
)

Write-Host 'API:      https://localhost:7300'
Write-Host 'Frontend: http://localhost:3300'
