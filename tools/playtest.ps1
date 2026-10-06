# The playtest launcher (Playtest.bat in the repo root runs this): everything a local playtest needs, without a
# Claude session. Before a start it checks the plugin jars are there, rebuilds the phone plugin and the resource pack
# when their files changed, starts the server and the pack server (tools\start-server.ps1), waits until the server is
# ready and lists any startup errors; it also stops and restarts it, shows its state, rebuilds the pack for players
# who are on, tails the log, runs console commands (RCON) and opens the Minecraft Launcher.
#
# Double-click Playtest.bat for the menu, or give an action:
#   Playtest.bat play | start [1G|2G] | stop | restart [1G|2G] | status | pack | log | cmd "<console command>" | launcher
# Exit code 0 when the action worked, 1 when it didn't.
param(
  [string]$Action = '',
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest = @()
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverDir = Join-Path $root 'server'
$node = Join-Path $PSScriptRoot 'node\node.exe'
$propsFile = Join-Path $serverDir 'server.properties'
$pidFile = Join-Path $serverDir 'server.pid'
$consoleLog = Join-Path $serverDir 'console.out.log'
$consoleErr = Join-Path $serverDir 'console.err.log'
$latestLog = Join-Path $serverDir 'logs\latest.log'
$packZip = Join-Path $root 'extras\packs\Donating-pack.zip'
$pluginJar = Join-Path $serverDir 'plugins\DonatingPhone.jar'
$script:Interactive = -not $Action
# Startup ERROR lines that only mean the internet wasn't reachable (see Show-StartReport).
$script:InternetErrors = 'Failed to request yggdrasil public key|anti malware hash check|\[PaperVersionFetcher\]|Error obtaining version information|Cannot fetch version info|check for updates'

# What each build reads: a file here newer than the build means it's out of date. MTVehicles rewrites its
# credits.txt at every start, so that one is left out (its text never changes).
$pluginInputs = @(
  (Join-Path $root 'plugin\src'), (Join-Path $root 'plugin\resources'), (Join-Path $PSScriptRoot 'build-plugin.ps1')
)
$packInputs = @(
  (Join-Path $root 'pack'),
  (Join-Path $PSScriptRoot 'build-pack.js'), (Join-Path $PSScriptRoot 'merge-dispatch.js'),
  (Join-Path $PSScriptRoot 'car-wraps.generated.json'),
  (Join-Path $serverDir 'plugins\MTVehicles\vehicles.yml'), (Join-Path $serverDir 'plugins\MTVehicles\config.yml'),
  (Join-Path $serverDir 'plugins\WeaponMechanics\weapons'),
  (Join-Path $root 'extras\packs\wm'), (Join-Path $root 'extras\packs\MTVehicles_Pack_v0.2.3_1.21.4.zip')
)

# ---------- output ----------
function Say([string]$text, [string]$color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Ok([string]$text) { Say "  [ok] $text" Green }
function Note([string]$text) { Say "  ...  $text" Gray }
function Warn([string]$text) { Say "  [!]  $text" Yellow }
function Bad([string]$text) { Say "  [X]  $text" Red }
# A yes/no question; without the menu (an action given) nobody can answer, so it takes $default.
function Ask([string]$question, [bool]$default) {
  if (-not $script:Interactive) { return $default }
  $a = Read-Host "  $question (Y/N)"
  return $a -match '^\s*y'
}
function Can-Redraw {
  try { return -not [Console]::IsOutputRedirected -and [Console]::WindowWidth -gt 20 } catch { return $false }
}

# ---------- files and ports ----------
# server.properties as a table. Values unescaped (it writes "http\://127.0.0.1\:8765"). Holds the RCON password:
# never print the table.
function Get-Props {
  $p = @{}
  if (Test-Path $propsFile) {
    Get-Content $propsFile | ForEach-Object {
      if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)$') { $p[$Matches[1]] = $Matches[2] -replace '\\(.)', '$1' }
    }
  }
  $p
}
function Get-PropInt([string]$name, [int]$default) {
  $v = (Get-Props)[$name]
  if ($v -match '^\d+$') { return [int]$v }
  $default
}

# The server's console output (console.out.log / .err.log), read without locking it while Java writes it. Java
# writes it in the ANSI code page (Windows' default), not UTF-8.
function Read-Shared([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return '' }
  try {
    $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]'ReadWrite, Delete')
    try { return (New-Object IO.StreamReader($fs, [Text.Encoding]::Default)).ReadToEnd() } finally { $fs.Dispose() }
  } catch { return '' }
}

