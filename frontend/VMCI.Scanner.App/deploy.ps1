<#
.SYNOPSIS
    Deploys the built SPA to wwwroot of scanner.vmci.be (Plesk) via Web Deploy.

.DESCRIPTION
    Builds the app (unless -SkipBuild) and syncs dist/ to <site>/wwwroot. Files in wwwroot that are not in
    dist/ are removed. The API in the site root is deployed separately, from Visual Studio, with the
    publish profile backend/VMCI.Scanner.WebApi/Properties/PublishProfiles/scanner.vmci.be.pubxml.
    Modelled on LevelUp's frontend/LevelUp.App/deploy.ps1 (same hosting).

    Credentials come from $env:DEPLOY_USERNAME / $env:DEPLOY_PASSWORD, or are asked for. They are never
    stored.

.EXAMPLE
    npm run deploy
.EXAMPLE
    ./deploy.ps1 -SkipBuild
#>
[CmdletBinding()]
param(
    [string]$Server = ($env:DEPLOY_SERVER ?? 'vmci.be'),
    [string]$SiteName = ($env:DEPLOY_SITE ?? 'scanner.vmci.be'),
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '==================================='
Write-Host '  VMCI.Scanner.App deployment'
Write-Host "  $SiteName/wwwroot on $Server"
Write-Host '==================================='

if (-not $SkipBuild) {
    Write-Host 'Building...' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit code $LASTEXITCODE)." }
}

$dist = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    throw "No build in $dist. Run 'npm run build' first, or drop -SkipBuild."
}
Write-Host "Found build: $dist" -ForegroundColor Green

$msdeploy = @(
    "$env:ProgramFiles\IIS\Microsoft Web Deploy V3\msdeploy.exe",
    "${env:ProgramFiles(x86)}\IIS\Microsoft Web Deploy V3\msdeploy.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $msdeploy) {
    $msdeploy = (Get-Command msdeploy.exe -ErrorAction SilentlyContinue)?.Source
}
if (-not $msdeploy) {
    throw 'msdeploy.exe not found. Install Web Deploy: https://www.iis.net/downloads/microsoft/web-deploy'
}
Write-Host "Found msdeploy: $msdeploy" -ForegroundColor Green

$username = $env:DEPLOY_USERNAME
if (-not $username) { $username = Read-Host "Username for $Server" }
$password = $env:DEPLOY_PASSWORD
if (-not $password) {
    $password = [System.Net.NetworkCredential]::new('', (Read-Host "Password for $Server" -AsSecureString)).Password
}
if ($password.Contains('"')) {
    throw 'A password containing a double quote cannot be passed to msdeploy.'
}

# One argument string handed over verbatim: msdeploy parses its own quoting, which PowerShell's
# per-argument quoting would break.
$siteEncoded = $SiteName.Replace(' ', '%20')
$arguments = @(
    '-verb:sync'
    "-source:contentPath=""$dist"""
    "-dest:contentPath=""$SiteName/wwwroot"",computerName=""https://${Server}:8172/msdeploy.axd?site=$siteEncoded"",username=""$username"",password=""$password"",authtype=Basic"
    '-allowUntrusted'
    '-enableRule:AppOffline'
    '-retryAttempts:2'
    '-retryInterval:5000'
) -join ' '

Write-Host "Deploying to $Server..." -ForegroundColor Cyan
$process = Start-Process -FilePath $msdeploy -ArgumentList $arguments -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) {
    throw "Deployment failed (msdeploy exit code $($process.ExitCode))."
}

Write-Host '==================================='  -ForegroundColor Green
Write-Host '  Deployment completed successfully' -ForegroundColor Green
Write-Host '==================================='  -ForegroundColor Green
Write-Host "Site URL: https://$SiteName"
