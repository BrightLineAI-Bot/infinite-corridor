[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 18882
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$indexPath = Join-Path $distRoot 'index.html'
$python = (Get-Command python.exe -ErrorAction Stop).Source

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Production build is missing: $indexPath"
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($listener) {
    throw "Port $Port is already in use."
}

Set-Location -LiteralPath $projectRoot
& $python -m http.server $Port --bind 127.0.0.1 --directory $distRoot
exit $LASTEXITCODE