function Test-Listening([int]$port) {
  [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# The newest file under the given files and folders.
function Get-Newest([string[]]$paths) {
  $newest = $null
  foreach ($p in $paths) {
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $files = if (Test-Path -LiteralPath $p -PathType Leaf) { @(Get-Item -LiteralPath $p) }
             else { @(Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue) }
    foreach ($f in $files) { if (-not $newest -or $f.LastWriteTime -gt $newest.LastWriteTime) { $newest = $f } }
  }
  $newest
}
function Get-Relative([string]$path) { $path.Substring($root.Length).TrimStart('\') }

# Why a build is out of date ("" = it isn't).
function Get-Stale([string]$output, [string[]]$inputs) {
  if (-not (Test-Path -LiteralPath $output)) { return 'not built yet' }
  $built = (Get-Item -LiteralPath $output).LastWriteTime
  $newest = Get-Newest $inputs
  if ($newest -and $newest.LastWriteTime -gt $built) { return "changed since the last build: $(Get-Relative $newest.FullName)" }
  ''
}

# ---------- the server process ----------
# The server's Java processes, found by their command line (java -jar paper-....jar), so a stale or missing
# server.pid (after a reboot, or a server started another way) doesn't matter. Since Paper 26.x it's one process,
# tools\jdk25's java.exe (before, the Oracle javapath stub and the JVM it started both matched). Only java.exe: the Minecraft client is javaw.exe, and its command line (which holds
# the login token) is never read here.
function Get-ServerProcs {
  @(Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match '-jar\s+"?[^"\s]*paper-[^"\s]*\.jar' })
}
# The outermost one (what start-server.ps1 started; it exits with the server).
function Get-MainProc($procs) {
  $ids = @($procs | ForEach-Object { $_.ProcessId })
  $outer = @($procs | Where-Object { $ids -notcontains $_.ParentProcessId })
  if ($outer) { return $outer[0] }
  $procs[0]
}
# start-server.ps1 and stop-server.ps1 go by server.pid: point it at the running server.
function Sync-PidFile($procs) {
  if (-not $procs) { Remove-Item $pidFile -ErrorAction SilentlyContinue; return }
  $current = if (Test-Path $pidFile) { (Get-Content $pidFile -Raw).Trim() } else { '' }
  if (@($procs | ForEach-Object { "$($_.ProcessId)" }) -notcontains $current) {
    Set-Content -Path $pidFile -Value (Get-MainProc $procs).ProcessId
  }
}
# stopped | starting | ready | stopping. Ready = it printed "Done (...)!" and RCON listens; stopping = it printed
# "Stopping server" (/stop or /restart in game: the local /restart only stops it). console.out.log is started anew by
# every start-server.ps1; a server started some other way leaves an older run's file there (its first line's time
# isn't this process's start), and then RCON listening for 3 minutes counts as ready.
function Get-ServerState($procs = (Get-ServerProcs)) {
  if (-not $procs) { return 'stopped' }
  $main = Get-MainProc $procs
  $text = Read-Shared $consoleLog
  $rcon = Test-Listening (Get-PropInt 'rcon.port' 25575)
  if (-not (Test-LogIsCurrent $text $main.CreationDate)) {
    if ($rcon -and ((Get-Date) - $main.CreationDate).TotalSeconds -gt 180) { return 'ready' }
    return 'starting'
  }
  if ($text -match 'INFO\]: Stopping server') { return 'stopping' }
  if ($rcon -and $text -match 'Done \([\d.,]+s\)!') { return 'ready' }
  'starting'
}
# Whether console.out.log belongs to the process started at $started: its first line ("[17:52:10 INFO]: ...") within
# 3 minutes of it (times of day: across midnight too). An empty file is the new run's (Java hasn't written yet).
function Test-LogIsCurrent([string]$text, [datetime]$started) {
  $m = [regex]::Match($text, '(?m)^\[(\d\d):(\d\d):(\d\d) ')
  if (-not $m.Success) { return $true }
  $first = [int]$m.Groups[1].Value * 3600 + [int]$m.Groups[2].Value * 60 + [int]$m.Groups[3].Value
  $diff = ($first - [int]$started.TimeOfDay.TotalSeconds + 86400) % 86400
  $diff -le 180 -or $diff -ge 86400 - 5
}
function Test-Ready { (Get-ServerState) -eq 'ready' }
# After "Stopping server": until the process is gone (it saves first).
function Wait-Exit([int]$timeout = 120) {
  for ($i = 0; $i -lt $timeout * 2; $i++) {
    if (-not (Get-ServerProcs)) { Remove-Item $pidFile -ErrorAction SilentlyContinue; return $true }
    Start-Sleep -Milliseconds 500
  }
  $false
}

# Console commands over RCON (tools\rcon.ps1); the output lines, or $null when RCON can't be reached.
function Invoke-Rcon([string[]]$commands) {
  try { return @(& (Join-Path $PSScriptRoot 'rcon.ps1') @commands) } catch { return $null }
}
# Who's online (vanilla's list: EssentialsX's has a different format): an array of names (empty when nobody is on),
# $null only when RCON can't be reached. The leading comma keeps an empty array from turning into $null on return.
function Get-Players {
  $out = Invoke-Rcon @('minecraft:list')
  if ($null -eq $out) { return $null }
  $line = $out | Where-Object { $_ -match 'players online' } | Select-Object -First 1
  if ($line -match 'online:\s*(.*)$') { return , [string[]]@($Matches[1] -split ',\s*' | Where-Object { $_.Trim() }) }
  , [string[]]@()
}

# The last lines of the console output (after a failed start).
function Show-Tail([int]$count = 25) {
  $lines = @((Read-Shared $consoleLog) -split "`r?`n" | Where-Object { $_.Trim() })
  if ($lines) {
    Say "  Last lines of server\console.out.log:" Yellow
    $lines | Select-Object -Last $count | ForEach-Object { Say "    $_" }
  }
  $err = (Read-Shared $consoleErr).Trim()
  if ($err) {
    Say '  server\console.err.log:' Yellow
    $err -split "`r?`n" | Select-Object -Last 10 | ForEach-Object { Say "    $_" }
  }
}

# Waits until the server is ready, showing what it's loading. $false when it stopped or took too long.
function Wait-Ready([int]$timeout = 300) {
  $start = Get-Date
  $redraw = Can-Redraw
  $lastNote = Get-Date
  while ($true) {
    $secs = [int]((Get-Date) - $start).TotalSeconds
    if (-not (Get-ServerProcs)) {
      if ($redraw) { Write-Host '' }
      Bad 'The server stopped while starting.'
      Show-Tail
      return $false
    }
    $text = Read-Shared $consoleLog
    if ($text -match 'Done \(([\d.,]+)s\)!') {
      $took = $Matches[1]
      if ($redraw) { Write-Host '' }
      # RCON comes up a moment before "Done"; wait for it too (the menu's player list needs it).
      for ($i = 0; $i -lt 20 -and -not (Test-Listening (Get-PropInt 'rcon.port' 25575)); $i++) { Start-Sleep -Milliseconds 250 }
      Ok "Server ready (it took $took s)"
      return $true
    }
    if ($secs -gt $timeout) {
      if ($redraw) { Write-Host '' }
      Warn "Still not ready after $timeout s. It may still be loading: check the log (L in the menu)."
      return $false
    }
    # What it's doing: the last "Enabling ..." or "Loading ..." line.
    $doing = ''
    $m = [regex]::Matches($text, '(?m)\]: (\[[^\]]+\] )?((Enabling|Loading|Loaded|Preparing)[^\r\n]*)')
    if ($m.Count) { $doing = $m[$m.Count - 1].Groups[2].Value }
    if ($doing.Length -gt 60) { $doing = $doing.Substring(0, 57) + '...' }
    if ($redraw) {
      $line = "  ...  Starting: $secs s  $doing"
      $w = [Console]::WindowWidth - 1
      if ($line.Length -gt $w) { $line = $line.Substring(0, $w) }
      Write-Host ("`r" + $line.PadRight($w)) -NoNewline
    } elseif (((Get-Date) - $lastNote).TotalSeconds -ge 10) {
      Note "Starting: $secs s  $doing"
      $lastNote = Get-Date
    }
    Start-Sleep -Milliseconds 700
  }
}

# What the startup said: Skript's summary, script errors and every ERROR line. A clean start has none.
function Show-StartReport {
  $lines = @((Read-Shared $consoleLog) -split "`r?`n")
  # Only the start: up to "Done (...)!" (anything after it happened while playing).
  for ($d = 0; $d -lt $lines.Count; $d++) { if ($lines[$d] -match 'INFO\]: Done \([\d.,]+s\)!') { $lines = $lines[0..$d]; break } }
  # Skript logs a script error at INFO: "[Skript] Line 181: (seasons.sk)", the message on the next line, then the
  # script line itself; "All scripts loaded without errors." only comes when there were none.
  $skErr = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '\[Skript\] Line (\d+): \(([^)]+)\)') {
      $where = "$($Matches[2]) line $($Matches[1])"
      $msg = if ($i + 1 -lt $lines.Count) { ($lines[$i + 1] -replace '^\[[^\]]*\]:\s*', '').Trim() } else { '' }
      $skErr += "${where}: $msg"
    }
  }
  # A warning prints the same "Line N: (file.sk)" (only its color differs, lost in this file); "All scripts loaded
  # without errors." still comes when there were only warnings.
  $warnOnly = [bool]($lines -match '\[Skript\] All scripts loaded without errors')
  $loaded = $lines | Where-Object { $_ -match '\[Skript\] (Loaded \d+ scripts.*)$' } | Select-Object -Last 1
  if ($loaded -match '\[Skript\] (Loaded \d+ scripts.*)$') {
    if ($skErr -and -not $warnOnly) { Warn "Skript: $($Matches[1])" } else { Ok "Skript: $($Matches[1]), no errors" }
  } else { Bad 'Skript did not load the scripts (is Skript installed?)' }
  if ($skErr) {
    $color = 'Red'
    if ($warnOnly) {
      Warn "$($skErr.Count) Skript warning(s): the game still works (send them to Claude when convenient):"
      $color = 'Yellow'
    } else {
      Bad "$($skErr.Count) script error(s) or warning(s): the parts of the game in those lines may not work:"
    }
    $skErr | Select-Object -First 10 | ForEach-Object {
      $t = $_
      if ($t.Length -gt 160) { $t = $t.Substring(0, 157) + '...' }
      Say "       $t" $color
    }
    if ($skErr.Count -gt 10) { Say "       ... and $($skErr.Count - 10) more: server\logs\latest.log" $color }
  }
  $errors = @($lines | Where-Object { $_ -match '^\[\d\d:\d\d:\d\d ERROR\]' })
  # Checks that need the internet (Paper's version check, Mojang's key, PlaceholderAPI's list): they fail when the
  # PC starts the server before its network is up, and a local test doesn't need any of them.
  $net = @($errors | Where-Object { $_ -match $script:InternetErrors })
  $errors = @($errors | Where-Object { $_ -notmatch $script:InternetErrors })
  if ($net) { Warn "$($net.Count) internet check(s) failed (Paper's version check and similar): harmless for local tests" }
  if ($skErr -and -not $warnOnly -and -not $errors) { Say '       Send these lines to Claude (they say what broke).' Yellow }
  if ($errors) {
    Bad "$($errors.Count) error line(s) in the startup log (a clean start has none):"
    $errors | Select-Object -First 10 | ForEach-Object {
      $t = $_
      if ($t.Length -gt 160) { $t = $t.Substring(0, 157) + '...' }
      Say "       $t" Red
    }
    if ($errors.Count -gt 10) { Say "       ... and $($errors.Count - 10) more: server\logs\latest.log" Red }
    Say '       Send these lines to Claude (they say what broke).' Yellow
  } elseif (-not $skErr -or $warnOnly) {
    Ok 'No errors in the startup log'
  }
  if (-not ($lines -match '\[DonatingPhone\] Enabling DonatingPhone')) { Bad 'The phone plugin (DonatingPhone) did not load' }
}

# ---------- builds ----------
# Its own PowerShell, so javac's deprecation warnings go to plugin\build\build.log instead of the screen (only the
# errors show when it fails).
function Build-Plugin {
  Note 'Building the phone plugin (plugin\ into server\plugins\DonatingPhone.jar)...'
  $before = if (Test-Path $pluginJar) { (Get-Item $pluginJar).LastWriteTime } else { $null }
  $eap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-plugin.ps1') 2>&1 | ForEach-Object { "$_" })
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $eap }
  $log = Join-Path $root 'plugin\build\build.log'
  try { New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null; Set-Content -Path $log -Value $out -Encoding UTF8 } catch {}
  $jar = Get-Item $pluginJar -ErrorAction SilentlyContinue
  if ($code -eq 0 -and $jar -and $jar.LastWriteTime -ne $before) {
    Ok "Phone plugin built ($([int]($jar.Length / 1KB)) KB)"
    return $true
  }
  Bad "The phone plugin didn't build (the whole output: plugin\build\build.log):"
  $shown = @($out | Where-Object { $_ -match '\berror\b|Exception|failed|not found' -and $_ -notmatch 'warning:' })
  if (-not $shown) { $shown = $out }
  $shown | Select-Object -Last 15 | ForEach-Object { Say "       $_" Red }
  $false
}

