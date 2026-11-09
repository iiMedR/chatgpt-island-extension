param([Parameter(Mandatory = $true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$serverRoot = Join-Path $projectRoot 'server'
$env:EXTENSION_ORIGIN = 'chrome-extension://' + $ExtensionId
Push-Location $serverRoot
try {
  if (-not (Test-Path -LiteralPath 'dist/server/src/index.js')) { throw 'Run npm run build from the project folder first.' }
  & node 'dist/server/src/index.js'
} finally { Pop-Location }
