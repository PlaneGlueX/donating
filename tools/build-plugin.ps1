# Builds the Donating phone plugin (plugin\) into server\plugins\DonatingPhone.jar.
# No Gradle/Maven: plain javac + jar from the portable JDK 25 (tools\jdk25: Paper 26.x's API is Java 25 class
# files, which JDK 21's javac can't read), compiled against the Paper API and the libraries Paper already
# downloaded into server\libraries.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-plugin.ps1
# Then restart the server (plugins can't be reloaded safely). On Minehut: upload the jar with the
# File Manager to plugins/.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$jdk = Join-Path $root 'tools\jdk25\bin'
if (-not (Test-Path (Join-Path $jdk 'javac.exe'))) { throw "JDK 25 missing: $jdk (tools\downloads.json)" }
$src = Join-Path $root 'plugin\src'
$res = Join-Path $root 'plugin\resources'
$build = Join-Path $root 'plugin\build'
$out = Join-Path $root 'server\plugins\DonatingPhone.jar'

$libs = Get-ChildItem (Join-Path $root 'server\libraries') -Recurse -Filter *.jar | ForEach-Object FullName
$api = @($libs | Where-Object { $_ -match 'paper-api' })
if (-not $api) { throw 'paper-api jar not found under server\libraries (start the server once first)' }
if ($api.Count -gt 1) { throw "more than one paper-api under server\libraries: $($api -join ', ')" }
# TAB's API (Nametags.java; TAB is a soft dependency at runtime).
$tab = Get-ChildItem (Join-Path $root 'server\plugins') -Filter 'TAB-*.jar' | Select-Object -First 1
if (-not $tab) { throw 'TAB-*.jar not found in server\plugins (Nametags.java compiles against its API)' }
$libs = @($libs) + $tab.FullName
# WeaponMechanics' API (GunFx.java listens to its reload, equip and firearm events; a soft dependency at runtime).
foreach ($p in 'WeaponMechanics-*.jar', 'MechanicsCore-*.jar') {
  $j = Get-ChildItem (Join-Path $root 'server\plugins') -Filter $p | Select-Object -First 1
  if (-not $j) { throw "$p not found in server\plugins (GunFx.java compiles against its API)" }
  $libs += $j.FullName
}
$classpath = $libs -join ';'

if (Test-Path $build) { Remove-Item -Recurse -Force $build }
New-Item -ItemType Directory -Force (Join-Path $build 'classes') | Out-Null
$sources = Get-ChildItem $src -Recurse -Filter *.java | ForEach-Object FullName
if (-not $sources) { throw "no .java files under $src" }
$argsFile = Join-Path $build 'sources.txt'
# javac reads @argfiles; quote each path (they contain spaces).
$sources | ForEach-Object { '"' + ($_ -replace '\\', '/') + '"' } | Set-Content -Encoding ascii $argsFile

& "$jdk\javac.exe" --release 21 -proc:none -encoding UTF-8 -Xlint:deprecation -cp $classpath -d (Join-Path $build 'classes') "@$argsFile"
if ($LASTEXITCODE -ne 0) { throw "javac failed ($LASTEXITCODE)" }
Copy-Item (Join-Path $res '*') (Join-Path $build 'classes') -Recurse -Force
& "$jdk\jar.exe" --create --file $out -C (Join-Path $build 'classes') .
if ($LASTEXITCODE -ne 0) { throw "jar failed ($LASTEXITCODE)" }
$item = Get-Item $out
"Built $($item.FullName) ($($item.Length) bytes)"