function Build-Pack {
  # The car wraps' models are generated (gitignored: MTVehicles' geometry isn't ours to publish); build-pack.js
  # stops without them.
  $eap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $wraps = Join-Path $root 'pack\assets\minecraft\models\custom\wraps'
    if (-not (Test-Path $wraps) -or -not (Get-ChildItem $wraps -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
      Note 'Generating the car wraps first (tools\make-car-wraps.js)...'
      $out = & $node (Join-Path $PSScriptRoot 'make-car-wraps.js') 2>&1
      if ($LASTEXITCODE -ne 0) { Bad 'make-car-wraps.js failed:'; $out | ForEach-Object { Say "       $_" Red }; return $false }
    }
    Note 'Building the resource pack (pack\ into extras\packs\Donating-pack.zip)...'
    $out = @(& $node (Join-Path $PSScriptRoot 'build-pack.js') 2>&1 | ForEach-Object { "$_" })
    if ($LASTEXITCODE -ne 0) {
      Bad 'The resource pack did not build:'
      # Node's message without its stack frames (and PowerShell's wrapper lines around stderr).
      $useful = @($out | Where-Object { $_.Trim() -and $_ -notmatch '^\s+at |RemoteException|^\s*\^+\s*$|^Node\.js v' })
      if (-not $useful) { $useful = $out }
      $useful | Select-Object -Last 10 | ForEach-Object { Say "       $_" Red }
      return $false
    }
    $zip = Get-Item $packZip
    Ok ("Resource pack built ({0:N1} MB)" -f ($zip.Length / 1MB))
    return $true
  } finally { $ErrorActionPreference = $eap }
}

