const path=require('node:path');
const {createClient}=require('./controls');
const {searchFiles}=require('./library');
const {scoreMatch}=require('./search-match');
function createSearchService({app={isPackaged:false},extraRoots=()=>[],onStatus=()=>{},nativeClient=createClient({scriptName:'search.ps1',timeout:6000}),scan=searchFiles}={}){
  let status={engine:'Checking',note:'Checking native search engines…',ready:false,indexing:false,count:0,error:''},generation=0,busy=false,queued,active,closed=false;
  function publish(provider){status={...status,...provider,indexing:false,count:0};onStatus(status);}
  const empty=()=>({items:[],truncated:false,index:status});
  function cancel(){generation++;if(queued){queued.resolve(empty());queued=null;}if(active){active.controller.abort();active.resolve(empty());}}
  async function flush(){
    if(busy||closed)return;busy=true;
    try{while(queued&&!closed){
      const job=queued;queued=null;active=job;
      try{
        const roots=extraRoots().filter(root=>typeof root==='string'&&path.isAbsolute(root));
        const [result,additional]=await Promise.all([
          nativeClient.request(app,'query',job.query).catch(()=>({items:[],provider:{engine:'Unavailable',ready:false,error:'Start Everything or enable Windows Search.'}})),
          roots.length?scan(roots,job.query,{limit:100,budget:2000,signal:job.controller.signal,skipFolders:[],minLength:1,match:item=>scoreMatch(item,job.query)>=0}):Promise.resolve({items:[],truncated:false})
        ]);
        if(job.generation!==generation||closed){job.resolve(empty());continue;}
        publish(result.provider||{engine:'Unavailable',ready:false,error:'Search provider returned an invalid response.'});
        const items=[...new Map([...(Array.isArray(result.items)?result.items:[]),...additional.items].filter(item=>item&&typeof item.path==='string'&&path.isAbsolute(item.path)&&typeof item.name==='string'&&['file','folder'].includes(item.kind)).map(item=>[item.path.toLowerCase(),item])).values()];
        items.sort((a,b)=>scoreMatch(b,job.query)-scoreMatch(a,job.query)||a.name.localeCompare(b.name));
        job.resolve({items:items.slice(0,100),truncated:!!result.truncated||additional.truncated||items.length>100,index:{...status,scopedLimited:additional.truncated}});
      }catch(error){job.reject(error);}finally{if(active===job)active=null;}
    }}finally{busy=false;}
  }
  async function rebuild(){
    try{const provider=await nativeClient.request(app,'probe');if(!closed)publish(provider);}catch{if(!closed)publish({engine:'Unavailable',ready:false,error:'Start Everything or enable Windows Search.'});}return status;
  }
  function query(query){
    if(typeof query!=='string'||query.length>200)return Promise.reject(new Error('Invalid search query'));
    cancel();if(!query.trim()||closed)return Promise.resolve(empty());
    return new Promise((resolve,reject)=>{queued={query,generation,resolve,reject,controller:new AbortController()};flush();});
  }
  return {query,rebuild,cancel,status:()=>status,stop:()=>{closed=true;cancel();nativeClient.stop();}};
}
module.exports={createSearchService};
