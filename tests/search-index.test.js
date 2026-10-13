const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {scanTree,scoreMatch,queryIndex}=require('../src/search-index');
const {createSearchService}=require('../src/search-service');
test('global index includes hidden, AppData and dependency folders and deduplicates roots',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'soul-index-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const dir of ['.hidden','AppData','node_modules','deep/one/two/three']){await fs.mkdir(path.join(root,dir),{recursive:true});await fs.writeFile(path.join(root,dir,'needle.txt'),'');}
 const items=[];for await(const item of scanTree([root,root,path.join(root,'AppData')]))items.push(item);
 assert.equal(items.filter(i=>i.name==='needle.txt').length,4);assert.equal(new Set(items.map(i=>i.path)).size,items.length);
});
test('index tolerates missing/denied folders, stuck reads, cancellation and junction loops',async()=>{
 let skipped=0;const root=path.resolve('fixture'),readDirectory=async p=>{if(p===root)return [{name:'junction',isDirectory:()=>true,isSymbolicLink:()=>true},{name:'denied',isDirectory:()=>true,isSymbolicLink:()=>false}];throw new Error('denied');};
 const items=[];for await(const i of scanTree([root],{readDirectory,onSkipped:()=>skipped++}))items.push(i);assert.equal(items.length,2);assert.equal(skipped,1);
 for await(const _ of scanTree([root],{timeout:10,readDirectory:()=>new Promise(()=>{}),onSkipped:()=>skipped++}))assert.fail();assert.equal(skipped,2);
 const controller=new AbortController();controller.abort();for await(const _ of scanTree([root],{signal:controller.signal,readDirectory}))assert.fail();
});
test('search ranks exact names, supports path words and fuzzy names, and limits results',async()=>{
 const items=[{name:'budget.xlsx',path:path.resolve('finance/budget.xlsx'),kind:'file'},{name:'old-budget.xlsx',path:path.resolve('archive/old-budget.xlsx'),kind:'file'}];
 assert.ok(scoreMatch(items[0],'budget.xlsx')>scoreMatch(items[1],'budget.xlsx'));assert.ok(scoreMatch(items[0],'finance budget')>=0);assert.ok(scoreMatch(items[0],'bdgt')>=0);
 const result=await queryIndex(new Map(items.map(i=>[i.path,i])),'budget',{limit:1});assert.equal(result.items[0].name,'budget.xlsx');assert.equal(result.truncated,true);
 const controller=new AbortController();controller.abort();assert.deepEqual((await queryIndex(new Map(items.map(i=>[i.path,i])),'budget',{signal:controller.signal})).items,[]);
});
test('scan indexes more than the former 15,000-entry limit',async()=>{
 const readDirectory=async()=>Array.from({length:16050},(_,i)=>({name:`entry-${i}.txt`,isDirectory:()=>false,isSymbolicLink:()=>false}));let count=0;
 for await(const item of scanTree([path.resolve('fixture')],{readDirectory}))count++;assert.equal(count,16050);
});
test('worker persists, reloads, and removes deleted files on refresh',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'soul-worker-')),data=path.join(root,'cache'),files=path.join(root,'files');t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(files);
 await fs.writeFile(path.join(files,'needle.txt'),'');let service=createSearchService({directory:data,getRoots:async()=>[files]});t.after(()=>service.stop());
 const wait=async()=>{for(let i=0;i<300;i++){if(service.status().ready&&!service.status().indexing)return;await new Promise(r=>setTimeout(r,10));}assert.fail('index did not finish');};
 await service.rebuild();await wait();assert.equal((await service.query('needle')).items.length,1);assert.ok((await fs.readFile(path.join(data,'file-index.ndjson'),'utf8')).includes('needle.txt'));
 await fs.writeFile(path.join(files,'live-update.txt'),'');for(let i=0;i<200;i++){if((await service.query('live-update')).items.length)break;await new Promise(r=>setTimeout(r,10));}assert.equal((await service.query('live-update')).items.length,1,'new files appear without a manual refresh');
 service.stop();service=createSearchService({directory:data,getRoots:async()=>[files]});assert.equal((await service.query('needle')).items.length,1);
 await fs.unlink(path.join(files,'needle.txt'));const oldUpdated=service.status().updated;await service.rebuild();for(let i=0;i<300&&(service.status().indexing||service.status().updated===oldUpdated);i++)await new Promise(r=>setTimeout(r,10));assert.equal((await service.query('needle')).items.length,0);
});
