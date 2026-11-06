# Sneak + click in Minecraft with no race: holds left shift, clicks, lets go. Does nothing unless Minecraft is the front window.
param([ValidateSet('right','left')][string]$Button = 'right')
Add-Type -Namespace W -Name K2 -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint x, uint y, uint data, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(System.IntPtr h, System.Text.StringBuilder s, int n);
'@
$sb = New-Object System.Text.StringBuilder 256
[void][W.K2]::GetWindowText([W.K2]::GetForegroundWindow(), $sb, 256)
if (-not $sb.ToString().StartsWith('Minecraft')) { Write-Output 'NOT SENT: Minecraft is not in front'; exit 1 }
$down = if ($Button -eq 'right') { 0x0008 } else { 0x0002 }
$up = if ($Button -eq 'right') { 0x0010 } else { 0x0004 }
[W.K2]::keybd_event(0xA0, 0x2A, 0, [System.UIntPtr]::Zero)
try {
  Start-Sleep -Milliseconds 600
  [W.K2]::mouse_event($down, 0, 0, 0, [System.UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [W.K2]::mouse_event($up, 0, 0, 0, [System.UIntPtr]::Zero)
  Start-Sleep -Milliseconds 400
} finally {
  [W.K2]::keybd_event(0xA0, 0x2A, 2, [System.UIntPtr]::Zero)
}
Write-Output "sent shift+$Button"
