# Starts the LOCAL test server in the background. Memory: 2 GB by default (owner, 2026-09-27: Minehut may go to
# 2-4 GB); -Memory 1G matches Minehut's free plan.
# Usage: powershell -ExecutionPolicy Bypass -File tools\start-server.ps1 [-Memory 2G]
param([string]$Memory = '2G')
$ErrorActionPreference = 'Stop'
$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\server')).Path
$pidFile = Join-Path $serverDir 'server.pid'

function Start-PackServer {
  # The local pack server (tools\serve-pack.js): server.properties points the client at http://127.0.0.1:<port>/pack.zip,
  # and with nothing listening there every join says the pack failed to load (2026-10-03). Started here when the
  # properties use a 127.0.0.1 address and nothing listens on that port yet; it keeps running after the server stops
  # (stop-server.ps1 stops it too). Its log: server\pack-server.log.
  $props = Get-Content (Join-Path $serverDir 'server.properties') -ErrorAction SilentlyContinue
  $packLine = $props | Where-Object { $_ -match '^resource-pack=http\\?://127\.0\.0\.1\\?:(\d+)/' } | Select-Object -First 1
  if ($packLine -and $packLine -match '127\.0\.0\.1\\?:(\d+)/') {
    $port = [int]$Matches[1]
    $zip = (Resolve-Path (Join-Path $PSScriptRoot '..\extras\packs\Donating-pack.zip') -ErrorAction SilentlyContinue)
    $listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
      # One started some other way (by hand, or a session's background task, which ends with that session): adopted
      # when it's serve-pack.js, so stop-server.ps1 stops it; anything else on the port is only reported.
      $owner = ($listening | Select-Object -First 1).OwningProcess
      $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue
      if ($cim -and $cim.CommandLine -match 'serve-pack\.js') {
        Set-Content -Path (Join-Path $serverDir 'pack-server.pid') -Value $owner
        Write-Output "Pack server already listening on 127.0.0.1:$port (PID $owner)"
      } else {
        Write-Output "Port $port is taken by another program (PID $owner): the client can't get the pack from it"
      }
    } elseif (-not $zip) {
      Write-Output "No extras\packs\Donating-pack.zip: build it (tools\build-pack.js), then run this again for the pack server"
    } else {
      $node = (Resolve-Path (Join-Path $PSScriptRoot 'node\node.exe')).Path
      # Start-Process joins the arguments with spaces and the folder has spaces in it: each path quoted.
      $script = Join-Path $PSScriptRoot 'serve-pack.js'
      $pack = Start-Process -FilePath $node -ArgumentList @("`"$script`"", "`"$($zip.Path)`"", $port) `
        -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $serverDir 'pack-server.log') -RedirectStandardError (Join-Path $serverDir 'pack-server.err.log')
      Set-Content -Path (Join-Path $serverDir 'pack-server.pid') -Value $pack.Id
      # Up within 3 s, or say why not (its error log).
      $up = $false
      for ($i = 0; $i -lt 15 -and -not $up; $i++) {
        Start-Sleep -Milliseconds 200
        $up = [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
        if ($pack.HasExited) { break }
      }
      if ($up) { Write-Output "Pack server on http://127.0.0.1:$port/pack.zip (PID $($pack.Id))" }
      else { Write-Output "Pack server did not start: $((Get-Content (Join-Path $serverDir 'pack-server.err.log') -ErrorAction SilentlyContinue) -join ' ')" }
    }
  }
}

if (Test-Path $pidFile) {
  $old = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
  if ($old -and $old.ProcessName -eq 'java') { Write-Output "Already running (PID $($old.Id))"; Start-PackServer; exit 0 }
}

$jar = Get-ChildItem $serverDir -Filter 'paper-*.jar' | Sort-Object Name | Select-Object -Last 1
$jvm = @(
  "-Xms$Memory", "-Xmx$Memory",
  # Aikar's G1 flags (recommended by the Paper docs)
  '-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=200', '-XX:+UnlockExperimentalVMOptions',
  '-XX:+DisableExplicitGC', '-XX:+AlwaysPreTouch', '-XX:G1NewSizePercent=30', '-XX:G1MaxNewSizePercent=40',
  '-XX:G1HeapRegionSize=8M', '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5', '-XX:G1MixedGCCountTarget=4',
  '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90',
  '-XX:SurvivorRatio=32', '-XX:+PerfDisableSharedMem',
  '-XX:MaxTenuringThreshold=1', '-Dusing.aikars.flags=https://mcflags.emc.gs', '-Daikars.new.flags=true'
)
$javaArgs = $jvm + @('-jar', $jar.Name, '--nogui')

$proc = Start-Process -FilePath 'java' -ArgumentList $javaArgs -WorkingDirectory $serverDir -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $serverDir 'console.out.log') `
  -RedirectStandardError (Join-Path $serverDir 'console.err.log') -PassThru
Set-Content -Path $pidFile -Value $proc.Id
Write-Output "Started $($jar.Name) (PID $($proc.Id)). Log: server\logs\latest.log"

Start-PackServer
