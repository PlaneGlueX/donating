# Stops the LOCAL test server cleanly over RCON, waiting for it to save and exit, then the local pack server
# start-server.ps1 started (tools\serve-pack.js).
# Usage: powershell -ExecutionPolicy Bypass -File tools\stop-server.ps1
$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\server')).Path
$pidFile = Join-Path $serverDir 'server.pid'

# Only the process start-server.ps1 recorded, and only while it's still serve-pack.js (a PID Windows reused for
# another node process, a bot run or a tool, is left alone).
function Stop-PackServer {
  $packPid = Join-Path $serverDir 'pack-server.pid'
  if (-not (Test-Path $packPid)) { return }
  $id = [int](Get-Content $packPid)
  $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
  if ($cim -and $cim.Name -eq 'node.exe' -and $cim.CommandLine -match 'serve-pack\.js') {
    Stop-Process -Id $id -Force
    Write-Output 'Pack server stopped'
  }
  Remove-Item $packPid -ErrorAction SilentlyContinue
}

$proc = $null
if (Test-Path $pidFile) { $proc = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue }
if (-not $proc) { Write-Output 'Server is not running'; Stop-PackServer; exit 0 }

& (Join-Path $PSScriptRoot 'rcon.ps1') 'stop'
if ($proc.WaitForExit(90000)) {
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  Write-Output 'Server stopped'
  Stop-PackServer
} else {
  # Still running: players on it keep their pack server.
  Write-Output "Server did not exit within 90 s (PID $($proc.Id)); check server\logs\latest.log"
  exit 1
}
