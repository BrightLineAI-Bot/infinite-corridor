[CmdletBinding(SupportsShouldProcess)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$taskName = 'Infinite Corridor Private PWA'
$tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'

if ($PSCmdlet.ShouldProcess('Tailscale HTTPS port 10444', 'Disable Infinite Corridor private route')) {
    & $tailscale serve --https 10444 off
    if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve rollback failed.' }
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $PSCmdlet.ShouldProcess($taskName, 'Unregister scheduled task')) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Write-Output 'Infinite Corridor private deployment route and scheduled task are removed.'
