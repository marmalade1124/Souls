$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
[Console]::InputEncoding=[Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class SoulSearch {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr LoadLibrary(string name);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string name,string title);
 [DllImport("Everything64.dll")] public static extern bool Everything_IsDBLoaded();
 [DllImport("Everything64.dll",CharSet=CharSet.Unicode)] public static extern void Everything_SetSearchW(string query);
 [DllImport("Everything64.dll")] public static extern void Everything_SetRegex(bool enabled);
 [DllImport("Everything64.dll")] public static extern void Everything_SetMatchPath(bool enabled);
 [DllImport("Everything64.dll")] public static extern void Everything_SetMax(uint max);
 [DllImport("Everything64.dll")] public static extern void Everything_SetRequestFlags(uint flags);
 [DllImport("Everything64.dll")] public static extern bool Everything_QueryW(bool wait);
 [DllImport("Everything64.dll")] public static extern uint Everything_GetNumResults();
 [DllImport("Everything64.dll")] public static extern uint Everything_GetTotResults();
 [DllImport("Everything64.dll")] public static extern bool Everything_IsFolderResult(uint index);
 [DllImport("Everything64.dll",CharSet=CharSet.Unicode)] public static extern uint Everything_GetResultFullPathNameW(uint index,StringBuilder buffer,uint size);
 public static bool Running(){return FindWindow("EVERYTHING_TASKBAR_NOTIFICATION",null)!=IntPtr.Zero;}
}
'@
$sdkLoaded=([SoulSearch]::LoadLibrary((Join-Path $PSScriptRoot 'native/Everything64.dll')) -ne [IntPtr]::Zero)
function Open-WindowsIndex {
 if(!$script:connection){$script:connection=New-Object System.Data.OleDb.OleDbConnection('Provider=Search.CollatorDSO.1;Extended Properties="Application=Windows"')}
 if($script:connection.State -ne 'Open'){$script:connection.Open()}
}
function Read-Provider {
 if($sdkLoaded -and [SoulSearch]::Running() -and [SoulSearch]::Everything_IsDBLoaded()){return @{engine='Everything';ready=$true;error='';note='Everything filename index'}}
 try{Open-WindowsIndex;return @{engine='Windows Search';ready=$true;error='';note='Windows indexed locations. Install/run Everything for broader filename coverage.'}}
 catch{return @{engine='Unavailable';ready=$false;error='Start Everything or enable Windows Search. Added locations can still be searched.';note='No native index available'}}
}
function Read-Search([string]$query){
 $provider=Read-Provider;$items=@();$truncated=$false
 if($provider.engine -eq 'Everything'){
   try{
     $pattern=(@($query.Trim() -split '\s+' | ForEach-Object {'(?=.*'+[regex]::Escape($_)+')'}) -join '')+'.*'
     [SoulSearch]::Everything_SetRegex($true);[SoulSearch]::Everything_SetMatchPath($true);[SoulSearch]::Everything_SetSearchW($pattern)
     [SoulSearch]::Everything_SetMax(101);[SoulSearch]::Everything_SetRequestFlags(4)
     if(![SoulSearch]::Everything_QueryW($true)){throw 'Everything query failed'}
     $count=[SoulSearch]::Everything_GetNumResults();$truncated=([SoulSearch]::Everything_GetTotResults() -gt 100)
     for([uint32]$i=0;$i -lt [Math]::Min($count,100);$i++){
       $buffer=New-Object Text.StringBuilder 32768;[SoulSearch]::Everything_GetResultFullPathNameW($i,$buffer,32768) | Out-Null;$full=$buffer.ToString()
       $items+=@{path=$full;name=[IO.Path]::GetFileName($full);kind=if([SoulSearch]::Everything_IsFolderResult($i)){'folder'}else{'file'}}
     }
     return @{items=@($items);truncated=$truncated;provider=$provider}
   }catch{$provider=@{engine='Windows Search';ready=$true;error='';note='Everything unavailable; using Windows indexed locations.'}}
 }
 try{
   Open-WindowsIndex
   $terms=@($query.Trim() -split '\s+' | ForEach-Object {"System.ItemPathDisplay LIKE '%"+$_.Replace("'","''")+"%'"})
   $command=$script:connection.CreateCommand();$command.CommandTimeout=3
   $command.CommandText="SELECT TOP 101 System.ItemPathDisplay,System.FileAttributes FROM SystemIndex WHERE System.ItemUrl LIKE 'file:%' AND "+($terms -join ' AND ')
   $reader=$null
   try{$reader=$command.ExecuteReader();while($reader.Read()){
     if($items.Count -ge 100){$truncated=$true;break};$full=[string]$reader.GetValue(0);if(!$full){continue}
     $attributes=0;if(!$reader.IsDBNull(1)){$attributes=[long]$reader.GetValue(1)}
     $items+=@{path=$full;name=[IO.Path]::GetFileName($full);kind=if($attributes -band 16){'folder'}else{'file'}}
   }}finally{if($reader){$reader.Dispose()};$command.Dispose()}
   $provider.engine='Windows Search';$provider.ready=$true;$provider.error=''
 }catch{$provider=@{engine='Unavailable';ready=$false;error='Native search unavailable. Start Everything or check Windows Search settings.';note='Added locations remain searchable'};if($script:connection){$script:connection.Dispose();$script:connection=$null}}
 return @{items=@($items);truncated=$truncated;provider=$provider}
}
while($null -ne ($line=[Console]::ReadLine())){
 $request=$null
 try{
   $request=$line | ConvertFrom-Json
   if($request.action -eq 'probe'){$result=Read-Provider}
   elseif($request.action -eq 'query'){
     if($request.value -isnot [string] -or $request.value.Length -gt 200 -or !$request.value.Trim()){throw 'Invalid search query'}
     $result=Read-Search $request.value
   }else{throw 'Unknown search action'}
   @{id=$request.id;result=$result} | ConvertTo-Json -Depth 6 -Compress | ForEach-Object {[Console]::WriteLine($_)}
 }catch{@{id=$request.id;error=$_.Exception.Message} | ConvertTo-Json -Compress | ForEach-Object {[Console]::WriteLine($_)}}
}
if($script:connection){$script:connection.Dispose()}
