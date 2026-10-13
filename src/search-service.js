const {Worker}=require('node:worker_threads');
const path=require('node:path');
const {execFile}=require('node:child_process');
const os=require('node:os');
function createSearchService({directory,extraRoots=()=>[],getRoots,onStatus=()=>{}}){
  let worker,sequence=0,timer,rebuilding=false,queuedRebuild=false;
  let status={indexing:false,count:0,skipped:0,ready:false,error:'',updated:0};const pending=new Map();
  function stop(){clearInterval(timer);worker?.terminate();worker=null;for(const task of pending.values()){clearTimeout(task.timer);task.reject(new Error('Search worker stopped.'));}pending.clear();}
  function start(){
    if(worker)return;const workerFile=path.basename(path.dirname(__dirname))==='app.asar'?path.join(process.resourcesPath,'app.asar.unpacked','src','search-worker.js'):path.join(__dirname,'search-worker.js');
    const child=new Worker(workerFile,{workerData:{directory}});worker=child;
    child.on('message',message=>{
      if(message.status){const finished=status.indexing&&!message.status.indexing;status={...message.status,scopeWarning:status.scopeWarning};onStatus(status);if(finished&&queuedRebuild){queuedRebuild=false;rebuild();}return;}
      const task=pending.get(message.id);if(!task)return;pending.delete(message.id);clearTimeout(task.timer);message.error?task.reject(new Error(message.error)):task.resolve(message.result);
    });
    const failed=()=>{if(worker!==child)return;stop();status={...status,indexing:false,error:'Search stopped unexpectedly. Press Refresh index to retry.'};onStatus(status);};
    child.on('error',failed);child.on('exit',failed);timer=setInterval(()=>{if(!status.indexing)rebuild();},20*60*1000);timer.unref();
  }
  async function rebuild(){
    if(status.indexing){queuedRebuild=true;return status;}if(rebuilding)return status;rebuilding=true;start();
    try{
      const drives=getRoots?[]:await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command','[System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -in "Fixed","Removable","Network" } | ForEach-Object { $_.Name } | ConvertTo-Json -Compress'],{windowsHide:true,timeout:10000,maxBuffer:16384},(error,text)=>{try{const value=JSON.parse(text);resolve((Array.isArray(value)?value:[value]).filter(p=>typeof p==='string'&&/^[A-Z]:\\$/i.test(p)));}catch{resolve([]);}}));
      status.scopeWarning=!getRoots&&!drives.length?'Drive discovery unavailable · home and extra locations only':'';
      const roots=[...new Set(getRoots?await getRoots():[os.homedir(),...extraRoots(),...drives])];worker?.postMessage({action:'rebuild',roots});return {...status,indexing:true};
    }finally{rebuilding=false;}
  }
  function query(query){start();return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Search timed out. Try a more specific query.'));},15000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,action:'query',query});});}
  return {rebuild,query,status:()=>status,cancel:()=>worker?.postMessage({action:'cancel'}),stop};
}
module.exports={createSearchService};
