const fs=require('node:fs/promises');
const path=require('node:path');
const {scoreMatch}=require('./search-match');
async function* scanTree(roots,{signal,timeout=3000,onSkipped=()=>{},readDirectory=fs.readdir}={}){
  const queue=[...new Set(roots)],visited=new Set();let cursor=0;
  while(cursor<queue.length&&!signal?.aborted){
    const folder=queue[cursor];queue[cursor++]=null;
    const key=path.resolve(folder).toLowerCase();if(visited.has(key))continue;visited.add(key);
    let entries,timer,abort;
    try{entries=await Promise.race([readDirectory(folder,{withFileTypes:true}),new Promise(resolve=>{
      timer=setTimeout(()=>resolve(null),timeout);if(signal){abort=()=>resolve(null);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)resolve(null);}
    })]);}catch{onSkipped();continue;}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
    if(!entries){if(!signal?.aborted)onSkipped();continue;}
    for(const entry of entries){
      if(signal?.aborted)return;
      const full=path.join(folder,entry.name);yield {path:full,name:entry.name,kind:entry.isDirectory()?'folder':'file'};
      if(entry.isDirectory()&&!entry.isSymbolicLink())queue.push(full);
    }
  }
}
async function queryIndex(entries,query,{limit=100,signal}={}){
  const best=[];let scanned=0,matches=0;const count=entries.size;
  for(const item of entries.values()){
    if(signal?.aborted)return {items:[],truncated:false};
    const score=scoreMatch(item,query);
    if(score>=0){matches++;const candidate={...item,score},compare=(a,b)=>b.score-a.score||a.name.localeCompare(b.name)||a.path.localeCompare(b.path);if(best.length<limit||compare(candidate,best[best.length-1])<0){best.push(candidate);best.sort(compare);if(best.length>limit)best.pop();}}
    if(++scanned>=count)break;if(scanned%4096===0)await new Promise(resolve=>setImmediate(resolve));
  }
  return {items:best.map(({score,...item})=>item),truncated:matches>limit};
}
module.exports={scanTree,scoreMatch,queryIndex};
