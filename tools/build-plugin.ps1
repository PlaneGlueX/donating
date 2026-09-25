# Builds the Donating phone plugin (plugin\) into server\plugins\DonatingPhone.jar.
# No Gradle/Maven: plain javac + jar from the local JDK 21, compiled against the Paper API and the
# libraries Paper already downloaded into server\libraries.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-plugin.ps1
# Then restart the server (plugins can't be reloaded safely). On Minehut: upload the jar with the
# File Manager to plugins/.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$jdk = 'C:\Program Files\Java\jdk-21.0.12.1\bin'
$src = Join-Path $root 'plugin\src'
$res = Join-Path $root 'plugin\resources'
$build = Join-Path $root 'plugin\build'
$out = Join-Path $root 'server\plugins\DonatingPhone.jar'

$libs = Get-ChildItem (Join-Path $root 'server\libraries') -Recurse -Filter *.jar | ForEach-Object FullName
if (-not ($libs | Where-Object { $_ -match 'paper-api' })) { throw 'paper-api jar not found under server\libraries (start the server once first)' }
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