# The plugin jars tools\fetch.ps1 knows (tools\downloads.json). $false when something's missing and the owner
# didn't get it. -AfterFetch: the check after a download (no second offer to download).
function Test-Jars([switch]$AfterFetch) {
  $paper = Get-ChildItem $serverDir -Filter 'paper-*.jar' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $paper) { Bad 'No paper-*.jar in server\ (Paper 26.1.2: tools\downloads.json).'; return $false }
  $manifest = Get-Content (Join-Path $PSScriptRoot 'downloads.json') -Raw | ConvertFrom-Json
  $missing = @(); $manual = @()
  foreach ($f in $manifest.files) {
    if ($f.skip_if -and (Test-Path (Join-Path $root $f.skip_if))) { continue }
    if (Test-Path (Join-Path $root $f.dest)) { continue }
    if ($f.manual) { $manual += $f } else { $missing += $f }
  }
  foreach ($f in $manual) { Bad "Missing $($f.dest): download it by hand from $($f.url)" }
  if ($missing) {
    Warn "Missing: $(($missing | ForEach-Object { $_.dest }) -join ', ')"
    if (-not $AfterFetch -and (Ask 'Download them now with tools\fetch.ps1 (official links, checked against their hashes)?' $false)) {
      # Its report on the screen, never into this function's answer (that would make a "no" below count as yes).
      try { & (Join-Path $PSScriptRoot 'fetch.ps1') | ForEach-Object { Note $_ } }
      catch { Bad "The download failed: $($_.Exception.Message) (is the internet connected?)"; return $false }
      return ((Test-Jars -AfterFetch | Select-Object -Last 1) -eq $true)
    }
    return ((Ask 'Start without them?' $false) -eq $true)
  }
  if ($manual) { return ((Ask 'Start without them?' $false) -eq $true) }
  Ok 'Server and plugin jars present'
  $true
}

