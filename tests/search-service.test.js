const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createSearchService}=require('../src/search-service');
const provider={engine:'Everything',ready:true,error:''};
const item=name=>({name,path:path.resolve(name),kind:'file'});
test('native results are bounded and validated, with no filesystem scan by default',async()=>{
 let scans=0;const service=createSearchService({nativeClient:{request:async(_app,action)=>action==='probe'?provider:{provider,items:[item('report.txt'),{path:'relative',name:'bad',kind:'file'},...Array.from({length:110},(_,i)=>item('report-'+i))]},stop(){}},scan:async()=>{scans++;throw Error('unexpected crawl');}});
 await service.rebuild();const result=await service.query('report');assert.equal(scans,0);assert.equal(result.items.length,100);assert.equal(result.truncated,true);assert.equal(result.index.engine,'Everything');assert.equal(result.index.indexing,false);service.stop();
});
test('only explicit extra locations are scanned on demand, and results are deduplicated',async()=>{
 const root=path.resolve('chosen');let args;const service=createSearchService({extraRoots:()=>[root],nativeClient:{request:async()=>({provider,items:[item('report.txt')]}),stop(){}},scan:async(...values)=>{args=values;return {items:[item('report.txt'),item('extra.txt')],truncated:true};}});
 const result=await service.query('report');assert.deepEqual(args[0],[root]);assert.equal(args[2].budget,2000);assert.deepEqual(args[2].skipFolders,[]);assert.equal(result.items.length,2);assert.equal(result.index.scopedLimited,true);service.stop();
});
test('typing coalesces queued queries and suppresses outdated responses',async()=>{
 const requests=[];let finish;const service=createSearchService({nativeClient:{request:(_app,_action,query)=>{requests.push(query);return requests.length===1?new Promise(r=>finish=r):Promise.resolve({provider,items:[item(query+'.txt')]});},stop(){}}});
 const first=service.query('first'),second=service.query('second'),last=service.query('last');assert.deepEqual((await first).items,[]);assert.deepEqual((await second).items,[]);
 finish({provider,items:[item('old.txt')]});assert.equal((await last).items[0].name,'last.txt');assert.deepEqual(requests,['first','last']);service.stop();
});
test('missing native engines are reported; explicit folders still work and input is validated',async()=>{
 const service=createSearchService({extraRoots:()=>[path.resolve('chosen')],nativeClient:{request:async()=>{throw Error('disabled');},stop(){}},scan:async()=>({items:[item('found.txt')],truncated:false})});
 const result=await service.query('found');assert.equal(result.items.length,1);assert.equal(result.index.engine,'Unavailable');assert.ok(result.index.error);assert.equal((await service.query('')).items.length,0);await assert.rejects(service.query('x'.repeat(201)));service.stop();
});
