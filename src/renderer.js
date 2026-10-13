const $ = selector => document.querySelector(selector);
const api = window.soul;
let state, installed = [], isOpen = false, currentTab = 'settings', searchGeneration = 0, toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
async function act(fn) { try { return await fn(); } catch (error) { toast(error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/,'')); } }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function empty(target, title, message) { const node = el('div','empty'); node.append(el('strong','',title),document.createTextNode(message)); target.append(node); }
function button(label, title, action, className='result-action') { const b = el('button',className,label); b.title = title; b.setAttribute('aria-label',title); b.onclick = () => act(action); return b; }
const panelLayouts = {settings:[600,550],apps:[640,480],search:[640,480],clipboard:[640,480],music:[520,430],power:[600,250]};
const liquid = { width:340,height:1,vw:0,vh:0,targetWidth:340,targetHeight:1,frame:0,time:0,token:0,progress:1,vp:0 };
let panelMotion;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function paintLiquid() {
  const surface = $('#island');
  surface.style.setProperty('--island-width',`${liquid.width}px`);
  surface.style.setProperty('--island-height',`${Math.max(1,liquid.height)}px`);
  surface.style.setProperty('--liquid-radius',`${20+Math.min(7,Math.abs(liquid.vh)*.01)}px`);
  surface.style.opacity=String(Math.max(0,Math.min(1,liquid.height/(isOpen?150:220))));
  if(panelMotion) {
    const p=Math.max(0,Math.min(1,liquid.progress)), {previous,next,direction,previousOpacity}=panelMotion;
    next.style.opacity=p;next.style.transform=`translateX(${direction*22*(1-p)}px)`;
    previous.style.opacity=(1-p)*previousOpacity;previous.style.transform=`translateX(${-direction*14*p}px)`;
    if(p>.999) {previous.hidden=true;previous.style.opacity='';previous.style.transform='';next.style.opacity='';next.style.transform='';panelMotion=null;}
  }
}
function flowTo(width,height,token) {
  liquid.targetWidth=width; liquid.targetHeight=height; liquid.token=token;
  liquid.progress=0;liquid.vp=0;
  if (reducedMotion.matches) {
    cancelAnimationFrame(liquid.frame); liquid.frame=0;
    liquid.width=width; liquid.height=height; liquid.vw=liquid.vh=0;liquid.progress=1;paintLiquid();
    if(api && token) act(()=>api.settled(token));
    return;
  }
  // Preserve velocity when interrupted, so reversing a gesture does not snap.
  if (liquid.frame) return;
  liquid.time=performance.now();
  function step(now) {
    const elapsed=Math.min(.05,(now-liquid.time)/1000); liquid.time=now;
    const count=Math.max(1,Math.ceil(elapsed/.008)), dt=elapsed/count;
    for(let i=0;i<count;i++) {
      liquid.vw+=(170*(liquid.targetWidth-liquid.width)-20*liquid.vw)*dt;
      liquid.vh+=(170*(liquid.targetHeight-liquid.height)-20*liquid.vh)*dt;
      liquid.width+=liquid.vw*dt; liquid.height+=liquid.vh*dt;
      liquid.vp+=(170*(1-liquid.progress)-20*liquid.vp)*dt;liquid.progress+=liquid.vp*dt;
    }
    paintLiquid();
    if(Math.abs(liquid.width-liquid.targetWidth)<.12 && Math.abs(liquid.height-liquid.targetHeight)<.12 && Math.abs(liquid.vw)<.6 && Math.abs(liquid.vh)<.6 && Math.abs(1-liquid.progress)<.001 && Math.abs(liquid.vp)<.01) {
      liquid.width=liquid.targetWidth;liquid.height=liquid.targetHeight;liquid.vw=liquid.vh=0;liquid.progress=1;liquid.frame=0;paintLiquid();
      if(api && liquid.token) act(()=>api.settled(liquid.token));
    } else liquid.frame=requestAnimationFrame(step);
  }
  liquid.frame=requestAnimationFrame(step);
}
function updateIndicator() {
  const tab = document.querySelector('.tab.active');
  if (!tab) return;
  $('#tab-indicator').style.left = `${tab.offsetLeft}px`;
  $('#tab-indicator').style.width = `${tab.offsetWidth}px`;
}
function showPanel(tab, animate = true) {
  if (!panelLayouts[tab]) tab = 'settings';
  const previous = $(`#${currentTab}`); const next = $(`#${tab}`);
  const previousOpacity=Number(getComputedStyle(previous).opacity);
  document.querySelectorAll('.panel').forEach(n=>{n.classList.remove('entering','leaving');if(n!==previous&&n!==next){n.hidden=true;n.style.opacity='';n.style.transform='';}});
  if (previous !== next && animate) {
    const tabs=[...document.querySelectorAll('[data-tab]')].map(n=>n.dataset.tab);
    panelMotion={previous,next,previousOpacity,direction:tabs.indexOf(tab)>tabs.indexOf(currentTab)?1:-1};
    next.style.opacity='0';
  } else {panelMotion=null;document.querySelectorAll('.panel').forEach(n=>{n.hidden=n!==next;n.style.opacity='';n.style.transform='';});}
  next.hidden = false;
  currentTab = tab;
  if(tab==='clipboard' && api) act(async()=>{mergeClipboard(await api.clipboardState());renderClips();});
  document.querySelectorAll('.tab').forEach(n => { n.classList.toggle('active',n.dataset.tab === tab); n.setAttribute('aria-selected',String(n.dataset.tab === tab)); });
  requestAnimationFrame(updateIndicator);
  if (tab === 'search' && isOpen) $('#file-query').focus();
}
function setExpanded(layout) {
  const open = typeof layout === 'boolean' ? layout : layout.open;
  const tab = typeof layout === 'boolean' ? currentTab : layout.tab;
  const size = panelLayouts[tab] || panelLayouts.settings;
  const width = open ? (layout.width || size[0]) : 340;
  const height = open ? (layout.height || size[1]) : 1;
  if (open) showPanel(tab);
  isOpen = open; document.body.classList.toggle('open',open); $('#expanded').inert = !open; $('#expanded').setAttribute('aria-hidden',String(!open));
  if(open && tab==='search')requestAnimationFrame(()=>{if(isOpen&&currentTab==='search'){$('#file-query').focus();$('#file-query').select();if($('#file-query').value.trim())doSearch();}});
  flowTo(width,height,layout.token);
  if (open && slidersReady) refreshControls();
  if (open && slidersReady) refreshPlayback();
  if (open && slidersReady) refreshRadios();
}
function setTab(tab) { if (api) act(() => api.layout(tab)); else setExpanded({open:true,tab,width:panelLayouts[tab][0],height:panelLayouts[tab][1]}); }
const iconPaths = {
  wifi:['M3 9a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 15a5 5 0 0 1 6 0','M12 18h.01'],
  bluetooth:['m8 7 9 10-5 4V3l5 4L8 17'],sound:['M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8'],
  display:['M3 4h18v13H3zM8 21h8m-4-4v4'],personalization:['M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 4v16'],battery:['M4 8h14v9H4zM20 11v3'],
  lock:['M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3'],restart:['M20 7v5h-5m5 0a8 8 0 1 0-2 6'],shutdown:['M12 2v10m-5-7a9 9 0 1 0 10 0'],
  previous:['M6 5v14M18 5l-9 7 9 7z'],next:['M18 5v14M6 5l9 7-9 7z'],play:['m8 5 11 7-11 7z'],pause:['M7 5h3v14H7zM14 5h3v14h-3z']
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
  for (const d of iconPaths[name] || []) { const p = document.createElementNS(svg.namespaceURI,'path'); p.setAttribute('d',d); if (['previous','next','play','pause'].includes(name) && d.includes('z')) p.setAttribute('fill','currentColor'); svg.append(p); }
  return svg;
}
function renderIcons() {
  document.querySelectorAll('[data-setting],[data-power],[data-radio]').forEach(b => { const span = b.querySelector(':scope > span'); if (span) span.replaceChildren(icon(b.dataset.setting || b.dataset.power || b.dataset.radio)); });
  document.querySelectorAll('[data-media]').forEach(b => { if (['previous','play','next'].includes(b.dataset.media)) b.replaceChildren(icon(b.dataset.media)); });
}
function resultRow(item, file=false) {
  const row = el('div','result-row');row.dataset.path=item.path; row.append(el('span','result-icon',file ? (item.kind === 'folder' ? '▱' : '▤') : item.name[0].toUpperCase()));
  const open = button('',`Open ${item.name}`,async()=>{await api.open(item.path);if(currentTab==='search')await api.hide();},'result-open'); open.title = item.path; open.append(el('span','result-name',item.name)); if(file) open.append(el('span','result-path',item.path)); row.append(open);
  const pinned = state.pins.some(p => p.path === item.path);
  const action = file ? button('↗',`Show ${item.name} in Explorer`,() => api.reveal(item.path)) : button(pinned?'★':'☆',`${pinned?'Unpin':'Pin'} ${item.name}`,async () => { state = await (pinned ? api.unpin(item.path) : api.pin(item.path)); renderPins(); renderApps(); },`result-action${pinned?' starred':''}`);
  row.append(action); return row;
}
function renderPins() {
  $('#pins').replaceChildren();
  $('#pins').classList.remove('app-grid');
  $('#pins-label').hidden = !state.pins.length;
  const query = $('#app-query').value.toLowerCase().trim();
  for (const item of state.pins.filter(i => i.name.toLowerCase().includes(query))) $('#pins').append(resultRow(item));
}
function renderApps() { renderPins(); const query = $('#app-query').value.toLowerCase().trim(); $('#app-list').replaceChildren(); const matches = installed.filter(i => i.name.toLowerCase().includes(query) && !state.pins.some(p=>p.path===i.path)); $('#app-count').textContent = `${installed.length} apps`; for (const item of matches.slice(0,100)) $('#app-list').append(resultRow(item)); if (!matches.length && !$('#pins').children.length) empty($('#app-list'),'No matching apps.','Add an app with the + button above.'); }
function renderRoots() { $('#roots').replaceChildren(); for (const root of state.roots) { const chip = el('span','root-chip',root); chip.title = root; chip.append(button('×',`Remove extra location ${root}`,async () => { state = await api.removeRoot(root); renderRoots(); doSearch(); })); $('#roots').append(chip); } }
let selectedResult=0,lastIndexRefresh=0,renderedSearchQuery='';
function selectResult(index){const rows=[...$('#file-list').querySelectorAll('.result-row')];selectedResult=rows.length?(index+rows.length)%rows.length:0;rows.forEach((row,i)=>{row.classList.toggle('search-selected',i===selectedResult);row.setAttribute('aria-current',String(i===selectedResult));});}
function paintIndex(status){
  state.searchIndex=status;$('#index-status').textContent=status.error||`${status.indexing?'Indexing your PC':status.ready?'Index ready':'Preparing index'} · ${status.count.toLocaleString()} items${status.skipped?` · ${status.skipped} locations unavailable`:''}${status.scopeWarning?` · ${status.scopeWarning}`:''}${status.watchWarning?` · ${status.watchWarning}`:''}`;
  $('#reindex').disabled=status.indexing;
  if(isOpen&&currentTab==='search'&&$('#file-query').value.trim()&&((status.ready&&!status.indexing)||Date.now()-lastIndexRefresh>1500)){lastIndexRefresh=Date.now();doSearch();}
}
async function doSearch() {
  const generation = ++searchGeneration; const query = $('#file-query').value.trim();const previousPath=renderedSearchQuery===query?$('#file-list .search-selected')?.dataset.path:null;renderedSearchQuery=query; $('#file-list').replaceChildren();
  if (!query) { $('#search-status').textContent = 'START TYPING TO SEARCH · ↑ ↓ TO CHOOSE · ENTER TO OPEN';if(api)api.cancelSearch();return; }
  const apps=[...new Map([...state.pins,...installed].map(item=>[item.path.toLowerCase(),item])).values()];
  const appMatches = apps.map(item=>({item,score:scoreMatch(item,query)})).filter(match=>match.score>=0).sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name)).slice(0,20).map(match=>match.item);
  for (const item of appMatches) $('#file-list').append(resultRow(item));
  selectResult(0);$('#search-status').textContent = 'SEARCHING YOUR PC…';
  const results = await act(() => api.search(query)); if (!results || generation !== searchGeneration) return;
  const combined=[...new Map([...results.items,...appMatches].map(item=>[item.path.toLowerCase(),item])).values()].sort((a,b)=>scoreMatch(b,query)-scoreMatch(a,query)||(a.kind==='app'?-1:0)-(b.kind==='app'?-1:0)||a.name.localeCompare(b.name));
  $('#file-list').replaceChildren();for (const item of combined) $('#file-list').append(resultRow(item,item.kind!=='app'));
  $('#search-status').textContent = `${combined.length} RESULTS${results.truncated?' · TOP MATCHES — NARROW YOUR QUERY':''}${results.index?.indexing?' · INDEXING CONTINUES':''}`;
  const rows=[...$('#file-list').querySelectorAll('.result-row')];selectResult(Math.max(0,rows.findIndex(row=>row.dataset.path===previousPath)));
  if (!appMatches.length && !results.items.length) empty($('#file-list'),'No matches yet.',results.index?.indexing?'Files will appear as indexing progresses.':'Try another name or refresh the file index.');
}
function mergeClipboard(snapshot) {
  if((snapshot.clipboardRevision??snapshot.revision??0)<(state.clipboardRevision??0))return;
  state.clips=snapshot.clips;state.clipboardRevision=snapshot.clipboardRevision??snapshot.revision??0;
  if('clipboardEnabled' in snapshot)state.clipboardEnabled=snapshot.clipboardEnabled;
}
function renderClips() {
  const list=$('#clip-list'), previous=new Map([...list.querySelectorAll('.clip-item:not(.clip-removing)')].map(row=>[row.dataset.id,{row,top:row.getBoundingClientRect().top}]));
  list.querySelector('.empty')?.remove();$('#clipboard-enabled').checked=state.clipboardEnabled;
  const status=$('#clipboard-status');if(status)status.textContent=state.clipboardEnabled?`Recording · ${state.clips.length} saved`:'History paused';
  const ids=new Set(state.clips.map(item=>item.id));
  for(const [id,{row}] of previous) if(!ids.has(id)) {
    const rect=row.getBoundingClientRect(),base=list.getBoundingClientRect();row.classList.add('clip-removing');row.inert=true;
    Object.assign(row.style,{position:'absolute',top:`${rect.top-base.top}px`,width:`${rect.width}px`,pointerEvents:'none'});
    row.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'translateX(14px) scale(.97)'}],{duration:reducedMotion.matches?1:220,easing:'cubic-bezier(.22,1,.36,1)'}).finished.then(()=>row.remove());
  }
  const movements=[];
  for(const item of state.clips) {
    let row=previous.get(item.id)?.row;
    if(!row) {
      row=el('div','clip-item');row.dataset.id=item.id;
      const content=el('div','clip-text');content.append(el('div','clip-time',`${item.kind||'Text'} · ${new Date(item.time).toLocaleString()}`));
      const image=item.payloads?.find(p=>['image/png','image/jpeg'].includes(p.type));
      if(image){const preview=el('img','clip-preview');preview.src=`data:${image.type};base64,${image.data}`;preview.alt='Copied image';content.append(preview);}
      content.append(document.createTextNode(item.text));
      const actions=el('div','clip-actions');actions.append(button('Copy','Copy this text',async()=>{await api.copyClip(item.id);toast('Copied. Paste it wherever you need.');}),button('×','Remove this clipboard item',async()=>{await api.removeClip(item.id);mergeClipboard(await api.clipboardState());renderClips();}));row.append(content,actions);
    }
    list.append(row);
    const old=previous.get(item.id);
    if(old) movements.push({row,top:old.top});
    else row.animate([{opacity:0,transform:'translateY(-12px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reducedMotion.matches?1:420,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  for(const {row,top} of movements){const offset=top-row.getBoundingClientRect().top;if(Math.abs(offset)>1)row.animate([{transform:`translateY(${offset}px)`},{transform:'translateY(0)'}],{duration:reducedMotion.matches?1:420,easing:'cubic-bezier(.16,1,.3,1)'});}
  if(!state.clips.length)empty(list,state.clipboardEnabled?'Ready for your next copy.':'Clipboard history is paused.',state.clipboardEnabled?'Copy text, an image or files in any app. They will appear here automatically.':'Turn on the switch above to save copied content.');
}
let slidersReady=false, readingControls=false;
let playing=false, readingPlayback=false, playbackGeneration=0, mediaBusy=false;
let mediaSnapshot,seekBusy=false,seekNext,seekRevision=0,radioState={},radioBusy=false;
async function flushSeek(){
  if(seekBusy)return;seekBusy=true;
  try{while(seekNext){const next=seekNext;seekNext=null;await api.seek(next);}}
  catch(error){seekNext=null;toast(error.message);}
  finally{seekBusy=false;++seekRevision;refreshPlayback();}
}
function timeLabel(seconds){const value=Math.max(0,Math.floor(seconds||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function paintMetadata(status){
  mediaSnapshot=status;
  for(const selector of ['.music-description h2','.track-info strong'])$(selector).textContent=status.available?(status.title||'Untitled track'):'Your soundtrack';
  for(const selector of ['.music-description p','.track-info small'])$(selector).textContent=status.available?([status.artist,status.album].filter(Boolean).join(' · ')||status.session||'Windows media'):'Start music in your player';
  for(const selector of ['.album-art','.compact-art']){
    const art=$(selector);let img=art.querySelector('img');
    if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(status.artwork||'')){if(!img){img=el('img');img.alt='Track artwork';art.append(img);}if(img.src!==status.artwork)img.src=status.artwork;art.classList.add('has-art');}
    else{img?.remove();art.classList.remove('has-art');}
  }
  document.querySelectorAll('.seek-control').forEach(row=>{
    const input=row.querySelector('input'),start=Number(status.start)||0,end=Number(status.end)||0,position=Math.max(start,Math.min(end,Number(status.position)||0));
    input.disabled=!status.available||!status.canSeek||end<=start;input.min=start;input.max=end;input.value=position;
    input.style.setProperty('--fill',`${end>start?(position-start)/(end-start)*100:0}%`);input.setAttribute('aria-valuetext',timeLabel(position-start));
    row.querySelector('.seek-position').textContent=timeLabel(position-start);row.querySelector('.seek-duration').textContent=timeLabel(end-start);
    row.querySelector('.seek-status').textContent=!status.available?'Start a track to see its timeline.':input.disabled?'This player does not support seeking.':'';
  });
}
async function refreshRadios(){
  if(radioBusy)return;radioBusy=true;
  try{paintRadios(await api.radios());}catch{document.querySelectorAll('[data-radio]').forEach(b=>{b.disabled=true;b.querySelector('small').textContent='Unavailable · use settings';});}finally{radioBusy=false;}
}
function paintRadios(radios){radioState=radios;document.querySelectorAll('[data-radio]').forEach(b=>{const status=radios[b.dataset.radio];b.disabled=!status?.available||status.disabled;b.classList.toggle('gold',!!status?.on);b.setAttribute('aria-pressed',String(!!status?.on));b.querySelector('small').textContent=status?.available?(status.disabled?'Hardware blocked':status.on?'On':'Off'):'Not available';});}
async function toggleRadio(kind){
  if(radioBusy)return;radioBusy=true;document.querySelectorAll('[data-radio]').forEach(b=>b.disabled=true);
  try{paintRadios(await api.setRadio(kind,!radioState[kind]?.on));}catch(error){toast(error.message);}finally{radioBusy=false;await refreshRadios();}
}
const playbackMorphs=new WeakMap();
function paintPlayback(value) {
  playing=value;
  document.querySelectorAll('[data-media="play"]').forEach(b=>{
    let morph=playbackMorphs.get(b);
    if(!morph) {const svg=icon('play');svg.replaceChildren();for(let i=0;i<2;i++){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('fill','currentColor');svg.append(path);}b.replaceChildren(svg);morph={paths:[...svg.children],value:0,frame:0,target:undefined};playbackMorphs.set(b,morph);}
    const target=playing?1:0;
    if(morph.target!==target) {
      cancelAnimationFrame(morph.frame);const from=morph.value,start=performance.now();morph.target=target;
      const triangles=[[8,5,13.5,8.5,13.5,15.5,8,19],[13.5,8.5,19,12,19,12,13.5,15.5]],bars=[[7,5,10,5,10,19,7,19],[14,5,17,5,17,19,14,19]];
      function step(now) {const p=reducedMotion.matches?1:Math.min(1,(now-start)/260),ease=p*p*(3-2*p);morph.value=from+(target-from)*ease;
        morph.paths.forEach((path,i)=>{const points=triangles[i].map((x,j)=>x+(bars[i][j]-x)*morph.value);path.setAttribute('d',`M${points[0]} ${points[1]}L${points[2]} ${points[3]}L${points[4]} ${points[5]}L${points[6]} ${points[7]}Z`);});
        if(p<1)morph.frame=requestAnimationFrame(step);else morph.frame=0;
      }step(start);if(!reducedMotion.matches && !morph.frame)morph.frame=requestAnimationFrame(step);
    }
    b.setAttribute('aria-label',playing?'Pause music':'Play music');b.title=playing?'Pause':'Play';
    b.dataset.playback=playing?'playing':'paused';
  });
}
async function refreshPlayback() {
  if(readingPlayback||mediaBusy)return;
  const generation=playbackGeneration,revision=seekRevision;readingPlayback=true;
  try {const status=await api.mediaState();if(generation===playbackGeneration && !mediaBusy){if(status.available)paintPlayback(status.playing);if(!seekBusy && revision===seekRevision && !document.querySelector('.seek-control input.dragging'))paintMetadata(status);}}
  catch {if(!seekBusy)paintMetadata({available:false}); /* Keep the last transport state for players without a Windows session. */ }
  finally {readingPlayback=false;}
}
async function controlMedia(action) {
  if(mediaBusy)return; mediaBusy=true;++playbackGeneration;
  const buttons=[...document.querySelectorAll('[data-media]')];buttons.forEach(b=>b.disabled=true);
  try {await api.media(action);if(action==='play')paintPlayback(!playing);}
  catch(error) {toast(error.message);}
  finally {mediaBusy=false;buttons.forEach(b=>b.disabled=false);setTimeout(refreshPlayback,300);}
}
const sliderJobs = {volume:{revision:0},brightness:{revision:0}};
function paintSlider(kind,value,error='') {
  document.querySelectorAll(`[data-control="${kind}"]`).forEach(row=>{
    const input=row.querySelector('input'); input.disabled=value===null;
    if(value!==null) {input.value=value;input.style.setProperty('--fill',`${value}%`);}
    row.querySelector('output').textContent=value===null?'Unavailable':`${value}%`;
    input.setAttribute('aria-valuetext',value===null?'Unavailable':`${value} percent`);
    row.querySelector('.slider-status').textContent=error;
  });
}
async function refreshControls() {
  if(readingControls || Object.values(sliderJobs).some(j=>j.busy||j.next!==undefined||j.timer))return;
  readingControls=true;
  const revisions=Object.fromEntries(Object.entries(sliderJobs).map(([kind,job])=>[kind,job.revision]));
  try { const levels=await api.readControls();
    const brightness=$('[data-control="brightness"]');brightness.querySelector('.slider-heading span').textContent=levels.brightnessMode==='software'?'Screen dimming':'Brightness';brightness.querySelector('input').setAttribute('aria-label',levels.brightnessMode==='software'?'Screen dimming':'Brightness');
    for(const kind of ['volume','brightness']) if(sliderJobs[kind].revision===revisions[kind] && !sliderJobs[kind].busy && sliderJobs[kind].next===undefined) paintSlider(kind,levels[kind],levels[`${kind}Error`]);
  } catch(error) {for(const kind of ['volume','brightness']) paintSlider(kind,null,'Windows control unavailable. Reopen to try again.');}
  finally {readingControls=false;}
}
async function flushSlider(kind) {
  const job=sliderJobs[kind]; clearTimeout(job.timer);job.timer=null;
  if(job.busy||job.next===undefined)return;
  job.busy=true;const value=job.next;delete job.next;
  try { await api.setControl(kind,value); }
  catch(error) {delete job.next;toast(error.message);}
  finally {job.busy=false;if(job.next!==undefined)flushSlider(kind);else refreshControls();}
}
function initSliders() {
  slidersReady=true;
  document.querySelectorAll('.slider-control input').forEach(input=>{
    const kind=input.closest('[data-control]')?.dataset.control;
    input.addEventListener('pointerdown',()=>input.classList.add('dragging'));
    const release=()=>input.classList.remove('dragging');input.addEventListener('pointerup',release);input.addEventListener('pointercancel',release);input.addEventListener('blur',release);
    if(kind){input.oninput=()=>{const value=Number(input.value);paintSlider(kind,value);const job=sliderJobs[kind];++job.revision;job.next=value;clearTimeout(job.timer);job.timer=setTimeout(()=>flushSlider(kind),80);};input.onchange=()=>flushSlider(kind);}
    else {
      let target;
      input.oninput=()=>{++seekRevision;target={session:mediaSnapshot?.session,identity:mediaSnapshot?.identity,position:Number(input.value)};const row=input.closest('.seek-control');row.querySelector('.seek-position').textContent=timeLabel(target.position-Number(input.min));input.style.setProperty('--fill',`${(target.position-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);};
      input.onchange=()=>{if(!target)return;seekNext=target;target=null;input.classList.remove('dragging');flushSeek();};
    }
  });
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,()=>document.querySelectorAll('.slider-control input.dragging').forEach(input=>input.classList.remove('dragging')));
  setInterval(()=>{if(isOpen)refreshControls();},8000);
  setInterval(()=>{if(isOpen)refreshPlayback();},2000);
  setInterval(()=>{if(isOpen)refreshRadios();},8000);
}
async function init() {
  state = await api.state(); installed = await api.apps(); renderPins(); renderApps(); renderRoots(); renderClips(); renderIcons(); showPanel(panelLayouts[state.lastTab] ? state.lastTab : 'settings',false); $('#always-on-top').checked = state.alwaysOnTop;
  $('#collapse').onclick = () => act(() => api.expand(false));
  document.addEventListener('keydown',e => { if (e.key === 'Escape') act(() => api.expand(false)); });
  document.addEventListener('pointerdown',e=>{if(isOpen && !e.target.closest('#island'))act(()=>api.hide());});
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  document.querySelectorAll('[data-setting]').forEach(b => b.onclick = () => act(() => api.settings(b.dataset.setting)));
  document.querySelectorAll('[data-radio]').forEach(b=>b.onclick=()=>toggleRadio(b.dataset.radio));
  document.querySelectorAll('[data-media]').forEach(b => b.onclick = () => controlMedia(b.dataset.media));
  document.querySelectorAll('[data-power]').forEach(b => b.onclick = () => act(async () => { const done = await api.power(b.dataset.power); if (done) toast(b.dataset.power === 'lock'?'Computer locked':'Scheduled in 60 seconds. You can cancel below.'); }));
  $('#cancel-power').onclick = () => act(async () => { await api.power('cancel'); toast('Pending shutdown or restart canceled'); });
  $('#add-app').onclick = () => act(async () => { state = await api.addPin(); renderApps(); });
  $('#add-folder').onclick = () => act(async () => { state = await api.addRoot(); renderRoots(); doSearch(); });
  $('#reindex').onclick=()=>act(async()=>paintIndex(await api.reindex()));
  $('#hide').onclick = () => api.hide();
  $('#app-query').oninput = renderApps;
  let debounce; $('#file-query').oninput = () => { ++searchGeneration;clearTimeout(debounce);api.cancelSearch();debounce=setTimeout(doSearch,100); };
  $('#file-query').onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();selectResult(selectedResult+(e.key==='ArrowDown'?1:-1));$('#file-list .search-selected')?.scrollIntoView({block:'nearest'});}else if(e.key==='Enter'){e.preventDefault();$('#file-list .search-selected .result-open')?.click();}};
  $('#clipboard-enabled').onchange = async () => {const input=$('#clipboard-enabled');input.disabled=true;try {mergeClipboard(await api.preference('clipboardEnabled',input.checked));}catch(error){toast(error.message);}finally{input.disabled=false;renderClips();}};
  $('#always-on-top').onchange = () => act(async () => { state = await api.preference('alwaysOnTop',$('#always-on-top').checked); });
  $('#clear-clips').onclick = () => act(async () => {await api.clearClips();mergeClipboard(await api.clipboardState());renderClips();});
  api.onExpanded(setExpanded); api.onClips(payload => {mergeClipboard(payload);renderClips();}); api.onAppsReady(async () => { installed = await api.apps(); renderApps();if(currentTab==='search'&&$('#file-query').value.trim())doSearch(); });
  api.onClipboardError(toast);
  api.onStorageError(toast);
  api.onSearchIndex(paintIndex);paintIndex(await api.indexState());
  new ResizeObserver(updateIndicator).observe($('nav'));
  initSliders(); await api.expand(true);refreshRadios();
  if(state.recoveryWarning)toast(state.recoveryWarning);
}
if (api) act(init); else { state = {pins:[],roots:[],clips:[],clipboardEnabled:false}; renderPins(); renderRoots(); renderClips(); renderIcons(); setExpanded({open:true,tab:'settings',width:600,height:550}); document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab)); new ResizeObserver(updateIndicator).observe($('nav')); }





