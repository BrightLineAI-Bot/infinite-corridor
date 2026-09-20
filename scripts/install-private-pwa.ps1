[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$taskName = 'Infinite Corridor Private PWA'
$projectRoot = Split-Path -Parent $PSScriptRoot
$serveScript = Join-Path $PSScriptRoot 'serve-private-pwa.ps1'
$tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

foreach ($path in @($serveScript, $tailscale, (Join-Path $projectRoot 'dist\index.html'))) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required private-deployment file is missing: $path"
    }
}

$action = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument "-NoProfile -WindowStyle Hidden -File `"$serveScript`"" -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Serves the validated Infinite Corridor production PWA on loopback for tailnet-only HTTPS access.'
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null

$existing = Get-NetTCPConnection -State Listen -LocalPort 18882 -ErrorAction SilentlyContinue
if (-not $existing) {
    Start-ScheduledTask -TaskName $taskName
    $deadline = (Get-Date).AddSeconds(20)
    do {
        Start-Sleep -Milliseconds 250
        $existing = Get-NetTCPConnection -State Listen -LocalPort 18882 -ErrorAction SilentlyContinue
    } until ($existing -or (Get-Date) -ge $deadline)
    if (-not $existing) { throw 'Private PWA listener did not start on loopback port 18882.' }
}

& $tailscale serve --bg --yes --https 10444 http://127.0.0.1:18882
if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve configuration failed.' }

$tailscaleStatus = & $tailscale status --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $tailscaleStatus.Self.DNSName) {
    throw 'Unable to resolve this host tailnet DNS name.'
}
$dnsName = $tailscaleStatus.Self.DNSName.TrimEnd('.')
$privateUrl = "https://${dnsName}:10444/"
$health = Invoke-WebRequest -UseBasicParsing $privateUrl
if ($health.StatusCode -ne 200) { throw "Tailnet health check returned HTTP $($health.StatusCode)." }
Write-Output "Infinite Corridor is available at $privateUrl (tailnet only)."
