const {parentPort,workerData}=require('node:worker_threads');
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path');
const {createInterface}=require('node:readline');
const {once}=require('node:events');
const {scanTree,queryIndex}=require('./search-index');
let entries=new Map(),scanController,queryController,scanPromise,activeSnapshot;
let watchers=[],changeTimer,applying=false,watchEpoch=0;const changes=new Set();
let status={indexing:false,count:0,skipped:0,ready:false,error:'',updated:0};
const cache=path.join(workerData.directory,'file-index.ndjson');
const key=item=>item.path.toLowerCase();
function publish(){status.count=entries.size;parentPort.postMessage({status});}
function setItem(item){entries.set(key(item),item);activeSnapshot?.set(key(item),item);}
async function applyChanges(){
  changeTimer=null;if(applying)return;applying=true;const epoch=watchEpoch,batch=[...changes];changes.clear();
  try{
  for(const full of batch){
    if(epoch!==watchEpoch)break;
    try{const stat=await fsp.lstat(full);if(epoch!==watchEpoch)break;const item={path:full,name:path.basename(full),kind:stat.isDirectory()?'folder':'file'};setItem(item);
      if(stat.isDirectory()&&!stat.isSymbolicLink())for await(const child of scanTree([full],{onSkipped:()=>status.skipped++})){if(epoch!==watchEpoch)break;setItem(child);}
    }catch{
      const id=full.toLowerCase(),folder=entries.get(id)?.kind==='folder';entries.delete(id);activeSnapshot?.delete(id);
      if(folder)for(const candidate of entries.keys())if(candidate.startsWith(id+path.sep)){entries.delete(candidate);activeSnapshot?.delete(candidate);}
    }
  }
  publish();
  }finally{applying=false;if(changes.size&&!changeTimer)changeTimer=setTimeout(applyChanges,150);}
}
function watchRoots(roots){
  ++watchEpoch;watchers.forEach(w=>w.close());watchers=[];changes.clear();clearTimeout(changeTimer);changeTimer=null;status.watchWarning='';
  const distinct=roots.filter((root,index)=>!roots.some((parent,j)=>j!==index&&root.toLowerCase().startsWith(parent.toLowerCase().replace(/[\\/]$/,'')+path.sep)));
  for(const root of distinct)try{
    const watcher=fs.watch(root,{recursive:true},(event,name)=>{
      if(event==='change')return;
      if(!name){status.watchWarning='Some changes need Refresh index.';publish();return;}
      const full=path.resolve(root,String(name));if(full.toLowerCase()===cache.toLowerCase()||full.toLowerCase()===(cache+'.tmp').toLowerCase())return;
      changes.add(full);if(!changeTimer&&!applying)changeTimer=setTimeout(applyChanges,150);
    });
    watcher.on('error',()=>{status.watchWarning='Some locations need Refresh index.';publish();});watchers.push(watcher);
  }catch{status.watchWarning='Some locations need Refresh index.';}
}
async function loadCache(){
  try{const stream=fs.createReadStream(cache,{encoding:'utf8'});const lines=createInterface({input:stream,crlfDelay:Infinity});
    stream.on('error',()=>lines.close());for await(const line of lines){try{const item=JSON.parse(line);if(typeof item.path==='string'&&path.isAbsolute(item.path)&&['folder','file'].includes(item.kind))entries.set(key(item),{...item,name:path.basename(item.path)});}catch{}}
    status.ready=entries.size>0;
  }catch{}publish();
}
const loaded=loadCache();
async function rebuild(roots){
  await loaded;
  if(scanPromise)return scanPromise;
  scanPromise=(async()=>{
    scanController=new AbortController();status={...status,indexing:true,skipped:0,error:''};const fresh=new Map();activeSnapshot=fresh;watchRoots(roots);publish();let notified=Date.now();
    try{
      for await(const item of scanTree(roots,{signal:scanController.signal,onSkipped:()=>status.skipped++})){
        fresh.set(key(item),item);entries.set(key(item),item);
        if(Date.now()-notified>500){publish();notified=Date.now();await new Promise(resolve=>setImmediate(resolve));}
      }
      if(scanController.signal.aborted)return;
      entries=fresh;status.ready=true;status.updated=Date.now();
      await fsp.mkdir(workerData.directory,{recursive:true});const temporary=cache+'.tmp',stream=fs.createWriteStream(temporary,{encoding:'utf8'});
      let writeError;stream.on('error',error=>{writeError=error;});
      try{for(const item of entries.values()){if(writeError)throw writeError;if(!stream.write(JSON.stringify(item)+'\n'))await once(stream,'drain');}stream.end();await once(stream,'finish');await fsp.rename(temporary,cache);}
      finally{stream.destroy();}
    }catch{status.error='The index could not be fully saved. Available results remain searchable.';}
    finally{activeSnapshot=null;status.indexing=false;scanPromise=null;publish();}
  })();return scanPromise;
}
parentPort.on('message',async message=>{
  try{
    if(message.action==='rebuild'){rebuild(message.roots);return;}
    if(message.action==='cancel'){queryController?.abort();return;}
    if(message.action==='query'){
      await loaded;queryController?.abort();const controller=new AbortController();queryController=controller;
      const result=await queryIndex(entries,message.query,{signal:controller.signal});parentPort.postMessage({id:message.id,result:{...result,index:{...status,count:entries.size}}});
    }
  }catch{parentPort.postMessage({id:message.id,error:'Search is temporarily unavailable. Try again.'});}
});
