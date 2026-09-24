# Starts the LOCAL test server in the background with Minehut-like memory (1 GB).
# Usage: powershell -ExecutionPolicy Bypass -File tools\start-server.ps1
$ErrorActionPreference = 'Stop'
$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\server')).Path
$pidFile = Join-Path $serverDir 'server.pid'

if (Test-Path $pidFile) {
  $old = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
  if ($old -and $old.ProcessName -eq 'java') { Write-Output "Already running (PID $($old.Id))"; exit 0 }
}

$jar = Get-ChildItem $serverDir -Filter 'paper-*.jar' | Sort-Object Name | Select-Object -Last 1
$jvm = @(
  '-Xms1G', '-Xmx1G',
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
