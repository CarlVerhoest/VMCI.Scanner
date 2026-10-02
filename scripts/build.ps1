#Requires -Version 7
<#
.SYNOPSIS
    Full verification build: frontend type-check, lint and build, then the backend in Release.

.DESCRIPTION
    Stops at the first failing step. Does not run tests and does not copy the frontend into the
    API's wwwroot - see docs/deployment.md for publishing.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontend = Join-Path $repoRoot 'frontend\VMCI.Scanner.App'
$solution = Join-Path $repoRoot 'backend\VMCI.Scanner.sln'

function Invoke-Step([string]$name, [scriptblock]$command) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $command
    if ($LASTEXITCODE -ne 0) {
        throw "$name failed with exit code $LASTEXITCODE."
    }
}

Push-Location $frontend
try {
    Invoke-Step 'Frontend type-check' { npm run type-check }
    Invoke-Step 'Frontend lint' { npm run lint }
    Invoke-Step 'Frontend build' { npm run build }
}
finally {
    Pop-Location
}

Invoke-Step 'Backend build (Release)' { dotnet build $solution -c Release }

Write-Host 'Build succeeded.' -ForegroundColor Green
