require('./mock-search.cjs');
// Electron integration check: exercises our own renderer, never system actions.
const {app,BrowserWindow,clipboard} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
app.setPath('userData',path.join(root,'.soul-dev','ui-check-profile'));
// Substitute only clipboard/media operations; never touch the user's copied text or player.
let copiedText='Soul clipboard integration sample', pastedText='', fakePlaying=true;
clipboard.readText=async()=>copiedText;clipboard.writeText=async text=>{pastedText=text;};
clipboard.read=async()=>[];
const nativeControls=require('../src/controls');const realRequest=nativeControls.request;
nativeControls.request=(app,action,value)=>action==='playback'?Promise.resolve({available:true,playing:fakePlaying}):realRequest(app,action,value);
const childProcess=require('node:child_process');const realExec=childProcess.execFile;
childProcess.execFile=(exe,args,options,callback)=>{
  if(args?.some(arg=>String(arg).endsWith('media.ps1'))) {if(args.at(-1)==='play')fakePlaying=!fakePlaying;setTimeout(()=>callback(null,''),10);return;}
  return realExec(exe,args,options,callback);
};
require('../src/main.js');
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  try {
    await pause(1400);
    const window = BrowserWindow.getAllWindows()[0];
    assert.ok(window,'Soul window exists');
    const output = path.join(root,'.soul-dev','screens'); fs.mkdirSync(output,{recursive:true});
    async function capture(name) {
      const rect=await window.webContents.executeJavaScript("(()=>{const r=document.querySelector('#island').getBoundingClientRect();return{x:Math.round(r.x-20),y:0,width:Math.round(r.width+40),height:Math.round(r.height)}})()");
      fs.writeFileSync(path.join(output,`${name}.png`),(await window.webContents.capturePage(rect)).toPNG());
    }
    const stableBounds=window.getBounds(); let nativeResizes=0;
    window.on('resize',()=>nativeResizes++);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('.topbar')"),null,'compact media window removed');
    await window.webContents.executeJavaScript("document.querySelector('#collapse').click()");await pause(1200);assert.equal(window.isVisible(),false);
    const samples=await window.webContents.executeJavaScript(`new Promise(resolve=>{
      const points=[];const started=performance.now();window.soul.expand(true);
      function sample(now){const r=document.querySelector('#island').getBoundingClientRect();points.push({time:now-started,width:r.width,height:r.height});if(now-started<1250)requestAnimationFrame(sample);else resolve(points)}requestAnimationFrame(sample);
    })`);
    assert.ok(samples.length>16,'opening renders multiple animation frames');
    assert.ok(samples.some(p=>p.width>310&&p.width<450),'opening passes through intermediate widths');
    assert.ok(samples[0].width<400,'shortcut opening does not snap to full size');
    console.log(`PASS spring opening: ${samples.length} frames, first width ${samples[0].width.toFixed(1)}px`);
    const sizes = {settings:[600,550],apps:[640,480],search:[640,480],clipboard:[640,480],music:[520,430],power:[600,250]};
    for (const tab of Object.keys(sizes)) {
      await window.webContents.executeJavaScript(`document.querySelector('[data-tab="${tab}"]').click()`);
      await pause(1200);
      const actual = window.getBounds(); assert.deepEqual(actual,stableBounds,`${tab} does not resize or move the native surface`);
      const island=await window.webContents.executeJavaScript("(()=>{const r=document.querySelector('#island').getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]})()");
      assert.deepEqual(island,sizes[tab],`${tab} island dimensions`);
      assert.equal(actual.y,require('electron').screen.getDisplayMatching(actual).bounds.y,'native window is attached to the screen edge');
      assert.equal(await window.webContents.executeJavaScript("document.querySelector('#island').getBoundingClientRect().top"),0,'no CSS gap above island');
      const view = await window.webContents.executeJavaScript(`({active:document.querySelector('.tab.active').dataset.tab,visible:[...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id),contentHeight:document.querySelector('.content').clientHeight,scrollHeight:document.querySelector('#${tab}').scrollHeight})`);
      assert.equal(view.active,tab); assert.deepEqual(view.visible,[tab]);
      if (['settings','music','power'].includes(tab)) assert.equal(view.scrollHeight,view.contentHeight,`${tab} controls fit without scrolling`);
      await capture(tab);
      console.log(`PASS ${tab}: ${actual.width}x${actual.height}, content ${view.contentHeight}px / ${view.scrollHeight}px`);
    }
    const levels=await window.webContents.executeJavaScript('window.soul.readControls()');
    const sliders=await window.webContents.executeJavaScript("[...document.querySelectorAll('.slider-control[data-control]')].map(row=>({kind:row.dataset.control,value:Number(row.querySelector('input').value),disabled:row.querySelector('input').disabled,text:row.querySelector('output').textContent}))");
    for(const slider of sliders) {assert.equal(slider.disabled,levels[slider.kind]===null);if(!slider.disabled)assert.equal(slider.value,levels[slider.kind]);}
    assert.equal(await window.webContents.executeJavaScript("window.soul.setControl('volume',-1).then(()=>false,()=>true)"),true,'invalid slider values rejected');
    console.log('PASS sliders reflect Windows levels and reject invalid values');
    await window.webContents.executeJavaScript("window.soul.preference('clipboardEnabled',true)");await pause(400);
    let clipState=await window.webContents.executeJavaScript('window.soul.clipboardState()');
    assert.equal(clipState.clips[0].text,copiedText,'enabling immediately captures current text');
    await window.webContents.executeJavaScript(`window.soul.copyClip('${clipState.clips[0].id}')`);assert.equal(pastedText,copiedText);
    copiedText='Second Soul clipboard sample';await pause(450);
    clipState=await window.webContents.executeJavaScript('window.soul.clipboardState()');assert.equal(clipState.clips[0].text,copiedText,'polling captures new text');
    assert.ok(!fs.readFileSync(path.join(app.getPath('userData'),'preferences.json'),'utf8').includes(copiedText),'history encrypted on disk');
    await window.webContents.executeJavaScript("window.soul.preference('clipboardEnabled',false)");copiedText='Paused clipboard sample';await pause(450);
    clipState=await window.webContents.executeJavaScript('window.soul.clipboardState()');assert.notEqual(clipState.clips[0].text,copiedText,'paused history does not capture');
    await window.webContents.executeJavaScript('window.soul.clearClips()');
    await window.webContents.executeJavaScript("document.querySelector('[data-tab=music]').click()");await pause(1200);
    await window.webContents.executeJavaScript("document.querySelector('#music [data-media=play]').click()");await pause(500);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('#music [data-media=play]').dataset.playback"),'paused');
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('#settings [data-media=play]').getAttribute('aria-label')"),'Play music');
    const morph=await window.webContents.executeJavaScript(`new Promise(resolve=>{const b=document.querySelector('#music [data-media=play]');b.click();setTimeout(()=>{const start=b.querySelector('path').getAttribute('d');setTimeout(()=>resolve([start,b.querySelector('path').getAttribute('d')]),280)},50)})`);
    assert.notEqual(morph[0],morph[1],'play/pause path morphs through intermediate geometry');await pause(200);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('#music [data-media=play]').dataset.playback"),'playing');
    fakePlaying=false;await pause(2200);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('#music [data-media=play]').dataset.playback"),'paused','external playback changes update icon');
    console.log('PASS clipboard capture, copy, pause, encryption and synchronized play/pause icons');
    const sliderStyle=await window.webContents.executeJavaScript("(()=>{const s=document.querySelector('#settings .slider-control input');s.dispatchEvent(new PointerEvent('pointerdown'));const result={dragging:s.classList.contains('dragging'),registered:CSS.supports('transition','--fill 100ms linear'),button:getComputedStyle(document.querySelector('#collapse')).transitionTimingFunction};s.dispatchEvent(new PointerEvent('pointerup'));return result})()");
    assert.equal(sliderStyle.dragging,true);assert.equal(sliderStyle.registered,true);assert.ok(sliderStyle.button.includes('1.65'),'button releases with spring easing');
    const dismissal=await window.webContents.executeJavaScript(`new Promise(resolve=>{const values=[],start=performance.now();window.soul.expand(false);function sample(now){const island=document.querySelector('#island');values.push({height:island.getBoundingClientRect().height,opacity:Number(getComputedStyle(island).opacity)});if(now-start<400)requestAnimationFrame(sample);else resolve(values)}requestAnimationFrame(sample)})`);
    assert.ok(dismissal.some(p=>p.height>2&&p.height<300),'dismissal shrinks through intermediate heights');
    assert.ok(dismissal.some(p=>p.opacity>0&&p.opacity<.95),'dismissal fades while shrinking');
    await pause(1000);assert.equal(window.isVisible(),false);app.emit('second-instance');await pause(1200);
    console.log('PASS icon morph, slider drag feedback, spring buttons, and fading dismissal');
    // Rapid navigation must settle on one panel and the final native size.
    await window.webContents.executeJavaScript(`for(const tab of ['power','music','apps','settings'])document.querySelector('[data-tab="'+tab+'"]').click()`);
    await pause(1200); assert.equal(await window.webContents.executeJavaScript("document.querySelector('.tab.active').dataset.tab"),'settings');
    assert.deepEqual(window.getBounds(),stableBounds);
    await window.webContents.executeJavaScript("document.querySelector('[data-tab=apps]').click()");
    await pause(500);
    app.emit('second-instance');
    await pause(1200);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('.tab.active').dataset.tab"),'search','invocation always opens Search');
    await capture('settings');
    await window.webContents.executeJavaScript("document.querySelector('#collapse').click()");
    await pause(1200); assert.deepEqual(window.getBounds(),stableBounds);
    assert.deepEqual(await window.webContents.executeJavaScript("(()=>{const r=document.querySelector('#island').getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]})()"),[340,1]);
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('#expanded').inert"),true);
    // Reverse the motion before it finishes, then change native focus mid-flight.
    app.emit('second-instance');await pause(100);
    await window.webContents.executeJavaScript("document.querySelector('#collapse').click()");await pause(100);
    app.emit('second-instance');
    const other=new BrowserWindow({width:200,height:100,show:true,webPreferences:{sandbox:true}});
    await other.loadURL('data:text/html,<title>Soul focus test</title>');other.focus();
    await pause(1200);other.destroy();
    assert.deepEqual(window.getBounds(),stableBounds);
    assert.equal(nativeResizes,0,'no native resize during animations or focus changes');
    assert.deepEqual(await window.webContents.executeJavaScript("(()=>{const r=document.querySelector('#island').getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]})()"),[340,1]);
    assert.equal(window.isVisible(),false,'outside focus hides the whole island');
    console.log('PASS outside focus hides the whole island without native resizing');
    app.emit('second-instance'); await pause(1200); assert.equal(window.isVisible(),true);
    await window.webContents.executeJavaScript("document.querySelector('#hide').click()");
    await pause(1200);assert.equal(window.isVisible(),false);
    assert.deepEqual(await window.webContents.executeJavaScript("(()=>{const r=document.querySelector('#island').getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]})()"),[340,1]);
    app.emit('second-instance');await pause(1200);assert.equal(window.isVisible(),true);
    assert.equal(nativeResizes,0);
    console.log('PASS hidden reopen starts directly in Search, with a stable native surface');
    console.log('PASS edge attachment, direct Search invocation, rapid navigation and collapse');
    fs.writeFileSync(path.join(root,'.soul-dev','ui-check-result.txt'),'PASS');
    app.quit();
  } catch(error) { console.error(error); fs.writeFileSync(path.join(root,'.soul-dev','ui-check-result.txt'),String(error.stack)); app.quit(); }
});





