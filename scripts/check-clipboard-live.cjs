require('./mock-search.cjs');
// Real Windows clipboard integration in an isolated Soul profile. Restore copied content afterward.
const {app,BrowserWindow,clipboard,ClipboardItem}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',path.join(root,'.soul-dev','live-clipboard-profile'));
require('../src/main');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  let backup,changed=false;
  try {
    await pause(1600);const win=BrowserWindow.getAllWindows()[0];
    const invoke=code=>win.webContents.executeJavaScript(code);
    for(let i=0;i<20;i++){if((await invoke('window.soul.state()')).clipboardWatching)break;await pause(200);}
    assert.equal((await invoke('window.soul.state()')).clipboardWatching,true,'Windows notification listener registered');
    const completeBackup=[];
    for(const item of await clipboard.read()) {const data={};for(const type of item.types){const payload=await item.getType(type);data[type]=typeof payload.arrayBuffer==='function'?new Blob([await payload.arrayBuffer()],{type:payload.type}):payload;}completeBackup.push(new ClipboardItem(data));}
    backup=completeBackup;
    await invoke("window.soul.preference('clipboardEnabled',true)");await invoke('window.soul.clearClips()');
    await invoke("document.querySelector('[data-tab=clipboard]').click()");await pause(900);
    changed=true;await clipboard.writeText('Soul live test: first copy');await pause(450);
    const firstNative=await clipboard.readText(), firstSaved=await invoke('window.soul.state()');
    fs.writeFileSync(path.join(root,'.soul-dev','clipboard-diagnostic.json'),JSON.stringify({readType:typeof firstNative,nativeReadMatches:firstNative==='Soul live test: first copy',enabled:firstSaved.clipboardEnabled,watching:firstSaved.clipboardWatching,count:firstSaved.clips.length,textTypes:firstSaved.clips.map(c=>typeof c.text),firstSaved:firstSaved.clips.some(c=>c.text==='Soul live test: first copy')}));
    await clipboard.writeText('Soul live test: second copy');await pause(400);
    const saved=await invoke('window.soul.clipboardState()');
    assert.ok(saved.clips.some(c=>c.text==='Soul live test: first copy'),'first native copy captured');
    assert.equal(saved.clips[0].text,'Soul live test: second copy','second native copy captured');
    const visible=await invoke("[...document.querySelectorAll('#clip-list .clip-text')].map(n=>n.textContent)");
    assert.ok(visible.some(text=>text.includes('first copy'))&&visible.some(text=>text.includes('second copy')),'both copies rendered in Soul');
    await invoke("document.querySelector('#collapse').click()");await pause(1300);assert.equal(win.isVisible(),false);
    await clipboard.writeText('Soul live test: copied while hidden');await pause(150);
    app.emit('second-instance');await pause(1300);await invoke("document.querySelector('[data-tab=clipboard]').click()");await pause(900);
    assert.ok((await invoke("document.querySelector('#clip-list').textContent")).includes('copied while hidden'),'capture works while hidden');
    const png=fs.readFileSync(path.join(root,'src','icon.png'));await clipboard.write([new ClipboardItem({'image/png':new Blob([png],{type:'image/png'})})]);await pause(450);
    let richState=await invoke('window.soul.clipboardState()');assert.equal(richState.clips[0].kind,'image');await invoke(`window.soul.copyClip('${richState.clips[0].id}')`);
    const nativeImage=(await clipboard.read()).find(item=>item.types.includes('image/png'));assert.ok(nativeImage);assert.ok((await nativeImage.getType('image/png')).size>0);
    await clipboard.write([new ClipboardItem({'text/plain':'Soul formatted test','text/html':'<b>Soul formatted test</b>'})]);await pause(450);richState=await invoke('window.soul.clipboardState()');assert.equal(richState.clips[0].kind,'formatted');await invoke(`window.soul.copyClip('${richState.clips[0].id}')`);
    const nativeHtml=(await clipboard.read()).find(item=>item.types.includes('text/html'));assert.ok((await (await nativeHtml.getType('text/html')).text()).includes('<b>Soul formatted test</b>'));
    const fileType='electron application/osclipboard;format="CF_HDROP"',header=Buffer.alloc(20),names=Buffer.from(path.join(root,'README.md')+'\0\0','utf16le');header.writeUInt32LE(20);header.writeUInt32LE(1,16);
    await clipboard.write([new ClipboardItem({[fileType]:new Blob([header,names])})]);await pause(450);richState=await invoke('window.soul.clipboardState()');assert.equal(richState.clips[0].kind,'files');assert.ok(richState.clips[0].text.includes('README.md'));await invoke(`window.soul.copyClip('${richState.clips[0].id}')`);assert.ok((await clipboard.read()).some(item=>item.types.includes(fileType)));
    await invoke("window.soul.preference('clipboardEnabled',false)");await invoke('window.soul.clearClips()');
    fs.writeFileSync(path.join(root,'.soul-dev','live-clipboard-result.txt'),'PASS native text copies, image/HTML/file round trips, visible Soul rows, and hidden capture');
  } catch(error) {fs.writeFileSync(path.join(root,'.soul-dev','live-clipboard-result.txt'),error.stack);}
  finally {try{if(changed&&backup){if(backup.length)await clipboard.write(backup);else clipboard.clear();}}catch(error){fs.appendFileSync(path.join(root,'.soul-dev','live-clipboard-result.txt'),'\nRestore error: '+error.message);}finally{app.quit();}}
});

