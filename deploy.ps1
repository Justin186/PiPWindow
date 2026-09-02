<#
.SYNOPSIS
    Build and deploy PiPWindow plugin to BetterNCM

.DESCRIPTION
    1. (optional) Run npm run build
    2. Repack the .plugin package (ZIP with main.js + manifest.json at root)
    3. Sync the BetterNCM runtime directory

.PARAMETER Build
    Run npm run build first (default: deploy existing dist/ only)

.PARAMETER BetterNCMRoot
    BetterNCM root directory (default: C:\betterncm)

.EXAMPLE
    .\deploy.ps1 -Build
    Build and deploy

.EXAMPLE
    .\deploy.ps1
    Deploy existing dist/ only
#>
param(
    [switch]$Build,
    [string]$BetterNCMRoot = "C:\betterncm"
)

$ErrorActionPreference = "Stop"

# Project root (directory of this script)
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir = Join-Path $ProjectRoot "dist"

# 1. Build
if ($Build) {
    Write-Host "==> Building..." -ForegroundColor Cyan
    Push-Location $ProjectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed (npm run build exit code $LASTEXITCODE)"
        }
    } finally {
        Pop-Location
    }
    Write-Host "==> Build done" -ForegroundColor Green
}

# 2. Check artifacts
$srcMain = Join-Path $DistDir "main.js"
$srcManifest = Join-Path $DistDir "manifest.json"
if (-not (Test-Path $srcMain)) { throw "Not found: $srcMain. Run 'npm run build' first." }
if (-not (Test-Path $srcManifest)) { throw "Not found: $srcManifest. Run 'npm run build' first." }

# 3. Read version and plugin name from manifest
# 注意：manifest.json 是 UTF-8 编码，PowerShell 5.1 的 Get-Content 默认按 ANSI 读取，
# 必须显式指定 -Encoding UTF8，否则中文 description 会乱码导致 JSON 解析失败。
$manifest = Get-Content $srcManifest -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
$pluginName = $manifest.name
Write-Host "==> Plugin: $pluginName v$version" -ForegroundColor Cyan

# 4. Create .plugin package (ZIP with contents at root)
$pluginFile = Join-Path $ProjectRoot "$pluginName-$version.plugin"
if (Test-Path $pluginFile) { Remove-Item $pluginFile -Force }
Write-Host "==> Packing $pluginFile ..." -ForegroundColor Cyan
$tempZip = Join-Path $env:TEMP "$pluginName-$version.zip"
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $tempZip
Move-Item $tempZip $pluginFile -Force
Write-Host "==> Packed: $pluginFile" -ForegroundColor Green

# 5. Deploy to BetterNCM runtime
$pluginsDir = Join-Path $BetterNCMRoot "plugins"
if (-not (Test-Path $pluginsDir)) {
    Write-Host "==> BetterNCM plugins dir not found at $pluginsDir, skipping deploy." -ForegroundColor Yellow
    Write-Host "    The .plugin package is ready at: $pluginFile" -ForegroundColor Yellow
    exit 0
}
$installedPluginFile = Join-Path $pluginsDir "$pluginName-$version.plugin"
Copy-Item $pluginFile $installedPluginFile -Force
Write-Host "==> Installed package: $installedPluginFile" -ForegroundColor Green
$targetDir = Join-Path $pluginsDir $manifest.slug
if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Copy-Item (Join-Path $DistDir "*") -Destination $targetDir -Recurse -Force
Write-Host "==> Deployed to $targetDir" -ForegroundColor Green

# BetterNCM loads installed plugins from plugins_runtime at runtime.
$runtimeDir = Join-Path $BetterNCMRoot "plugins_runtime\$($manifest.slug)"
if (Test-Path $runtimeDir) {
    Remove-Item $runtimeDir -Recurse -Force
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    Copy-Item (Join-Path $DistDir "*") -Destination $runtimeDir -Recurse -Force
    Write-Host "==> Deployed runtime copy to $runtimeDir" -ForegroundColor Green
}
Write-Host "==> Done. Restart NeteaseCloudMusic to apply changes." -ForegroundColor Green
