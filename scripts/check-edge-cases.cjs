// Isolated fault injection. Clipboard, native controls and power actions are simulated.
const {app,BrowserWindow,clipboard,dialog,screen,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),mode=process.argv[2]||'runtime',profile=path.join(root,'.soul-dev','edge-'+mode);
fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
if(mode==='corrupt')fs.writeFileSync(path.join(profile,'preferences.json'),'{broken json');
if(mode==='cipher')fs.writeFileSync(path.join(profile,'preferences.json'),JSON.stringify({pins:null,roots:3,clipboardEnabled:true,lastTab:'not-a-tab',encryptedClips:'invalid encrypted bytes'}));
let simulatedDisplay;
const realSetInterval=global.setInterval;
global.setInterval=(fn,delay,...args)=>realSetInterval(fn,fn.name==='captureClipboard'?60000:delay,...args);
let copied='Initial test text',reads=[],volume=10,levelsRead,modalReply;
const powerCalls=[],childProcess=require('node:child_process'),realExec=childProcess.execFile;
childProcess.execFile=(exe,args,options,callback)=>{
  if(['shutdown.exe','rundll32.exe'].includes(exe)){assert.equal(options.timeout,10000);powerCalls.push({exe,args});setTimeout(()=>callback(null,''),1);return;}
  return realExec(exe,args,options,callback);
};
clipboard.readText=()=>reads.length?reads.shift()():Promise.resolve(copied);clipboard.writeText=async text=>{copied=text;};
clipboard.read=async()=>[];
const controls=require('../src/controls');
controls.request=async(_app,action,value)=>{
  if(action==='read')return levelsRead?levelsRead():{volume,brightness:null,brightnessError:'Display does not support brightness'};
  if(action==='playback')return {available:false,playing:false};
  if(action==='volume'){volume=value;return value;}return true;
};controls.stop=()=>{};
dialog.showMessageBox=()=>new Promise(resolve=>{modalReply=resolve;});
// Install a fake small screen before main.js's ready callback creates its window.
if(mode==='display')app.whenReady().then(()=>{
  simulatedDisplay={...screen.getPrimaryDisplay(),bounds:{x:0,y:0,width:640,height:480}};
  screen.getPrimaryDisplay=()=>simulatedDisplay;screen.getDisplayMatching=()=>simulatedDisplay;
});
require('../src/main');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  try {
    await pause(1500);const win=BrowserWindow.getAllWindows()[0],invoke=code=>win.webContents.executeJavaScript(code);
    if(mode==='corrupt'||mode==='cipher'){
      const state=await invoke('window.soul.state()');assert.deepEqual(state.pins,[]);assert.deepEqual(state.roots,[]);assert.equal(state.lastTab,'settings');assert.ok(state.recoveryWarning);
      assert.ok(fs.existsSync(path.join(profile,'preferences.json.recovery')));const recovered=fs.readFileSync(path.join(profile,'preferences.json.recovery'),'utf8');
      await invoke("window.soul.preference('alwaysOnTop',false)");assert.equal(JSON.parse(fs.readFileSync(path.join(profile,'preferences.json'),'utf8')).alwaysOnTop,false);
      assert.equal(fs.readFileSync(path.join(profile,'preferences.json.recovery'),'utf8'),recovered);assert.equal(fs.existsSync(path.join(profile,'preferences.json.tmp')),false);
    }else if(mode==='display'){
      assert.equal(win.getBounds().height,480);assert.ok(win.webContents.getZoomFactor()<1);
      assert.ok((await invoke("document.querySelector('#island').getBoundingClientRect().height"))*win.webContents.getZoomFactor()<=480);
      simulatedDisplay.bounds={x:0,y:0,width:800,height:600};screen.emit('display-metrics-changed',{},simulatedDisplay,[]);await pause(300);
      assert.equal(win.getBounds().height,600);assert.equal(win.webContents.getZoomFactor(),1);
    }else{
      await invoke("window.soul.preference('clipboardEnabled',true)");await invoke('window.soul.clearClips()');
      let resolveOld,resolveNew;reads.push(()=>new Promise(r=>{resolveOld=r;}),()=>new Promise(r=>{resolveNew=r;}));
      const old=invoke('window.soul.clipboardState()'),newer=invoke('window.soul.clipboardState()');await pause(30);
      resolveNew('Newer delayed text');await newer;resolveOld('Older delayed text');await old;
      let state=await invoke('window.soul.state()');assert.equal(state.clips[0].text,'Newer delayed text');assert.ok(state.clips.some(c=>c.text==='Older delayed text'));
      let resolvePaused;reads.push(()=>new Promise(r=>{resolvePaused=r;}));const paused=invoke('window.soul.clipboardState()');await pause(20);
      await invoke("window.soul.preference('clipboardEnabled',false)");resolvePaused('Do not capture after pause');await paused;
      assert.ok(!(await invoke('window.soul.state()')).clips.some(c=>c.text==='Do not capture after pause'));
      await invoke("window.soul.preference('clipboardEnabled',true)");let resolveCleared;reads.push(()=>new Promise(r=>{resolveCleared=r;}));const late=invoke('window.soul.clipboardState()');await pause(20);
      await invoke('window.soul.clearClips()');resolveCleared('Do not resurrect after clear');await late;assert.equal((await invoke('window.soul.state()')).clips.length,0);
      for(let i=0;i<44;i++){copied='Clipboard limit sample '+i;await invoke('window.soul.clipboardState()');}
      state=await invoke('window.soul.state()');assert.equal(state.clips.length,40);assert.equal(state.clips[0].text,copied);
      copied='x'.repeat(20001);await invoke('window.soul.clipboardState()');assert.equal((await invoke('window.soul.state()')).clips.length,40);
      const originalRename=fs.renameSync;fs.renameSync=(from,to)=>{if(to===path.join(profile,'preferences.json'))throw new Error('Simulated disk failure');return originalRename(from,to);};
      try{
        copied='History survives disk failure';await invoke('window.soul.clipboardState()');assert.equal((await invoke('window.soul.state()')).clips[0].text,copied);assert.ok((await invoke("document.querySelector('#toast').textContent")).includes('could not be saved'));
        await invoke("window.soul.layout('apps')");assert.equal(await invoke("document.querySelector('.tab.active').dataset.tab"),'apps','disk failure must not block navigation');
        await invoke("window.soul.expand(true)");assert.equal(win.isVisible(),true,'disk failure must not block shortcut opening');
      }finally{fs.renameSync=originalRename;}
      await pause(1200);const disk=JSON.parse(fs.readFileSync(path.join(profile,'preferences.json'),'utf8'));
      assert.ok(JSON.parse(safeStorage.decryptString(Buffer.from(disk.encryptedClips,'base64'))).some(c=>c.text==='History survives disk failure'),'transient disk failures retry automatically');
      await invoke("window.soul.preference('clipboardEnabled',false)");
      for(const expression of ["window.soul.layout('__proto__')","window.soul.settings('__proto__')","window.soul.expand('yes')","window.soul.copyClip('missing')","window.soul.preference('alwaysOnTop','yes')"]){assert.equal(await invoke(expression+'.then(()=>false,()=>true)'),true);}
      // A late native read cannot snap a newer slider input back to the old level.
      let resolveLevels;levelsRead=()=>new Promise(r=>{resolveLevels=r;});const stale=invoke('refreshControls()');await pause(30);
      await invoke("(()=>{const s=document.querySelector('#settings [data-control=volume] input');s.value=65;s.dispatchEvent(new Event('input'));})()");await pause(150);
      levelsRead=null;resolveLevels({volume:10,brightness:null});await stale;
      assert.equal(await invoke("Number(document.querySelector('#settings [data-control=volume] input').value)"),65);
      await invoke("(()=>{const s=document.querySelector('#settings [data-control=volume] input');s.dispatchEvent(new PointerEvent('pointerdown'));window.dispatchEvent(new PointerEvent('pointerup'));})()");
      assert.equal(await invoke("document.querySelector('.slider-control input').classList.contains('dragging')"),false);
      await invoke('paintPlayback(true);refreshPlayback()');assert.equal(await invoke("document.querySelector('[data-media=play]').dataset.playback"),'playing');
      // Modal focus changes must not dismiss Soul, and duplicate dialogs are rejected.
      const power=invoke("window.soul.power('lock')");await pause(30);
      assert.equal(await invoke("window.soul.power('lock').then(()=>false,()=>true)"),true);
      const other=new BrowserWindow({width:160,height:100,show:true});other.focus();await pause(220);assert.equal(win.isVisible(),true);
      modalReply({response:0});assert.equal(await power,false);other.destroy();await pause(100);
      assert.equal(powerCalls.length,0,'cancelled power confirmation does not invoke Windows');
      const restart=invoke("window.soul.power('restart')");await pause(30);modalReply({response:1});assert.equal(await restart,true);assert.deepEqual(powerCalls[0],{exe:'shutdown.exe',args:['/r','/t','60']});
      await invoke("window.soul.power('cancel')");assert.deepEqual(powerCalls[1],{exe:'shutdown.exe',args:['/a']});
      const untrusted=new BrowserWindow({show:false,webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,sandbox:true}});await untrusted.loadURL('data:text/html,<title>IPC isolation check</title>');
      assert.equal(await untrusted.webContents.executeJavaScript('window.soul.state().then(()=>false,()=>true)'),true,'another window cannot use Soul IPC');untrusted.destroy();
      // Fast reopen cancels a pending hide instead of being hidden by its stale timer.
      await invoke("window.soul.hide()");await pause(100);app.emit('second-instance');await pause(1700);assert.equal(win.isVisible(),true);
      await invoke("Object.defineProperty(reducedMotion,'matches',{value:true,configurable:true});window.soul.layout('power')");await pause(60);
      assert.equal(await invoke("Math.round(document.querySelector('#island').getBoundingClientRect().height)"),250);
      await invoke('window.soul.hide()');await pause(60);assert.equal(win.isVisible(),false);
    }
    fs.writeFileSync(path.join(root,'.soul-dev','edge-'+mode+'-result.txt'),'PASS '+mode);
  }catch(error){fs.writeFileSync(path.join(root,'.soul-dev','edge-'+mode+'-result.txt'),error.stack);}
  finally{app.quit();}
});
