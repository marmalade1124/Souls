$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class DeviceEnumerator {}
[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDeviceEnumerator {
 int EnumAudioEndpoints(int flow, int mask, out IntPtr devices);
 int GetDefaultAudioEndpoint(int flow, int role, out IDevice device);
}
[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDevice { int Activate(ref Guid id, int context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object result); }
[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IVolume {
 int RegisterControlChangeNotify(IntPtr notify); int UnregisterControlChangeNotify(IntPtr notify); int GetChannelCount(out uint channels);
 int SetMasterVolumeLevel(float level, ref Guid context); int SetMasterVolumeLevelScalar(float level, ref Guid context);
 int GetMasterVolumeLevel(out float level); int GetMasterVolumeLevelScalar(out float level);
 int SetChannelVolumeLevel(uint channel, float level, ref Guid context); int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid context);
 int GetChannelVolumeLevel(uint channel, out float level); int GetChannelVolumeLevelScalar(uint channel, out float level);
 int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context); int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}
public class SoulControls {
 [DllImport("shcore.dll")] static extern int CreateStreamOverRandomAccessStream([MarshalAs(UnmanagedType.IUnknown)] object random,ref Guid iid,out System.Runtime.InteropServices.ComTypes.IStream stream);
 public static byte[] Artwork(object random){
   Guid iid=new Guid("0000000C-0000-0000-C000-000000000046");System.Runtime.InteropServices.ComTypes.IStream stream;
   Marshal.ThrowExceptionForHR(CreateStreamOverRandomAccessStream(random,ref iid,out stream));
   IntPtr read=Marshal.AllocCoTaskMem(4);
   try{System.Runtime.InteropServices.ComTypes.STATSTG stat;stream.Stat(out stat,1);if(stat.cbSize<=0||stat.cbSize>1048576)return new byte[0];
     var bytes=new byte[(int)stat.cbSize];stream.Seek(0,0,IntPtr.Zero);stream.Read(bytes,bytes.Length,read);if(Marshal.ReadInt32(read)!=bytes.Length)return new byte[0];return bytes;
   }finally{Marshal.FreeCoTaskMem(read);Marshal.ReleaseComObject(stream);}
 }
 [DllImport("user32.dll",SetLastError=true)] public static extern bool AddClipboardFormatListener(IntPtr window);
 static IVolume Endpoint() { IDevice device;var enumerator=(IDeviceEnumerator)new DeviceEnumerator();try{Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0,1,out device));}finally{Marshal.ReleaseComObject(enumerator);}
   Guid id=typeof(IVolume).GUID; object result; Marshal.ThrowExceptionForHR(device.Activate(ref id,23,IntPtr.Zero,out result));
   Marshal.ReleaseComObject(device); return (IVolume)result; }
 public static int Volume() { var endpoint=Endpoint(); try { float level; Marshal.ThrowExceptionForHR(endpoint.GetMasterVolumeLevelScalar(out level)); return (int)Math.Round(level*100); } finally {Marshal.ReleaseComObject(endpoint);} }
 public static void Volume(int value) { var endpoint=Endpoint(); try { Guid context=Guid.Empty; Marshal.ThrowExceptionForHR(endpoint.SetMasterVolumeLevelScalar(value/100f,ref context)); if(value>0) Marshal.ThrowExceptionForHR(endpoint.SetMute(false,ref context)); } finally {Marshal.ReleaseComObject(endpoint);} }
 [StructLayout(LayoutKind.Sequential)] struct Point { public int x,y; }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Physical {public IntPtr handle; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)]public string description;}
 [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point point,uint flags);
 [DllImport("dxva2.dll")] static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr monitor,out uint count);
 [DllImport("dxva2.dll",CharSet=CharSet.Unicode)] static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr monitor,uint count,[Out] Physical[] monitors);
 [DllImport("dxva2.dll")] static extern bool DestroyPhysicalMonitors(uint count,Physical[] monitors);
 [DllImport("dxva2.dll")] static extern bool GetMonitorBrightness(IntPtr monitor,out uint min,out uint current,out uint max);
 [DllImport("dxva2.dll")] static extern bool SetMonitorBrightness(IntPtr monitor,uint value);
 public static int Brightness(int value) {var monitor=MonitorFromPoint(new Point(),1);uint count;
   if(!GetNumberOfPhysicalMonitorsFromHMONITOR(monitor,out count)||count==0)throw new Exception("This display does not expose brightness control.");
   var monitors=new Physical[count];if(!GetPhysicalMonitorsFromHMONITOR(monitor,count,monitors))throw new Exception("Display brightness is unavailable.");
   try {foreach(var physical in monitors){uint min,current,max;if(GetMonitorBrightness(physical.handle,out min,out current,out max)&&max>min){
     if(value>=0){if(!SetMonitorBrightness(physical.handle,min+(uint)Math.Round((max-min)*value/100.0)))throw new Exception("The display rejected the brightness change.");return value;}
     return (int)Math.Round((current-min)*100.0/(max-min));}}
     throw new Exception("Enable DDC/CI in your monitor settings to control brightness.");
   }finally{DestroyPhysicalMonitors(count,monitors);} }
}
'@
function Read-Brightness {
  $panel = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Where-Object Active | Select-Object -First 1
  if ($panel) { return [int]$panel.CurrentBrightness }
  return [SoulControls]::Brightness(-1)
}
function Set-Brightness([int]$value) {
  $panel = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue | Where-Object Active | Select-Object -First 1
  if ($panel) { Invoke-CimMethod -InputObject $panel -MethodName WmiSetBrightness -Arguments @{Timeout=[uint32]0;Brightness=[byte]$value} | Out-Null; return }
  [SoulControls]::Brightness($value) | Out-Null
}
function Await-WinRT($operation,[Type]$type) {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
  $task=$method.MakeGenericMethod($type).Invoke($null,@($operation))
  return $task.GetAwaiter().GetResult()
}
function Media-Session {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $managerType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
  if (!$script:mediaManager) {
    $operation=$managerType::RequestAsync()
    $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $task=$asTask.MakeGenericMethod($managerType).Invoke($null,@($operation))
    $script:mediaManager=$task.GetAwaiter().GetResult()
  }
  return $script:mediaManager.GetCurrentSession()
}
function Read-Playback {
  $session=Media-Session
  if (!$session) { return @{available=$false;playing=$false} }
  $info=$session.GetPlaybackInfo();$timeline=$session.GetTimelineProperties()
  $props=Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime])
  $identity=$session.SourceAppUserModelId+'|'+$props.Title+'|'+$props.Artist+'|'+$props.AlbumTitle
  if($identity -ne $script:artIdentity -or !$script:art){
    $script:art='';$script:artIdentity=$identity
    if($props.Thumbnail){
      $stream=$null
      try{
        $stream=Await-WinRT ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime])
        $bytes=[SoulControls]::Artwork($stream)
        if($bytes.Length -gt 0 -and $bytes.Length -le 1048576){
          $mime=''
          if($bytes.Length -ge 8 -and $bytes[0] -eq 137 -and $bytes[1] -eq 80){$mime='image/png'}
          elseif($bytes.Length -ge 3 -and $bytes[0] -eq 255 -and $bytes[1] -eq 216){$mime='image/jpeg'}
          elseif($bytes.Length -ge 12 -and [Text.Encoding]::ASCII.GetString($bytes,8,4) -eq 'WEBP'){$mime='image/webp'}
          if($mime){$script:art='data:'+$mime+';base64,'+[Convert]::ToBase64String($bytes)}
        }
      }catch{}finally{if($stream){try{[Runtime.InteropServices.Marshal]::ReleaseComObject($stream) | Out-Null}catch{}}}
    }
  }
  $position=$timeline.Position.TotalSeconds
  if($info.PlaybackStatus.ToString() -eq 'Playing'){$position+=([DateTimeOffset]::Now-$timeline.LastUpdatedTime).TotalSeconds}
  return @{available=$true;playing=($info.PlaybackStatus.ToString() -eq 'Playing');title=$props.Title;artist=$props.Artist;album=$props.AlbumTitle;artwork=$script:art;session=$session.SourceAppUserModelId;identity=$identity;start=$timeline.MinSeekTime.TotalSeconds;end=$timeline.MaxSeekTime.TotalSeconds;position=$position;canSeek=$info.Controls.IsPlaybackPositionEnabled}
}
function Read-Radios {
  $radioType=[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
  $radios=Await-WinRT ($radioType::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $result=@{}
  foreach($kind in @('wifi','bluetooth')){
    $radio=$radios | Where-Object {if($kind -eq 'wifi'){$_.Kind.ToString() -eq 'WiFi'}else{$_.Kind.ToString() -eq 'Bluetooth'}} | Select-Object -First 1
    $result[$kind]=@{available=($null -ne $radio);on=($radio -and $radio.State.ToString() -eq 'On');name=if($radio){$radio.Name}else{'Not available'};disabled=($radio -and $radio.State.ToString() -eq 'Disabled')}
  }
  return $result
}
function Set-Radio($value){
  $radioType=[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
  $status=Await-WinRT ($radioType::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
  if($status.ToString() -ne 'Allowed'){throw 'Windows denied radio access. Check radio privacy settings.'}
  $radios=Await-WinRT ($radioType::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $radio=$radios | Where-Object {$_.Kind.ToString() -eq $(if($value.kind -eq 'wifi'){'WiFi'}else{'Bluetooth'})} | Select-Object -First 1
  if(!$radio){throw 'This radio is not available.'}
  $target=[Windows.Devices.Radios.RadioState]::Off;if($value.on){$target=[Windows.Devices.Radios.RadioState]::On}
  $status=Await-WinRT ($radio.SetStateAsync($target)) ([Windows.Devices.Radios.RadioAccessStatus])
  if($status.ToString() -ne 'Allowed'){throw 'Windows or a hardware switch blocked this radio change.'}
  return Read-Radios
}
while ($null -ne ($line = [Console]::ReadLine())) {
  $request = $null
  try {
    $request = $line | ConvertFrom-Json
    if ($request.action -eq 'read') {
      $volume=$null; $brightness=$null; $volumeError=''; $brightnessError=''
      try { $volume=[SoulControls]::Volume() } catch { $volumeError='No active audio output' }
      try { $brightness=Read-Brightness } catch { $brightnessError='Brightness unavailable. Enable DDC/CI on an external monitor.' }
      $result=@{volume=$volume;brightness=$brightness;volumeError=$volumeError;brightnessError=$brightnessError}
    } elseif($request.action -eq 'watch-clipboard') {
      if (![SoulControls]::AddClipboardFormatListener([IntPtr]([long]$request.value))) { throw 'Clipboard notifications unavailable' }
      $result=$true
    } elseif($request.action -eq 'playback') {
      $result=Read-Playback
    } elseif($request.action -eq 'seek') {
      $session=Media-Session
      if(!$session -or $session.SourceAppUserModelId -ne $request.value.session){throw 'The active player changed. Try again.'}
      $current=Read-Playback
      if($current.identity -ne $request.value.identity -or !$current.canSeek){throw 'This track cannot be seeked.'}
      $position=[Math]::Max($current.start,[Math]::Min($current.end,[double]$request.value.position))
      $result=Await-WinRT ($session.TryChangePlaybackPositionAsync([long]($position*10000000))) ([bool])
      if(!$result){throw 'The player rejected seeking.'}
    } elseif($request.action -eq 'radios') {
      $result=Read-Radios
    } elseif($request.action -eq 'radio') {
      $result=Set-Radio $request.value
    } else {
      $value=[int]$request.value
      if($value -lt 0 -or $value -gt 100) { throw 'Invalid slider value' }
      if($request.action -eq 'volume') { [SoulControls]::Volume($value) }
      elseif($request.action -eq 'brightness') { Set-Brightness $value }
      else { throw 'Unknown control' }
      $result=$value
    }
    @{id=$request.id;result=$result} | ConvertTo-Json -Compress -Depth 4 | ForEach-Object { [Console]::WriteLine($_) }
  } catch { @{id=$request.id;error=$_.Exception.Message} | ConvertTo-Json -Compress | ForEach-Object { [Console]::WriteLine($_) } }
}
