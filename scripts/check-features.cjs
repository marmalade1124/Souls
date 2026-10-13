// Isolated integration tests: radios, seeking and clipboard are simulated; no user state changes.
const {app,BrowserWindow,clipboard,ClipboardItem,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=path.join(root,'.soul-dev','feature-check');app.setPath('userData',profile);
let payloads={'text/plain':'Initial feature test'},radioCalls=[],seeks=[];
clipboard.read=async()=>[new ClipboardItem(payloads)];
clipboard.readText=async()=>typeof payloads['text/plain']==='string'?payloads['text/plain']:'';
clipboard.write=async items=>{const next={};for(const item of items)for(const type of item.types)next[type]=await item.getType(type);payloads=next;};
const png=fs.readFileSync(path.join(root,'src','icon.png'));
const art='data:image/png;base64,'+png.toString('base64');
let media={available:true,playing:true,title:'A long track title — 音楽 🎵',artist:'Artist',album:'Album',session:'TestPlayer',identity:'first-track',artwork:art,start:10,end:190,position:40,canSeek:true};
let radios={wifi:{available:true,on:true},bluetooth:{available:true,on:false}};
const controls=require('../src/controls');controls.request=async(_app,action,value)=>{
 if(action==='playback')return {...media};if(action==='read')return {volume:40,brightness:null};if(action==='radios')return radios;
 if(action==='radio'){radioCalls.push(value);radios[value.kind].on=value.on;return radios;}
 if(action==='seek'){assert.equal(value.identity,media.identity);seeks.push(value);return true;}return true;
};controls.stop=()=>{};
require('../src/main');const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  await pause(1500);const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html')),invoke=code=>win.webContents.executeJavaScript(code);
  assert.equal(await invoke("document.querySelector('.track-info strong').textContent"),media.title);
  assert.equal(await invoke("document.querySelector('.album-art img').getAttribute('src')"),art);
  await invoke("document.querySelector('[data-tab=music]').click()");await pause(900);
  fs.writeFileSync(path.join(root,'.soul-dev','features-music.png'),(await win.webContents.capturePage()).toPNG());
  assert.equal(await invoke("document.querySelector('.seek-control input').disabled"),false);
  await invoke("(()=>{const i=document.querySelector('.seek-control input');i.value=100;i.dispatchEvent(new Event('input'));i.dispatchEvent(new Event('change'));})()");await pause(100);
  assert.equal(seeks[0].position,100);assert.equal(seeks[0].session,'TestPlayer');
  assert.equal(await invoke("window.soul.seek({position:NaN}).then(()=>false,()=>true)"),true);
  media={available:false,playing:false};await pause(2200);assert.equal(await invoke("document.querySelector('.seek-control input').disabled"),true);assert.equal(await invoke("document.querySelector('.album-art img')===null"),true);
  await invoke("document.querySelector('[data-radio=bluetooth]').click()");await pause(100);assert.deepEqual(radioCalls[0],{kind:'bluetooth',on:true});assert.equal(await invoke("document.querySelector('[data-radio=bluetooth]').getAttribute('aria-pressed')"),'true');
  assert.equal(await invoke("window.soul.setRadio('invalid',true).then(()=>false,()=>true)"),true);
  const levels=await invoke('window.soul.readControls()');assert.equal(levels.brightnessMode,'software');
  await invoke("window.soul.setControl('brightness',80)");const dimmer=BrowserWindow.getAllWindows().find(w=>w!==win);assert.ok(dimmer&&!dimmer.isFocusable());assert.equal(Math.round(dimmer.getOpacity()*100),16);await invoke("window.soul.setControl('brightness',100)");assert.equal(dimmer.isVisible(),false);
  await invoke("window.soul.preference('clipboardEnabled',true)");await invoke('window.soul.clearClips()');
  payloads={'image/png':new Blob([png],{type:'image/png'})};let state=await invoke('window.soul.clipboardState()');assert.equal(state.clips[0].kind,'image');
  await invoke("document.querySelector('[data-tab=clipboard]').click()");await pause(900);assert.equal(await invoke("document.querySelector('#clip-list img').naturalWidth>0"),true);
  const imageId=state.clips[0].id;await invoke(`window.soul.copyClip('${imageId}')`);assert.ok(Buffer.from(await payloads['image/png'].arrayBuffer()).equals(png));
  payloads={'text/plain':'Formatted test','text/html':'<b>Formatted test</b>','text/rtf':'{\\rtf1 Formatted test}'};state=await invoke('window.soul.clipboardState()');assert.equal(state.clips[0].kind,'formatted');const richId=state.clips[0].id;
  await invoke(`window.soul.copyClip('${richId}')`);assert.equal(await payloads['text/html'].text(),'<b>Formatted test</b>');assert.equal(await payloads['text/rtf'].text(),'{\\rtf1 Formatted test}');
  const names=Buffer.from('C:\\Example\\copied.txt\0\0','utf16le'),header=Buffer.alloc(20);header.writeUInt32LE(20);header.writeUInt32LE(1,16);const type='electron application/osclipboard;format="CF_HDROP"';payloads={[type]:new Blob([header,names])};state=await invoke('window.soul.clipboardState()');assert.equal(state.clips[0].kind,'files');assert.ok(state.clips[0].text.includes('copied.txt'));
  const saved=JSON.parse(fs.readFileSync(path.join(profile,'preferences.json'),'utf8'));assert.equal('clips' in saved,false);assert.ok(JSON.parse(safeStorage.decryptString(Buffer.from(saved.encryptedClips,'base64'))).some(c=>c.kind==='image'));
  await invoke("window.soul.preference('clipboardEnabled',false)");await invoke('window.soul.clearClips()');
  const shot=await win.webContents.capturePage();fs.writeFileSync(path.join(root,'.soul-dev','features-clipboard.png'),shot.toPNG());
  fs.writeFileSync(path.join(root,'.soul-dev','feature-result.txt'),'PASS metadata, artwork, seeking, radio toggles, dimming, rich/image/file clipboard, encrypted persistence');
 }catch(error){fs.writeFileSync(path.join(root,'.soul-dev','feature-result.txt'),error.stack);console.error(error);}finally{app.quit();}
});
