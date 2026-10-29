# Backs up the LOCAL server's world and plugin data to a zip in backups\, then uploads it as a release of the
# PRIVATE repo PlaneGlueX/donating-backups (the code repo is public, and the data holds players' last IPs).
# Safe while the server runs: saving is paused over RCON for the zip and turned back on after.
# Never in the zip: server.properties (RCON password), plugins\Tebex (the store key), jars, logs, zz-*.sk.
# Usage: powershell -ExecutionPolicy Bypass -File tools\backup.ps1 [-NoUpload]
# Restore: tools\stop-server.ps1, rename server\world (keep it), gh release download <tag> -R PlaneGlueX/donating-backups,
#          then tar -xf donating-<stamp>.zip -C server (it holds world\, plugins\ and the json lists).
param([switch]$NoUpload, [string]$Repo = 'PlaneGlueX/donating-backups')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverDir = Join-Path $root 'server'
$outDir = Join-Path $root 'backups'
New-Item -ItemType Directory -Force $outDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$zip = Join-Path $outDir "donating-$stamp.zip"

$pidFile = Join-Path $serverDir 'server.pid'
$running = (Test-Path $pidFile) -and (Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue)
$rcon = Join-Path $PSScriptRoot 'rcon.ps1'
if ($running) { & $rcon 'save-off' 'save-all flush'; Start-Sleep -Seconds 3 }
try {
  $items = @('world', 'plugins') + @('whitelist.json', 'ops.json', 'banned-players.json', 'banned-ips.json', 'usercache.json' |
    Where-Object { Test-Path (Join-Path $serverDir $_) })
  $excludes = @('world/session.lock', 'plugins/Tebex', 'plugins/ViaBackwards', 'plugins/spark', 'plugins/bStats',
    'plugins/.paper-remapped', 'plugins/*/libs', 'plugins/*/lib', 'plugins/*/logs', '*.jar', '*.log', 'zz-*.sk') |
    ForEach-Object { '--exclude', $_ }
  & "$env:SystemRoot\System32\tar.exe" -a -c -f $zip -C $serverDir @excludes @items
  if ($LASTEXITCODE -ne 0) { throw "tar failed ($LASTEXITCODE)" }
} finally {
  if ($running) { & $rcon 'save-on' }
}
# The guard against ever shipping the secrets, whatever the exclude list says.
$bad = & "$env:SystemRoot\System32\tar.exe" -t -f $zip | Where-Object { $_ -match '(^|/)(server\.properties|Tebex/)' }
if ($bad) { Remove-Item $zip; throw "secret files in the zip: $bad" }
$mb = [math]::Round((Get-Item $zip).Length / 1MB)
Write-Output "Backup: $zip ($mb MB)"
if ($NoUpload) { exit 0 }
# PowerShell 5.1 turns a native command's stderr into an error under Stop ("repo not found"): go by exit codes.
$ErrorActionPreference = 'Continue'

gh repo view $Repo --json name 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  # --add-readme gives the repo its first commit: a release needs one to point at.
  gh repo create $Repo --private --add-readme --description 'Donating server world and plugin data backups (private: player data)'
  if ($LASTEXITCODE -ne 0) { throw 'could not create the backup repo' }
}
if ((gh repo view $Repo --json visibility -q .visibility) -ne 'PRIVATE') { throw "$Repo is not private: not uploading player data" }
$code = (git -C $root log -1 --format='%h %s')
gh release create "backup-$stamp" $zip -R $Repo --title "Backup $stamp" --notes "World + plugin data, $mb MB. Code at $code. Restore: see tools\backup.ps1 in the donating repo."
if ($LASTEXITCODE -ne 0) { throw 'upload failed (the zip is still in backups\)' }
Write-Output "Uploaded to https://github.com/$Repo/releases/tag/backup-$stamp"
# GitHub keeps every release; locally keep the 2 newest zips.
Get-ChildItem $outDir -Filter 'donating-*.zip' | Sort-Object Name -Descending | Select-Object -Skip 2 | Remove-Item
