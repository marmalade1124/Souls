// Real file-index worker and renderer, with isolated files and simulated launch/control actions.
const {app,BrowserWindow,globalShortcut,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=path.join(root,'.soul-dev','search-check'),fixture=path.join(profile,'fixtures');
app.setPath('userData',profile);fs.mkdirSync(path.join(fixture,'.hidden','node_modules','AppData','deep'),{recursive:true});
for(const name of ['Needle A.txt','Needle B.txt'])fs.writeFileSync(path.join(fixture,'.hidden','node_modules','AppData','deep',name),'test');
let base=path.join(root,'src');if(process.argv.includes('--packaged')){const resources=path.join(root,'dist','win-unpacked','resources');Object.defineProperty(process,'resourcesPath',{value:resources});base=path.join(resources,'app.asar','src');}
const service=require(path.join(base,'search-service')),realCreate=service.createSearchService;service.createSearchService=options=>realCreate({...options,getRoots:async()=>[fixture]});
const controls=require(path.join(base,'controls'));controls.request=async(_app,action)=>action==='read'?{volume:50,brightness:null}:action==='playback'?{available:false}:action==='radios'?{}:true;controls.stop=()=>{};
let shortcut,opened;globalShortcut.register=(key,handler)=>{assert.equal(key,'CommandOrControl+Shift+Space');shortcut=handler;return true;};shell.openPath=async p=>{opened=p;return '';};
require(path.join(base,'main'));const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await pause(1600);const win=BrowserWindow.getAllWindows()[0],invoke=code=>win.webContents.executeJavaScript(code);
 assert.equal(await invoke("document.querySelector('.tab.active').dataset.tab"),'search');assert.equal(await invoke('document.activeElement.id'),'file-query');
 for(let i=0;i<100;i++){const s=await invoke('window.soul.indexState()');if(s.ready&&!s.indexing)break;await pause(50);}
 assert.equal((await invoke('window.soul.indexState()')).ready,true);
 await invoke("(()=>{const input=document.querySelector('#file-query');input.value='Needle .txt';input.dispatchEvent(new Event('input'));})()");await pause(400);
 assert.equal(await invoke("document.querySelectorAll('#file-list .result-row').length"),2);
 assert.ok((await invoke("document.querySelector('#file-list').textContent")).includes('Needle B.txt'));
 await invoke("document.querySelector('#file-query').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");assert.ok((await invoke("document.querySelector('.search-selected').dataset.path")).endsWith('Needle B.txt'));
 fs.writeFileSync(path.join(profile,'preview.png'),(await win.webContents.capturePage()).toPNG());
 await invoke("document.querySelector('#file-query').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");await pause(1300);assert.ok(opened.endsWith('Needle B.txt'));assert.equal(win.isVisible(),false);
 shortcut();await pause(1300);assert.equal(await invoke('document.activeElement.id'),'file-query');assert.equal(await invoke("document.querySelector('.tab.active').dataset.tab"),'search');assert.equal(await invoke("document.querySelector('#file-query').selectionEnd"),11);
 assert.equal(await invoke("window.soul.search('x'.repeat(201)).then(()=>false,()=>true)"),true);
 const result=await invoke("window.soul.search('AppData Needle')");assert.equal(result.items.length,2);
 const before=(await invoke('window.soul.indexState()')).updated;await invoke('window.soul.reindex()');for(let i=0;i<100;i++){const s=await invoke('window.soul.indexState()');if(s.updated!==before&&!s.indexing)break;await pause(50);}
 assert.ok((await invoke('window.soul.indexState()')).count>=2);
 fs.writeFileSync(path.join(root,'.soul-dev',process.argv.includes('--packaged')?'packaged-search-result.txt':'search-result.txt'),'PASS real index, hidden/dependency paths, Search shortcut focus, keyboard selection/launch and refresh'+(process.argv.includes('--packaged')?', packaged worker compatibility':''));
}catch(error){fs.writeFileSync(path.join(root,'.soul-dev',process.argv.includes('--packaged')?'packaged-search-result.txt':'search-result.txt'),error.stack);console.error(error);}finally{app.quit();}});
