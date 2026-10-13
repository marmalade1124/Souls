const { app, BrowserWindow, ipcMain, screen, shell, dialog, clipboard, ClipboardItem, safeStorage, Tray, Menu, nativeImage, globalShortcut,powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { searchFiles, discoverApps } = require('./library');
const controls = require('./controls');
const sanitize = require('./preferences');
const clipFormats=require('./clip-formats');
let dimmer,dimmerReady,softwareBrightness=100,brightnessMode='hardware';
async function dimScreen(value){
  softwareBrightness=value;
  if(value===100){dimmer?.hide();return value;}
  if(!dimmer||dimmer.isDestroyed()){
    dimmer=new BrowserWindow({show:false,frame:false,transparent:true,focusable:false,skipTaskbar:true,hasShadow:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
    dimmer.setIgnoreMouseEvents(true);dimmer.setAlwaysOnTop(true,'screen-saver');
    dimmerReady=dimmer.loadURL('data:text/html,<html style="background:black"></html>');
  }
  await dimmerReady;if(value!==softwareBrightness||quitting)return softwareBrightness;
  dimmer.setBounds(screen.getPrimaryDisplay().bounds);dimmer.setOpacity((1-value/100)*.8);dimmer.showInactive();return value;
}

let win, tray, storePath, clipTimer, layoutTimer, apps = [], searchAllowed = new Set(), expanded = false, quitting = false;
const canvas = { width: 720, height: 600 };
let displayScale=1,displayTimer;
function displayGeometry(area) {
  return {width:Math.min(720,area.width),height:Math.min(600,area.height),scale:Math.min(1,(area.width-20)/700,(area.height-4)/580)};
}
function fitDisplay(display,x=win.getBounds().x) {
  if(!win||win.isDestroyed())return;
  const area=display.bounds,geometry=displayGeometry(area);
  canvas.width=geometry.width;canvas.height=geometry.height;displayScale=geometry.scale;
  win.setBounds({x:Math.round(Math.max(area.x,Math.min(x,area.x+area.width-canvas.width))),y:area.y,width:canvas.width,height:canvas.height});
  win.webContents.setZoomFactor(displayScale);
  if(activeSize===pendingSize)shapeIsland(activeSize.width,activeSize.height);
  else shapeIsland(Math.max(activeSize.width,pendingSize.width)+20,Math.max(activeSize.height,pendingSize.height)+20);
}
let dismissTimer, hideTimer, dialogDepth = 0, hiding = false;
let storeRetryTimer,storeDirty=false,storeRetryDelay=1000;
let activeSearch;
function retrySave() {
  storeDirty=true;
  if(quitting||storeRetryTimer)return;
  storeRetryTimer=setTimeout(()=>{storeRetryTimer=null;try{save();}catch{storeRetryDelay=Math.min(30000,storeRetryDelay*2);retrySave();}},storeRetryDelay);
}
async function ownedDialog(method, options) {
  if(dialogDepth)throw new Error('Finish the open Windows dialog first.');
  ++dialogDepth; clearTimeout(dismissTimer);
  try { return await dialog[method](win, options); }
  finally { --dialogDepth; if (win && !win.isDestroyed() && win.isVisible() && expanded) win.focus(); }
}
let motionToken = 0, motionTab = 'settings', activeSize = { width: 340, height: 1 }, pendingSize = activeSize;
let state = { pins: [], roots: [], clipboardEnabled: false, alwaysOnTop: true, clips: [], lastTab: 'settings' };
let lastClipText = '', clipboardRevision=0, clipboardWatching=false, clipboardRead=0, appliedClipboardRead=0, clipboardEpoch=0,lastClipboardTime=0,recoveryWarning='';
function send(channel,value){if(win&&!win.isDestroyed()&&!win.webContents.isDestroyed())win.webContents.send(channel,value);}
async function captureClipboard(force=false) {
  if (!state.clipboardEnabled) return;
  const read=++clipboardRead;
  const epoch=clipboardEpoch,time=Math.max(Date.now(),lastClipboardTime+1);lastClipboardTime=time;
  try {
    const item=await clipFormats.capture(clipboard);
    if(!state.clipboardEnabled || epoch!==clipboardEpoch)return;
    if(!item)return;const text=clipFormats.key(item);
    if (!force && text===lastClipText) return;
    if(read>=appliedClipboardRead){lastClipText=text;appliedClipboardRead=read;}
    const existing=state.clips.find(c=>clipFormats.key(c)===text);
    if (existing && (state.clips[0]===existing || existing.time>=time)) return;
    state.clips=clipFormats.trim([{id:existing?.id??randomUUID(),...item,time},...state.clips.filter(c=>clipFormats.key(c)!==text)].sort((a,b)=>b.time-a.time));
    ++clipboardRevision;send('clips',{clips:state.clips,revision:clipboardRevision});
    try{save();}catch{send('clipboard-error','Copied text is available, but history could not be saved to disk.');}
  } catch(error) {send('clipboard-error','Clipboard is temporarily busy. Try copying again.');}
}
const settings = { display: 'ms-settings:display', sound: 'ms-settings:sound', bluetooth: 'ms-settings:bluetooth', wifi: 'ms-settings:network-wifi', personalization: 'ms-settings:personalization', apps: 'ms-settings:appsfeatures', battery: 'ms-settings:powersleep' };
const localFile = path.join(__dirname, 'index.html');

function save() {
  try {
  const { clips, ...rest } = state;
  let encryptedClips = '';
  if(clips.length&&!safeStorage.isEncryptionAvailable())throw new Error('Windows encryption is unavailable; clipboard history was not overwritten.');
  if (clips.length && safeStorage.isEncryptionAvailable()) encryptedClips = safeStorage.encryptString(JSON.stringify(clips)).toString('base64');
  const temporary=storePath+'.tmp';
  fs.writeFileSync(temporary, JSON.stringify({ ...rest, encryptedClips }), { mode: 0o600 });
  fs.renameSync(temporary,storePath);
  storeDirty=false;clearTimeout(storeRetryTimer);storeRetryTimer=null;storeRetryDelay=1000;
  }catch(error){retrySave();throw error;}
}
function saveRuntime(){try{save();}catch{send('storage-error','Changes are active, but could not be saved. Soul will retry automatically.');}}
function load() {
  try {
    const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const { encryptedClips, ...rest } = data;
    state = { ...sanitize.preferences(rest), clips: [] };
    if(encryptedClips&&!safeStorage.isEncryptionAvailable())throw new Error('Encryption unavailable');
    if (encryptedClips && safeStorage.isEncryptionAvailable()) state.clips = sanitize.history(JSON.parse(safeStorage.decryptString(Buffer.from(encryptedClips, 'base64'))));
  } catch {
    // Preserve unreadable data for recovery instead of overwriting the only copy.
    if(fs.existsSync(storePath))try{fs.copyFileSync(storePath,storePath+'.recovery');}catch{}
    if(fs.existsSync(storePath))recoveryWarning='Saved preferences or clipboard history could not be read. A recovery copy was retained where possible.';
  }
}
function publicState() { return { ...state, clipboardRevision, clipboardWatching, recoveryWarning, encryptionAvailable: safeStorage.isEncryptionAvailable() }; }
const layouts = { settings: { width: 600, height: 550 }, apps: { width: 640, height: 480 }, search: { width: 640, height: 480 }, clipboard: { width: 640, height: 480 }, music: { width: 520, height: 430 }, power: { width: 600, height: 250 } };
function shapeIsland(width, height) {
  width*=displayScale;height*=displayScale;
  const left = Math.floor((canvas.width-width)/2);
  const w = Math.ceil(width), h = Math.ceil(height);
  // The unused canvas is excluded from both drawing and mouse interaction.
  const shoulder=Math.ceil(20*displayScale);
  win.setShape([{x:left-shoulder,y:0,width:w+shoulder*2,height:shoulder},{x:left,y:shoulder,width:w,height:Math.max(1,h-shoulder)}]);
}
function finishMotion(token) {
  if (token !== motionToken || !win || win.isDestroyed()) return;
  clearTimeout(layoutTimer);
  activeSize = pendingSize;
  shapeIsland(activeSize.width,activeSize.height);
  if(hiding && !expanded) {clearTimeout(hideTimer);win.hide();win.setIgnoreMouseEvents(false);hiding=false;}
}
function resize(open, tab = state.lastTab) {
  if (!Object.hasOwn(layouts,tab)) tab = 'settings';
  if (expanded === Boolean(open) && motionTab === tab) return;
  clearTimeout(layoutTimer);
  expanded = Boolean(open);
  motionTab = tab;
  const { width, height } = expanded ? layouts[tab] : { width: 340, height: 1 };
  const token = ++motionToken;
  // Give the spring room to overshoot without resizing the native surface.
  shapeIsland(Math.min(canvas.width/displayScale-40,Math.max(activeSize.width,pendingSize.width,width)+20),Math.min(canvas.height/displayScale-20,Math.max(activeSize.height,pendingSize.height,height)+20));
  pendingSize = { width,height };
  win.webContents.send('expanded', { open: expanded, tab, width, height, token });
  layoutTimer = setTimeout(()=>finishMotion(token),1600);
}
function createWindow() {
  const area = screen.getPrimaryDisplay().bounds;
  const geometry=displayGeometry(area);canvas.width=geometry.width;canvas.height=geometry.height;displayScale=geometry.scale;
  win = new BrowserWindow({ width: canvas.width, height: canvas.height, x: Math.round(area.x+(area.width-canvas.width)/2), y: area.y, frame: false, transparent: true, hasShadow: false, resizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: state.alwaysOnTop, show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  shapeIsland(activeSize.width,activeSize.height);
  win.webContents.setZoomFactor(displayScale);
  win.webContents.on('did-finish-load',()=>win.webContents.setZoomFactor(displayScale));
  win.loadFile(localFile);
  // Windows notifies immediately for each copy, including rapid consecutive copies.
  win.hookWindowMessage(0x031D,()=>{captureClipboard(true);setTimeout(()=>captureClipboard(),40);});
  const clipboardHandle=win.getNativeWindowHandle().readBigUInt64LE().toString();
  controls.request(app,'watch-clipboard',clipboardHandle).then(()=>{clipboardWatching=true;}).catch(()=>{}); // Polling remains a fallback.
  // The renderer opens Controls after its IPC listeners are ready.
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.on('close', event => { if (!quitting) { event.preventDefault(); hideSoul(); } });
  win.on('closed', () => { win = null; });
  win.on('blur', () => {
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      if (win && !win.isDestroyed() && win.isVisible() && !dialogDepth && !win.isFocused()) hideSoul();
    },120);
  });
  win.on('focus', () => clearTimeout(dismissTimer));
  win.on('will-move', (event, bounds) => {
    event.preventDefault();
    fitDisplay(screen.getDisplayMatching(bounds),bounds.x);
  });
}
function showControls() {
  clearTimeout(hideTimer);hiding=false;win.setIgnoreMouseEvents(false);
  clearTimeout(dismissTimer);
  if (!win.isVisible()) win.show();
  win.moveTop();
  if (state.lastTab !== 'settings') { state.lastTab = 'settings'; saveRuntime(); }
  resize(true,'settings');
  win.focus();
}
function hideSoul() {
  if(hiding||!win.isVisible())return;
  hiding=true;win.setIgnoreMouseEvents(true);
  resize(false,'settings');
  hideTimer=setTimeout(()=>{if(hiding && win && !win.isDestroyed()){win.hide();win.setIgnoreMouseEvents(false);hiding=false;}},1600);
}
function handle(name, fn) {
  ipcMain.handle(name, async (event, ...args) => {
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Unauthorized window');
    return fn(...args);
  });
}
function run(exe, args) { return new Promise((resolve,reject) => execFile(exe, args, { windowsHide: true,timeout:10000,maxBuffer:128*1024 }, error => error ? reject(new Error('Windows could not complete this action.')) : resolve(true))); }
function openStartApp(id) {
  return new Promise((resolve,reject) => execFile('explorer.exe', [`shell:AppsFolder\\${id}`], { windowsHide: true,timeout:10000,maxBuffer:128*1024 }, error => {
    // Explorer can return 1 after successfully handing off to the app broker.
    if (error && (error.killed || error.code !== 1)) reject(new Error('Windows could not launch this app.'));
    else resolve(true);
  }));
}
function nativeAction(action) {
  const script = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'media.ps1') : path.join(__dirname, 'media.ps1');
  return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, action]);
}
async function installedApps() {
  const shortcuts = await discoverApps([path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs'), path.join(app.getPath('appData'), 'Microsoft/Windows/Start Menu/Programs')]);
  const startApps = await new Promise(resolve => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | ConvertTo-Json -Compress'], { windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
    try { const result = error ? [] : JSON.parse(stdout); resolve(Array.isArray(result) ? result : [result]); } catch { resolve([]); }
  }));
  const names = new Set(shortcuts.map(a => a.name.toLowerCase()));
  for (const item of startApps) if (item?.Name && item?.AppID && !names.has(item.Name.toLowerCase())) { shortcuts.push({ name: item.Name, path: `app:${item.AppID}`, kind: 'app' }); names.add(item.Name.toLowerCase()); }
  return shortcuts.sort((a,b) => a.name.localeCompare(b.name));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) showControls(); });
  app.whenReady().then(async () => {
    if (process.env.SOUL_DEV_DATA) app.setPath('userData', path.resolve(process.env.SOUL_DEV_DATA));
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    storePath = path.join(app.getPath('userData'), 'preferences.json');
    load(); createWindow();
    const refit=()=>{clearTimeout(displayTimer);displayTimer=setTimeout(()=>{if(win&&!win.isDestroyed())fitDisplay(screen.getDisplayMatching(win.getBounds()));},150);};
    screen.on('display-removed',refit);screen.on('display-metrics-changed',refit);powerMonitor.on('resume',refit);
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    tray = new Tray(icon);
    tray.setToolTip('Soul · desktop island');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Show Soul', click: showControls }, { label: 'Quit Soul', click: () => app.quit() }]));
    tray.on('click', () => { hiding || !win.isVisible() ? showControls() : hideSoul(); });
    globalShortcut.register('CommandOrControl+Shift+Space', showControls);
    clipTimer = setInterval(captureClipboard,350);
    apps = await installedApps();
    send('apps-ready');
  });
}
handle('state', () => publicState());
handle('expand', open => {if(typeof open!=='boolean')throw new Error('Invalid visibility request');return open ? showControls() : hideSoul();});
handle('controls-read', async () => {const result=await controls.request(app,'read');brightnessMode=result.brightness===null?'software':'hardware';if(brightnessMode==='hardware')dimmer?.hide();return {...result,brightness:brightnessMode==='software'?softwareBrightness:result.brightness,brightnessError:brightnessMode==='software'?'Screen dimming · hardware brightness unavailable':result.brightnessError,brightnessMode};});
handle('media-state', () => controls.request(app,'playback'));
handle('media-seek', value=>{
  if(!value||typeof value.session!=='string'||typeof value.identity!=='string'||value.identity.length>10000||!Number.isFinite(value.position)||value.position<0||value.position>86400000)throw new Error('Invalid seek position');
  return controls.request(app,'seek',value);
});
handle('radios-state',()=>controls.request(app,'radios'));
handle('radio-set', (kind,on)=>{
  if(!['wifi','bluetooth'].includes(kind)||typeof on!=='boolean')throw new Error('Invalid radio state');
  return controls.request(app,'radio',{kind,on});
});
handle('clipboard-state', async () => {await captureClipboard();return publicState();});
handle('controls-set', (action,value) => {
  if (!['volume','brightness'].includes(action) || !Number.isInteger(value) || value < 0 || value > 100) throw new Error('Invalid slider value');
  if(action==='brightness'&&brightnessMode==='software')return dimScreen(value);
  return controls.request(app,action,value);
});
handle('motion-settled', finishMotion);
handle('layout', tab => { if (!Object.hasOwn(layouts,tab)) throw new Error('Unknown panel'); state.lastTab = tab; saveRuntime(); if (expanded) resize(true, tab); });
handle('hide', hideSoul);
handle('apps', () => apps);
handle('pin-add', async () => {
  const result = await ownedDialog('showOpenDialog', { title: 'Pin an application', filters: [{ name: 'Windows applications and shortcuts', extensions: ['exe', 'lnk'] }], properties: ['openFile'] });
  if (!result.canceled) {
    const p = result.filePaths[0];
    if (!/\.(exe|lnk)$/i.test(p)) throw new Error('Choose an executable or a Windows shortcut.');
    if (!state.pins.some(item => item.path === p)) state.pins.push({ name: path.basename(p).replace(/\.(exe|lnk)$/i,''), path: p, kind: 'app' });
    saveRuntime();
  }
  return publicState();
});
handle('pin', p => { const item = apps.find(a => a.path === p); if (!item) throw new Error('Unknown app'); if (!state.pins.some(a => a.path === p)) state.pins.push(item); saveRuntime(); return publicState(); });
handle('unpin', p => { state.pins = state.pins.filter(a => a.path !== p); saveRuntime(); return publicState(); });
handle('open', async p => {
  if (!state.pins.some(a => a.path === p) && !apps.some(a => a.path === p) && !searchAllowed.has(p)) throw new Error('Choose an app or a search result first.');
  if (p.startsWith('app:')) return openStartApp(p.slice(4));
  const error = await shell.openPath(p);
  if (error) throw new Error(error);
});
handle('reveal', p => { if (!searchAllowed.has(p)) throw new Error('Unknown search result'); shell.showItemInFolder(p); });
handle('root-add', async () => {
  const result = await ownedDialog('showOpenDialog', { title: 'Choose a folder to search', properties: ['openDirectory'] });
  if (!result.canceled && !state.roots.includes(result.filePaths[0])) { state.roots.push(result.filePaths[0]); saveRuntime(); }
  return publicState();
});
handle('root-remove', p => { state.roots = state.roots.filter(r => r !== p); saveRuntime(); return publicState(); });
handle('search', async query => {
  if (typeof query !== 'string' || query.length > 200) throw new Error('Invalid search');
  activeSearch?.abort();const controller=new AbortController();activeSearch=controller;
  const results = await searchFiles(state.roots, query,{signal:controller.signal});
  if(controller.signal.aborted)return {items:[],truncated:true};
  // Keep recent results valid while the renderer handles an in-flight search.
  for (const item of results.items) searchAllowed.add(item.path);
  if (searchAllowed.size > 2000) searchAllowed = new Set(results.items.map(i => i.path));
  return results;
});
handle('settings', id => { if (!Object.hasOwn(settings,id)) throw new Error('Unknown setting'); return shell.openExternal(settings[id]); });
handle('preference', async (key, value) => {
  if (!['alwaysOnTop', 'clipboardEnabled'].includes(key) || typeof value !== 'boolean') throw new Error('Invalid preference');
  if (key === 'clipboardEnabled' && value && !safeStorage.isEncryptionAvailable()) throw new Error('Windows encryption is unavailable.');
  state[key] = value;
  if (key === 'clipboardEnabled') {++clipboardEpoch;lastClipText='';appliedClipboardRead=++clipboardRead;if(value)await captureClipboard(true);}
  if (key === 'alwaysOnTop') win.setAlwaysOnTop(value);
  saveRuntime(); return publicState();
});
handle('clip-copy', async id => { const item = state.clips.find(c => c.id === id); if (!item)throw new Error('This clipboard entry was removed.');if(item.payloads)await clipboard.write([new ClipboardItem(Object.fromEntries(item.payloads.map(p=>[p.type,new Blob([Buffer.from(p.data,'base64')],{type:p.type})])))]);else await clipboard.writeText(item.text); });
handle('clip-remove', id => { state.clips = state.clips.filter(c => c.id !== id); saveRuntime();++clipboardRevision;return state.clips; });
handle('clip-clear', async () => {++clipboardEpoch;const item=await clipFormats.capture(clipboard);++clipboardEpoch;lastClipText=item?clipFormats.key(item):'';appliedClipboardRead=++clipboardRead;state.clips=[];saveRuntime();++clipboardRevision;return [];});
handle('media', action => { if (!['play', 'next', 'previous', 'volume-up', 'volume-down', 'mute'].includes(action)) throw new Error('Unknown media control'); return nativeAction(action); });
handle('power', async action => {
  if (action === 'cancel') return run('shutdown.exe', ['/a']);
  if (!['lock', 'restart', 'shutdown'].includes(action)) throw new Error('Unknown power action');
  const response = await ownedDialog('showMessageBox', { type: 'warning', title: 'Soul · Power', message: `${action === 'lock' ? 'Lock' : action === 'restart' ? 'Restart' : 'Shut down'} this computer?`, detail: action === 'lock' ? 'You will need to sign back in.' : 'Save your work first. Windows will begin in 60 seconds. You can cancel from Soul.', buttons: ['Cancel', 'Confirm'], defaultId: 0, cancelId: 0 });
  if (response.response !== 1) return false;
  if (action === 'lock') return run('rundll32.exe', ['user32.dll,LockWorkStation']);
  await run('shutdown.exe', [action === 'restart' ? '/r' : '/s', '/t', '60']); return true;
});
app.on('before-quit', () => { quitting = true;activeSearch?.abort();if(storeDirty)try{save();}catch{} controls.stop(); });
app.on('will-quit', () => { clearInterval(clipTimer); clearTimeout(layoutTimer); clearTimeout(dismissTimer);clearTimeout(hideTimer);clearTimeout(displayTimer);clearTimeout(storeRetryTimer);globalShortcut.unregisterAll(); });






