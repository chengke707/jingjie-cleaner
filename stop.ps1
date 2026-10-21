$ErrorActionPreference = 'Stop'
$record = Join-Path $PSScriptRoot '.service-pid'
if (-not (Test-Path -LiteralPath $record)) { Write-Output 'No launcher-owned service record found.'; exit }
$identity = Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
$serviceId = [int]$identity.id
$service = Get-Process -Id $serviceId -ErrorAction SilentlyContinue
if ($service -and $service.ProcessName -eq 'node' -and $service.StartTime.ToUniversalTime().Ticks -eq $identity.started -and $service.Path -eq $identity.executable) {
    Stop-Process -Id $serviceId
    Remove-Item -LiteralPath $record
    Write-Output 'Jingjie service stopped.'
} else { Write-Output 'Recorded process is no longer running; no process was stopped.' }
