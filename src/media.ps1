param([ValidateSet('play','next','previous','volume-up','volume-down','mute')][string]$Action)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class SoulMedia {
    [DllImport("user32.dll")] static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
    public static void Press(byte key) { keybd_event(key, 0, 0, UIntPtr.Zero); keybd_event(key, 0, 2, UIntPtr.Zero); }
}
'@
$keys = @{ 'play'=0xB3; 'next'=0xB0; 'previous'=0xB1; 'volume-up'=0xAF; 'volume-down'=0xAE; 'mute'=0xAD }
[SoulMedia]::Press([byte]$keys[$Action])
