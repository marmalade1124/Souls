const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { searchFiles, discoverApps } = require('../src/library');
test('file search traverses chosen roots, matches case-insensitively and respects limit', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'soul-test-')); t.after(() => fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'nested')); await fs.writeFile(path.join(root,'nested','Budget.xlsx'),''); await fs.writeFile(path.join(root,'Budget.txt'),'');
  const result = await searchFiles([root],'BUDGET'); assert.equal(result.items.length,2); assert.ok(result.items.every(i => i.path.startsWith(root)));
  assert.equal((await searchFiles([root],'budget',{limit:1})).items.length,1);
  assert.equal((await searchFiles([root],'b')).items.length,0);
});
test('app discovery only includes shortcuts, tolerates missing directories', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'soul-app-test-')); t.after(() => fs.rm(root,{recursive:true,force:true}));
  await fs.writeFile(path.join(root,'Editor.lnk'),''); await fs.writeFile(path.join(root,'ignore.txt'),'');
  const result = await discoverApps([root,path.join(root,'missing')]); assert.equal(result.length,1); assert.equal(result[0].name,'Editor');
});
test('search deduplicates overlapping roots and reports a limit inside the final folder',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'soul-limits-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(let i=0;i<5;i++)await fs.writeFile(path.join(root,`report-${i}.txt`),'');
  assert.equal((await searchFiles([root,root],'report')).items.length,5);
  const limited=await searchFiles([root],'report',{limit:2});assert.equal(limited.items.length,2);assert.equal(limited.truncated,true);
  assert.equal((await searchFiles([root],'report',{budget:0})).truncated,true);
});
test('search excludes dependency folders regardless of case and tolerates vanished roots',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'soul-skips-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'NODE_MODULES'));await fs.writeFile(path.join(root,'NODE_MODULES','target.txt'),'');
  const result=await searchFiles([root,path.join(root,'missing')],'target');assert.deepEqual(result.items,[]);
  await fs.writeFile(path.join(root,'Editor.lnk'),'');assert.equal((await discoverApps([root,root])).length,1);
});
test('a stuck directory read is bounded by the search deadline',async t=>{
  t.mock.method(fs,'readdir',()=>new Promise(()=>{}));
  const started=Date.now(),result=await searchFiles([path.resolve('stuck')],'report',{budget:20});
  assert.ok(Date.now()-started<1000);assert.deepEqual(result.items,[]);assert.equal(result.truncated,true);
});
test('cancelling a search stops waiting on a stuck directory read',async t=>{
  t.mock.method(fs,'readdir',()=>new Promise(()=>{}));
  const controller=new AbortController(),pending=searchFiles([path.resolve('stuck')],'report',{budget:5000,signal:controller.signal});
  controller.abort();const result=await pending;assert.deepEqual(result.items,[]);assert.equal(result.truncated,true);
});