# ---------- actions ----------
function Start-All([string]$memory = '2G') {
  Say 'Starting the Donating test server' Cyan
  $procs = Get-ServerProcs
  if ($procs -and (Get-ServerState $procs) -eq 'stopping') {
    Note 'The server is stopping (it saves first); it starts again once it has.'
    if (-not (Wait-Exit)) { Bad 'It has not stopped after 2 minutes: check the log (L).'; return $false }
    $procs = @()
  }
  if ($procs) {
    Sync-PidFile $procs
    # start-server.ps1 on a running server only starts the pack server if it's down.
    & (Join-Path $PSScriptRoot 'start-server.ps1') | ForEach-Object { Note $_ }
    $ready = (Test-Ready) -or (Wait-Ready)
    if ($ready) {
      Ok 'The server was already running'
      Show-Builds $procs -Quiet
      Show-Ready
    }
    return $ready
  }
  if (-not (Test-Path $propsFile)) {
    Bad 'server\server.properties is missing (it is local only, never in git: offline mode, RCON, the pack address).'
    return $false
  }
  if (-not (Test-Path (Join-Path $PSScriptRoot 'jdk25\bin\java.exe'))) { Bad 'Java 25 is missing: tools\jdk25 (Paper 26.x needs it; tools\downloads.json).'; return $false }
  $port = Get-PropInt 'server-port' 25565
  $taken = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($taken) {
    $who = (Get-Process -Id $taken.OwningProcess -ErrorAction SilentlyContinue).ProcessName
    Bad "Port $port is already used by another program ($who, PID $($taken.OwningProcess)). Close it first."
    return $false
  }
  if ((Test-Jars | Select-Object -Last 1) -ne $true) { return $false }

  $why = Get-Stale $pluginJar $pluginInputs
  if ($why) {
    Note "The phone plugin is out of date ($why)"
    if (-not (Build-Plugin)) {
      if (-not (Test-Path $pluginJar)) { return $false }
      if (-not (Ask 'Start with the old phone plugin?' $true)) { return $false }
      Warn 'Starting with the old phone plugin'
    }
  } else { Ok 'Phone plugin up to date' }

  $why = Get-Stale $packZip $packInputs
  if ($why) {
    Note "The resource pack is out of date ($why)"
    if (-not (Build-Pack)) {
      if (Test-Path $packZip) { Warn 'Starting with the old resource pack' }
      else { Warn 'Starting with no resource pack: every join will say the pack failed to load' }
    }
  } else { Ok 'Resource pack up to date' }

  Remove-Item $pidFile -ErrorAction SilentlyContinue
  $args2 = @{}
  if ($memory) { $args2['Memory'] = $memory }
  & (Join-Path $PSScriptRoot 'start-server.ps1') @args2 | ForEach-Object { Note $_ }
  if (-not (Wait-Ready)) { return $false }
  Show-StartReport
  Show-Ready
  $true
}

# The pack server and how to join.
function Show-Ready {
  $url = (Get-Props)['resource-pack']
  if ($url -match '127\.0\.0\.1:(\d+)/') {
    if (Test-Listening ([int]$Matches[1])) { Ok "Resource pack served at $url" }
    else { Bad "Nothing serves the resource pack at $url (every join will say it failed to load)" }
  }
  Say ''
  Say '  READY: in Minecraft, Multiplayer > Direct Connection > localhost' Green
}

function Stop-All {
  $procs = Get-ServerProcs
  if (-not $procs) {
    Say 'The server is not running.'
    & (Join-Path $PSScriptRoot 'stop-server.ps1') | Where-Object { $_ -notmatch 'not running' } | ForEach-Object { Note $_ }
    return $true
  }
  Sync-PidFile $procs
  if ((Get-ServerState $procs) -eq 'stopping') {
    Note 'The server is already stopping (it saves first)...'
    if (-not (Wait-Exit)) { return (Stop-Kill) }
    & (Join-Path $PSScriptRoot 'stop-server.ps1') | Where-Object { $_ -notmatch 'not running' } | ForEach-Object { Note $_ }
    Ok 'Server stopped'
    return $true
  }
  if (-not (Test-Listening (Get-PropInt 'rcon.port' 25575))) {
    # RCON comes up near the end of a start: stopping has to wait for it.
    Note 'The server is still starting; it can be stopped once it is up.'
    if (-not (Wait-Ready)) {
      if (-not (Get-ServerProcs)) { return $true }
      return (Stop-Kill)
    }
  }
  $players = Get-Players
  if ($players -and $players.Count) {
    if (-not (Ask "$($players.Count) online ($($players -join ', ')). Stop anyway?" $true)) { return $false }
  }
  Say 'Stopping the server (it saves first; up to a minute)...' Cyan
  try { & (Join-Path $PSScriptRoot 'stop-server.ps1') | ForEach-Object { Note $_ } } catch { Bad $_.Exception.Message }
  if (Get-ServerProcs) { return (Stop-Kill) }
  Ok 'Server stopped'
  $true
}

