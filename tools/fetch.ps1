# Downloads every file in tools\downloads.json that is missing, then verifies size and hash.
# Usage: powershell -ExecutionPolicy Bypass -File tools\fetch.ps1
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifest = Get-Content (Join-Path $PSScriptRoot 'downloads.json') -Raw | ConvertFrom-Json
$headers = @{ 'User-Agent' = 'donating-local-setup/1.0' }
$bad = 0

foreach ($f in $manifest.files) {
  if ($f.skip_if -and (Test-Path (Join-Path $root $f.skip_if))) {
    Write-Output ('{0,-28} {1,-10} {2}' -f $f.name, $f.version, 'already installed')
    continue
  }
  $dest = Join-Path $root $f.dest
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  if (-not (Test-Path $dest)) {
    Invoke-WebRequest -Uri $f.url -OutFile $dest -Headers $headers -UseBasicParsing
  }
  $size = (Get-Item $dest).Length
  $status = 'OK'
  if ($size -ne [long]$f.size) { $status = "SIZE MISMATCH ($size, expected $($f.size))" }
  elseif ($f.algo) {
    $h = (Get-FileHash $dest -Algorithm $f.algo).Hash.ToLower()
    if ($h -ne $f.hash.ToLower()) { $status = "HASH MISMATCH ($($f.algo))" }
  } else { $status = 'OK (size only, no published hash)' }
  if ($status -notlike 'OK*') {
    $bad++
    Remove-Item $dest -Force
  }
  Write-Output ('{0,-28} {1,-10} {2}' -f $f.name, $f.version, $status)
}
if ($bad) { Write-Output "$bad file(s) failed verification and were deleted"; exit 1 }
