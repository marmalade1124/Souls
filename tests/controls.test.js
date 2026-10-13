const {test}=require('node:test');const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');
const {createClient}=require('../src/controls');
function harness(timeout=1000) {
  const children=[];
  const client=createClient({timeout,spawnProcess:()=>{
    const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.requests=[];
    child.stdin.on('data',chunk=>child.requests.push(JSON.parse(String(chunk))));child.kill=()=>{child.killed=true;};
    child.respond=(request,result,error)=>child.stdout.write(JSON.stringify({id:request.id,result,error})+'\n');children.push(child);return child;
  }});return {client,children};
}
test('native worker routes out-of-order responses and ignores invalid output',async t=>{
  const {client,children}=harness();t.after(client.stop);const first=client.request({isPackaged:false},'read'),second=client.request({isPackaged:false},'playback');
  const child=children[0];child.stdout.write('not json\n');child.respond(child.requests[1],{playing:true});child.respond(child.requests[0],{volume:20});
  assert.deepEqual(await first,{volume:20});assert.deepEqual(await second,{playing:true});
});
test('native worker exit rejects pending requests and next call restarts cleanly',async t=>{
  const {client,children}=harness();t.after(client.stop);
  const pending=client.request({isPackaged:false},'read');const rejected=assert.rejects(pending,/unavailable/);children[0].emit('exit',1);await rejected;
  const next=client.request({isPackaged:false},'read');assert.equal(children.length,2);
  children[0].stdout.write(JSON.stringify({id:1,result:'stale'})+'\n');children[1].respond(children[1].requests[0],{volume:30});assert.deepEqual(await next,{volume:30});
});
test('native worker timeouts reject every queued action and kill the stuck helper',async t=>{
  const {client,children}=harness(20);t.after(client.stop);
  const actions=[client.request({isPackaged:false},'read'),client.request({isPackaged:false},'volume',10)];
  await Promise.all(actions.map(action=>assert.rejects(action,/unavailable/)));assert.equal(children[0].killed,true);
});
test('native command failures reject only the failing request',async t=>{
  const {client,children}=harness();t.after(client.stop);const failed=client.request({isPackaged:false},'brightness',20),rejected=assert.rejects(failed,/unsupported/);
  children[0].respond(children[0].requests[0],null,'Brightness unsupported');await rejected;
  const good=client.request({isPackaged:false},'read');children[0].respond(children[0].requests[1],{volume:10});assert.deepEqual(await good,{volume:10});assert.equal(children.length,1);
});
