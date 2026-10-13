const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {preferences,history}=require('../src/preferences');
test('malformed preferences cannot replace runtime fields or break lists',()=>{
  for(const input of [null,[],3,'broken',{pins:null,roots:{},clipboardEnabled:'yes',alwaysOnTop:0,lastTab:'oops',clips:'bad',encryptedClips:4}]){
    const clean=preferences(input);assert.deepEqual(clean.pins,[]);assert.deepEqual(clean.roots,[]);assert.equal(clean.clipboardEnabled,false);assert.equal(clean.alwaysOnTop,true);assert.equal(clean.lastTab,'settings');assert.equal('clips' in clean,false);
  }
});
test('preferences deduplicate valid paths and reject malformed pins and roots',()=>{
  const root=path.resolve('example'), pin={name:'Editor',path:path.join(root,'Editor.exe')};
  const clean=preferences({pins:[pin,pin,null,{name:'Bad',path:'relative.exe'},{name:'Bad',path:'app:\0bad'}],roots:[root,root,{},'relative'],lastTab:'music',clipboardEnabled:true,alwaysOnTop:false});
  assert.equal(clean.pins.length,1);assert.deepEqual(clean.roots,[root]);assert.equal(clean.lastTab,'music');assert.equal(clean.clipboardEnabled,true);assert.equal(clean.alwaysOnTop,false);
});
test('history validates text, metadata, duplicates and size limits',()=>{
  assert.deepEqual(history({}),[]);
  const entry=(text,id=text)=>({id,text,time:10});
  const clean=history([entry('valid'),entry('valid','duplicate'),entry({}),entry(''),entry('x'.repeat(20001)),{id:'bad',text:'negative date',time:-1},...Array.from({length:45},(_,i)=>entry('copy '+i))]);
  assert.equal(clean.length,40);assert.equal(clean[0].text,'valid');assert.ok(clean.every(item=>typeof item.text==='string'));
});