# The last resort for a server that won't stop.
function Stop-Kill {
  Bad "The server didn't stop."
  if (-not (Ask 'Force it closed? Anything since its last autosave (up to 5 minutes) is lost' $false)) { return $false }
  foreach ($p in (Get-ServerProcs)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 1
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  & (Join-Path $PSScriptRoot 'stop-server.ps1') | Where-Object { $_ -notmatch 'not running' } | ForEach-Object { Note $_ }
  if (Get-ServerProcs) { Bad 'It is still running.'; return $false }
  Warn 'Server forced closed'
  $true
}

function Restart-All([string]$memory = '2G') {
  if (-not (Stop-All)) { return $false }
  Say ''
  Start-All $memory
}

# Whether what runs (or would run) is the newest: the pack, the phone plugin, and the scripts (a running server
# loaded its scripts when it started). -Quiet: only what's out of date.
function Show-Builds($procs, [switch]$Quiet) {
  $why = Get-Stale $packZip $packInputs
  if ($why) {
    if ($procs) { Warn "Resource pack out of date ($why): K rebuilds it" }
    else { Warn "Resource pack out of date ($why): the next start rebuilds it" }
  } elseif (-not $Quiet) { Ok ("Resource pack up to date (built {0:g})" -f (Get-Item $packZip).LastWriteTime) }

  $why = Get-Stale $pluginJar $pluginInputs
  $started = if ($procs) { (Get-MainProc $procs).CreationDate } else { $null }
  if ($why) {
    if ($procs) { Warn "Phone plugin out of date ($why): R (restart) rebuilds it" }
    else { Warn "Phone plugin out of date ($why): the next start rebuilds it" }
  } elseif ($started -and (Get-Item $pluginJar).LastWriteTime -gt $started) {
    Warn 'Phone plugin rebuilt since the server started: R (restart) loads it'
  } elseif (-not $Quiet) { Ok 'Phone plugin up to date' }

  if ($started) {
    $sk = Get-Newest @(Join-Path $serverDir 'plugins\Skript\scripts')
    if ($sk -and $sk.LastWriteTime -gt $started) { Warn "Scripts changed since the server started ($($sk.Name)): R (restart) loads them" }
  }
}

function Show-Status {
  Say 'Status' Cyan
  $procs = Get-ServerProcs
  if ($procs) {
    $main = Get-MainProc $procs
    $mb = ($procs | Measure-Object -Property WorkingSetSize -Maximum).Maximum / 1MB
    $up = (Get-Date) - $main.CreationDate
    $upText = if ($up.TotalHours -ge 1) { '{0}h {1:D2}m' -f [int][Math]::Floor($up.TotalHours), $up.Minutes } else { '{0}m {1:D2}s' -f $up.Minutes, $up.Seconds }
    if (Test-Ready) {
      Ok ("Server running for {0}, {1:N0} MB of memory (PID {2})" -f $upText, $mb, $main.ProcessId)
      $players = Get-Players
      if ($null -eq $players) { Warn 'RCON did not answer' }
      elseif ($players.Count) { Ok "$($players.Count) online: $($players -join ', ')" }
      else { Ok 'Nobody online' }
      # Paper's /tps: "TPS from last 1m, 5m, 15m: 19.9, 20.0, 20.0".
      $tps = Invoke-Rcon @('tps') | Where-Object { $_ -match '^TPS from' } | Select-Object -First 1
      if ($tps -match ':\s*\*?([\d.]+)') {
        $t = [double]$Matches[1]
        if ($t -ge 18) { Ok "Speed: $t ticks a second over the last minute (20 is full speed)" }
        else { Warn "Speed: $t ticks a second over the last minute (20 is full speed: it's lagging)" }
      }
    } elseif ((Get-ServerState $procs) -eq 'stopping') {
      Warn 'Server stopping (it saves first)'
    } else {
      Warn "Server starting (for $upText)"
    }
  } else {
    Say '  [ ]  Server stopped' Gray
  }

  $url = (Get-Props)['resource-pack']
  if ($url -match '127\.0\.0\.1:(\d+)/') {
    if (Test-Listening ([int]$Matches[1])) { Ok "Pack server on $url" }
    elseif ($procs) { Bad "No pack server on $url (Start again starts it)" }
    else { Say "  [ ]  Pack server stopped (it starts with the server)" Gray }
  }

  Show-Builds $procs

  if (Get-MinecraftWindow) { Ok 'Minecraft is open' } else { Say '  [ ]  Minecraft is closed (M opens the launcher)' Gray }

  $eap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $branch = (& git -C $root rev-parse --abbrev-ref HEAD 2>$null)
    $commit = (& git -C $root log -1 --format='%h %s' 2>$null)
    if ($branch) {
      if ($commit.Length -gt 70) { $commit = $commit.Substring(0, 67) + '...' }
      Say "  Code: $branch @ $commit" Gray
    }
  } catch {} finally { $ErrorActionPreference = $eap }
  $true
}

# Rebuilds the pack; players online get it at once (/zzpack, a local test helper), everyone else at their next join.
function Update-Pack {
  Say 'Rebuilding the resource pack' Cyan
  if (-not (Build-Pack)) { return $false }
  $procs = Get-ServerProcs
  if (-not $procs) { Ok 'It loads at the next start'; return $true }
  Sync-PidFile $procs
  & (Join-Path $PSScriptRoot 'start-server.ps1') | Where-Object { $_ -notmatch '^Already running' } | ForEach-Object { Note $_ }
  $players = Get-Players
  if (-not $players) { Ok 'Nobody online: players get it when they join'; return $true }
  foreach ($name in $players) {
    $out = Invoke-Rcon @("zzpack $name")
    if ($out -match 'PACK sent') { Ok "Sent to $name" } else { Warn "Couldn't send it to ${name}: rejoin to get it" }
  }
  $true
}

