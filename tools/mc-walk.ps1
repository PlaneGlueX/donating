# Walks the owner's client along a route in one call, for computer-use playtests. Does nothing unless Minecraft is in front.
# tools\mc-walk.ps1 "y-90 w2.5 y90 r3 n1.5 j w1 rc"
#   y<deg> turn by deg   p<deg> look up/down to deg   w<s> walk   r<s> sprint   n<s> sneak-walk   b<s> back
#   a<s> d<s> strafe   wa<s> wd<s> ba<s> bd<s> two keys (steering a car)   j<s> walk and jump   sh us keep holding or let go of sneak   f<x>,<y>,<z> look at a point   rc lc click   rh<s> hold right-click   lh<s> hold left-click   z<s> wait
param([Parameter(Mandatory)][string]$Route, [string]$Player = 'Explosde')
Add-Type -Namespace W -Name K3 -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint x, uint y, uint data, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(System.IntPtr h, System.Text.StringBuilder s, int n);
'@
$keys = @{ w = @(0x57, 0x11); s = @(0x53, 0x1F); a = @(0x41, 0x1E); d = @(0x44, 0x20); shift = @(0xA0, 0x2A); ctrl = @(0xA2, 0x1D); space = @(0x20, 0x39) }
function Press($k) { [W.K3]::keybd_event($keys[$k][0], $keys[$k][1], 0, [UIntPtr]::Zero) }
function Lift($k) { [W.K3]::keybd_event($keys[$k][0], $keys[$k][1], 2, [UIntPtr]::Zero) }
function Hold([string[]]$held, [double]$secs) {
  try { foreach ($k in $held) { Press $k }; Start-Sleep -Milliseconds ([int]($secs * 1000)) }
  finally { foreach ($k in $held) { Lift $k } }
}
function Rcon([string]$cmd) { & "$PSScriptRoot\rcon.ps1" $cmd | Out-Null }
function Mouse([uint32]$down, [uint32]$up, [double]$secs) {
  try { [W.K3]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds ([int]($secs * 1000)) }
  finally { [W.K3]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero) }
}
try {
foreach ($t in $Route -split '\s+') {
  $sb = New-Object System.Text.StringBuilder 256
  [void][W.K3]::GetWindowText([W.K3]::GetForegroundWindow(), $sb, 256)
  if (-not $sb.ToString().StartsWith('Minecraft')) { Write-Output "STOPPED before $t`: Minecraft is not in front"; exit 1 }
  if ($t -eq 'sh') { Press 'shift' }
  elseif ($t -eq 'us') { Lift 'shift' }
  elseif ($t -match '^f(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)$') { Rcon "execute as $Player at @s anchored eyes run rotate @s facing $($matches[1]) $($matches[2]) $($matches[3])" }
  elseif ($t -match '^(wa|wd|ba|bd|rh|lh|rc|lc|[ypwrnbadjz])(-?[\d.]*)$') {
    $v = if ($matches[2]) { [double]$matches[2] } else { 0 }
    switch ($matches[1]) {
      'y' { Rcon "execute as $Player at @s run rotate @s ~$v ~" }
      'p' { Rcon "execute as $Player at @s run rotate @s ~ $v" }
      'wa' { Hold @('w', 'a') $v }
      'wd' { Hold @('w', 'd') $v }
      'ba' { Hold @('s', 'a') $v }
      'bd' { Hold @('s', 'd') $v }
      'w' { Hold @('w') $v }
      'r' { Press 'ctrl'; Hold @('w') $v; Lift 'ctrl' }
      'n' { Hold @('shift', 'w') $v }
      'b' { Hold @('s') $v }
      'a' { Hold @('a') $v }
      'd' { Hold @('d') $v }
      'j' { Press 'w'; Hold @('space') 0.2; Start-Sleep -Milliseconds ([int]($v * 1000)); Lift 'w' }
      'rc' { Mouse 0x0008 0x0010 0.06 }
      'lc' { Mouse 0x0002 0x0004 0.06 }
      'rh' { Mouse 0x0008 0x0010 $v }
      'lh' { Mouse 0x0002 0x0004 $v }
      'z' { Start-Sleep -Milliseconds ([int]($v * 1000)) }
    }
  } else { Write-Output "unknown step: $t"; exit 1 }
}
} finally { Lift 'shift' }
Write-Output 'route done'
