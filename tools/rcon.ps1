# Minimal RCON client for the LOCAL test server (reads port/password from server.properties).
# Usage: powershell -ExecutionPolicy Bypass -File tools\rcon.ps1 "list" "sk reload core"
param(
  [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)][string[]]$Command
)
$ErrorActionPreference = 'Stop'
$serverDir = Join-Path $PSScriptRoot '..\server'

$props = @{}
Get-Content (Join-Path $serverDir 'server.properties') | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)$') { $props[$matches[1]] = $matches[2] }
}
$port = [int]$props['rcon.port']
$pass = $props['rcon.password']

$client = New-Object System.Net.Sockets.TcpClient
$client.Connect('127.0.0.1', $port)
$stream = $client.GetStream()
$stream.ReadTimeout = 60000

function Send-Packet([int]$id, [int]$type, [string]$body) {
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $len = 4 + 4 + $bodyBytes.Length + 2
  $buf = New-Object byte[] (4 + $len)
  [BitConverter]::GetBytes([int]$len).CopyTo($buf, 0)
  [BitConverter]::GetBytes([int]$id).CopyTo($buf, 4)
  [BitConverter]::GetBytes([int]$type).CopyTo($buf, 8)
  $bodyBytes.CopyTo($buf, 12)
  $stream.Write($buf, 0, $buf.Length)
}

function Read-Exact([int]$n) {
  $buf = New-Object byte[] $n
  $off = 0
  while ($off -lt $n) {
    $r = $stream.Read($buf, $off, $n - $off)
    if ($r -le 0) { throw 'RCON connection closed' }
    $off += $r
  }
  return , $buf
}

function Read-Packet {
  $len = [BitConverter]::ToInt32((Read-Exact 4), 0)
  $data = Read-Exact $len
  [pscustomobject]@{
    Id   = [BitConverter]::ToInt32($data, 0)
    Type = [BitConverter]::ToInt32($data, 4)
    Body = [System.Text.Encoding]::UTF8.GetString($data, 8, $len - 10)
  }
}

Send-Packet 1 3 $pass
if ((Read-Packet).Id -eq -1) { throw 'RCON auth failed (check rcon.password in server.properties)' }

$section = [string][char]0x00A7
$id = 100
foreach ($cmd in $Command) {
  $id += 2
  Send-Packet $id 2 $cmd
  $out = New-Object System.Text.StringBuilder
  # The server reads one packet per socket read and drops the connection if two arrive together,
  # so the end marker goes out only after the first reply. The server answers the unknown packet
  # type with "Unknown request" after the command's (possibly multi-packet) reply.
  [void]$out.Append((Read-Packet).Body)
  Send-Packet ($id + 1) 0 ''
  while ($true) {
    $p = Read-Packet
    if ($p.Id -eq $id + 1) { break }
    [void]$out.Append($p.Body)
  }
  $text = [regex]::Replace($out.ToString(), [regex]::Escape($section) + '.', '')
  Write-Output "> $cmd"
  if ($text.Trim()) { Write-Output $text.TrimEnd() }
}
$client.Close()