function Get-MinecraftWindow {
  Get-Process javaw -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like 'Minecraft*' } | Select-Object -First 1
}

function Open-Launcher {
  if (Get-MinecraftWindow) { Ok 'Minecraft is already open: Multiplayer > Direct Connection > localhost'; return $true }
  $app = $null
  try {
    $apps = @(Get-StartApps)
    $app = $apps | Where-Object { $_.Name -eq 'Minecraft Launcher' } | Select-Object -First 1
    if (-not $app) { $app = $apps | Where-Object { $_.Name -eq 'Minecraft: Java Edition' } | Select-Object -First 1 }
  } catch {}
  if ($app) {
    Start-Process explorer.exe "shell:AppsFolder\$($app.AppID)"
  } elseif (Test-Path 'C:\XboxGames\Minecraft Launcher\Content\Minecraft.exe') {
    Start-Process 'C:\XboxGames\Minecraft Launcher\Content\Minecraft.exe'
  } else {
    Bad "Couldn't find the Minecraft Launcher"
    return $false
  }
  Ok 'Opening the Minecraft Launcher: Play (Java Edition), then Multiplayer > Direct Connection > localhost'
  $true
}

function Open-LogWindow {
  Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", 'watchlog')
  Ok 'The server log opened in a new window (close it when done)'
  $true
}

# Follows server\logs\latest.log like tail -f, also across restarts (log4j starts a new file), without keeping it
# open between reads (an open handle could stop log4j renaming it).
function Watch-Log {
  try { $Host.UI.RawUI.WindowTitle = 'Donating server log' } catch {}
  Say 'Server log (server\logs\latest.log). Close this window to stop watching.' Cyan
  # A new file is told apart by its first bytes (log4j starts each with the time it started), compared as bytes as
  # far as both reach: a young log still growing keeps its start. A decoder kept between reads, so a character split
  # across two reads still comes out whole.
  $pos = -1; $head = ''; $partial = ''; $skipFirst = $false; $announce = $false
  $decoder = [Text.Encoding]::UTF8.GetDecoder()
  while ($true) {
    $chunk = $null
    try {
      $fs = [IO.File]::Open($latestLog, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]'ReadWrite, Delete')
      try {
        $len = $fs.Length
        $hb = New-Object byte[] ([int][Math]::Min($len, 64))
        $hn = $fs.Read($hb, 0, $hb.Length)
        $h = if ($hn) { [BitConverter]::ToString($hb, 0, $hn) } else { '' }
        $same = if ($h.Length -ge $head.Length) { $h.StartsWith($head) } else { $head.StartsWith($h) }
        if ($pos -lt 0) {
          # The first look: about the last 40 lines, from the start of a line.
          $pos = [Math]::Max(0, $len - 6000); $head = $h; $skipFirst = $pos -gt 0
        } elseif (-not $same -or $len -lt $pos) {
          # Said once the new file has text: log4j also starts a new file at midnight while the server runs.
          $pos = 0; $head = $h; $partial = ''; $skipFirst = $false; $announce = $true
          $decoder = [Text.Encoding]::UTF8.GetDecoder()
        } elseif ($h.Length -gt $head.Length) { $head = $h }
        if ($len -gt $pos) {
          $fs.Seek($pos, [IO.SeekOrigin]::Begin) | Out-Null
          $buf = New-Object byte[] ($len - $pos)
          $n = 0
          while ($n -lt $buf.Length) { $r = $fs.Read($buf, $n, $buf.Length - $n); if ($r -le 0) { break }; $n += $r }
          $chars = New-Object char[] ($decoder.GetCharCount($buf, 0, $n, $false))
          $cn = $decoder.GetChars($buf, 0, $n, $chars, 0, $false)
          $chunk = [string]::new($chars, 0, $cn)
          $pos += $n
        }
      } finally { $fs.Dispose() }
    } catch { }
    if ($chunk -and $skipFirst) {
      $nl = $chunk.IndexOf("`n")
      if ($nl -ge 0) { $chunk = $chunk.Substring($nl + 1); $skipFirst = $false } else { $chunk = '' }
    }
    if ($chunk -and $announce) {
      # A fresh start's log begins with "[bootstrap] Running Java".
      $first = $chunk.Substring(0, [Math]::Min(300, $chunk.Length))
      if ($first -match 'Running Java') { Say '---------- new log: the server started again ----------' Cyan }
      else { Say '---------- new log file (a new day; the server is still running) ----------' Cyan }
      $announce = $false
    }
    if ($chunk) {
      $lines = @(($partial + $chunk) -split "`r?`n")
      $partial = $lines[-1]
      # Everything but the last piece (it has no line end yet: it waits for the rest).
      $whole = if ($lines.Count -gt 1) { $lines[0..($lines.Count - 2)] } else { @() }
      foreach ($l in $whole) {
        if (-not $l) { continue }
        $c = if ($l -match '/ERROR\]') { 'Red' } elseif ($l -match '/WARN\]') { 'Yellow' }
             elseif ($l -match 'Chat Thread') { 'White' } elseif ($l -match 'joined the game|left the game') { 'Cyan' } else { 'Gray' }
        Write-Host $l -ForegroundColor $c
      }
    }
    Start-Sleep -Milliseconds 400
  }
}

