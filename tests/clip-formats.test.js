const {test}=require('node:test'),assert=require('node:assert/strict');
const {capture,key,validPayloads,trim}=require('../src/clip-formats');
const {history}=require('../src/preferences');
const source=(text,values)=>({readText:async()=>text,read:async()=>[{types:Object.keys(values),getType:async type=>new Blob([values[type]])}]});
test('formatted text keeps original formats without rendering HTML',async()=>{
 const item=await capture(source('hello',{'text/html':'<b>hello</b>','text/plain':'hello','web application/unsafe':'secret'}));
 assert.equal(item.kind,'formatted');assert.equal(item.payloads.length,2);assert.ok(validPayloads(item.payloads));assert.equal(Buffer.from(item.payloads[0].data,'base64').toString(),'<b>hello</b>');
 assert.notEqual(key(item),key({text:'hello'}));assert.equal(history([{id:'one',time:1,...item}])[0].kind,'formatted');
});
test('image and file copies keep bytes and meaningful previews',async()=>{
 const image=await capture(source('',{'image/png':Buffer.from([137,80,78,71])}));assert.equal(image.kind,'image');assert.equal(image.text,'Copied image');
 const names=Buffer.from('C:\\Example\\file.txt\0\0','utf16le'),header=Buffer.alloc(20);header.writeUInt32LE(20);header.writeUInt32LE(1,16);
 const files=await capture(source('',{'electron application/osclipboard;format="CF_HDROP"':Buffer.concat([header,names])}));assert.equal(files.kind,'files');assert.equal(files.text,'C:\\Example\\file.txt');
});
test('previews come from the same payload snapshot and old plain text deduplicates',async()=>{
 const item=await capture(source('obsolete text',{'text/plain':'current text'}));assert.equal(item.text,'current text');assert.equal(key(item),key({text:'current text'}));
 const image=await capture(source('obsolete text',{'image/png':Buffer.from([137,80,78,71])}));assert.equal(image.text,'Copied image');
 assert.equal(validPayloads([{type:'text/plain',data:'YQ=='},{type:'text/plain',data:'Yg=='}]),false);
});
test('clipboard limits reject malformed persisted formats and cap memory',async()=>{
 assert.equal(await capture(source('',{'image/png':Buffer.alloc(4*1024*1024+1)})),null);
 assert.equal(validPayloads([{type:'text/html',data:'<script>'}]),false);assert.equal(validPayloads([{type:'web application/unsafe',data:'YWJj'}]),false);
 assert.deepEqual(history([{id:'bad',text:'a',time:1,payloads:[{type:'text/plain',data:'!!'}]}]),[]);
 const big={text:'image',payloads:[{type:'image/png',data:Buffer.alloc(4*1024*1024).toString('base64')}]};assert.ok(trim(Array(40).fill(big)).length<=3);
});
