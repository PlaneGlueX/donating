# Stops the LOCAL test server cleanly over RCON, waiting for it to save and exit.
# Usage: powershell -ExecutionPolicy Bypass -File tools\stop-server.ps1
$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\server')).Path
$pidFile = Join-Path $serverDir 'server.pid'
$proc = $null
if (Test-Path $pidFile) { $proc = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue }
if (-not $proc) { Write-Output 'Server is not running'; exit 0 }

& (Join-Path $PSScriptRoot 'rcon.ps1') 'stop'
if ($proc.WaitForExit(90000)) {
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  Write-Output 'Server stopped'
} else {
  Write-Output "Server did not exit within 90 s (PID $($proc.Id)); check server\logs\latest.log"
  exit 1
}