function Invoke-Commands([string]$command) {
  if (-not (Test-Listening (Get-PropInt 'rcon.port' 25575))) { Bad 'The server is not running (or still starting).'; return $false }
  if ($command) {
    $out = Invoke-Rcon @($command.Trim().TrimStart('/'))
    if ($null -eq $out) { Bad 'RCON did not answer'; return $false }
    $out | ForEach-Object { Say $_ }
    return $true
  }
  Say 'Console commands, as the server console (no / needed). Some plugins answer only in the log (L). Empty line: back.' Cyan
  while ($true) {
    $c = Read-Host '  >'
    if (-not $c -or -not $c.Trim()) { return $true }
    $out = Invoke-Rcon @($c.Trim().TrimStart('/'))
    if ($null -eq $out) { Bad 'RCON did not answer (did the server stop?)'; return $false }
    $out | Select-Object -Skip 1 | ForEach-Object { Say "  $_" White }
  }
}

function Get-Memory {
  $m = $Rest | Where-Object { $_ -match '^\d+[MmGg]$' } | Select-Object -First 1
  if ($m) { return $m.ToUpper() }
  '2G'
}

# ---------- the menu ----------
function Show-Menu {
  $procs = Get-ServerProcs
  $state = 'STOPPED'
  $color = 'Gray'
  switch (Get-ServerState $procs) {
    'ready' {
      $players = Get-Players
      $state = 'RUNNING'
      if ($players -and $players.Count) { $state += " - $($players.Count) online: $($players -join ', ')" }
      elseif ($null -ne $players) { $state += ' - nobody online' }
      $color = 'Green'
    }
    'starting' { $state = 'STARTING'; $color = 'Yellow' }
    'stopping' { $state = 'STOPPING'; $color = 'Yellow' }
  }
  Say ''
  Say '  ================================================' DarkCyan
  Say '   DONATING - local playtest' Cyan
  Say '  ================================================' DarkCyan
  Write-Host '   Server: ' -NoNewline -ForegroundColor Gray
  Say $state $color
  Say ''
  Say '   [P] Play: start everything and open Minecraft' White
  Say '   [S] Start the server'
  Say '   [X] Stop the server'
  Say '   [R] Restart the server (rebuilds what changed)'
  Say '   [I] Status'
  Say '   [K] Rebuild the resource pack (and send it to everyone on)'
  Say '   [L] Server log (opens a window)'
  Say '   [C] Console commands'
  Say '   [M] Open the Minecraft Launcher'
  Say '   [Q] Quit'
  Say ''
}

function Read-Choice {
  try { $Host.UI.RawUI.FlushInputBuffer() } catch {}
  Write-Host '  Choose: ' -NoNewline -ForegroundColor White
  try {
    # Enter, arrows, Shift and the like are skipped: only a letter chooses.
    do { $k = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') } until ([char]::IsLetterOrDigit($k.Character))
    Write-Host $k.Character
    return "$($k.Character)".ToUpper()
  } catch {
    return (Read-Host).Trim().ToUpper()
  }
}

function Run-Menu {
  try { $Host.UI.RawUI.WindowTitle = 'Donating playtest' } catch {}
  Say ''
  Say '  Closing this window leaves the server running in the background: X stops it.' DarkGray
  while ($true) {
    Show-Menu
    $choice = Read-Choice
    Say ''
    try {
      switch ($choice) {
        'P' { if (Start-All (Get-Memory)) { Open-Launcher | Out-Null } }
        'S' { Start-All (Get-Memory) | Out-Null }
        'X' { Stop-All | Out-Null }
        'R' { Restart-All (Get-Memory) | Out-Null }
        'I' { Show-Status | Out-Null }
        'K' { Update-Pack | Out-Null }
        'L' { Open-LogWindow | Out-Null }
        'C' { Invoke-Commands '' | Out-Null }
        'M' { Open-Launcher | Out-Null }
        'Q' {
          if (Get-ServerProcs) {
            if (Ask 'The server is still running. Stop it too?' $false) { if (-not (Stop-All)) { continue } }
            else { Say '  It keeps running in the background. Open Playtest.bat again to stop it.' Gray }
          }
          return
        }
        default { if ($choice) { Say "  No option '$choice'." Gray } }
      }
    } catch {
      Bad "Something went wrong: $($_.Exception.Message)"
      Say "       ($($_.InvocationInfo.ScriptName | Split-Path -Leaf) line $($_.InvocationInfo.ScriptLineNumber))" DarkGray
    }
  }
}

$ok = $true
switch ($Action.ToLower()) {
  ''         { Run-Menu }
  'play'     { $ok = Start-All (Get-Memory); if ($ok) { $ok = Open-Launcher } }
  'start'    { $ok = Start-All (Get-Memory) }
  'stop'     { $ok = Stop-All }
  'restart'  { $ok = Restart-All (Get-Memory) }
  'status'   { $ok = Show-Status }
  'pack'     { $ok = Update-Pack }
  'log'      { $ok = Open-LogWindow }
  'watchlog' { Watch-Log }
  'cmd'      { $ok = Invoke-Commands ($Rest -join ' ') }
  'launcher' { $ok = Open-Launcher }
  default    { Say "Unknown action '$Action'. Use: play | start [1G|2G] | stop | restart | status | pack | log | cmd ""<command>"" | launcher" Yellow; $ok = $false }
}
if ($ok) { exit 0 } else { exit 1 }
