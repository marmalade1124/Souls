const test=require('node:test');
const assert=require('node:assert/strict');
const {createMascot}=require('../src/mascot');
test('mascot stops hidden, persists pause and respects live reduced motion',()=>{
  const originalSet=setTimeout,originalClear=clearTimeout,pending=new Map();let sequence=0,change;
  global.setTimeout=fn=>{pending.set(++sequence,fn);return sequence;};global.clearTimeout=id=>pending.delete(id);
  try{
    const saved=new Map(),animations=[],animate=()=>{const animation={cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;};
    const sprite={style:{},animate,querySelectorAll:()=>[{style:{},animate},{style:{},animate}]},button={dataset:{},querySelector:()=>sprite,setAttribute(){}};
    const motion={matches:false,addEventListener:(event,fn)=>{change=fn;}};
    const mascot=createMascot(button,{motion,storage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}});
    assert.equal(pending.size,0);assert.equal(button.dataset.state,'sleeping');
    mascot.setOpen(true);assert.equal(pending.size,1);
    const tick=[...pending.values()][0];pending.clear();tick();assert.equal(button.dataset.frame,'1');
    mascot.setBusy(true);assert.equal(button.dataset.state,'thinking');assert.equal(pending.size,1);
    mascot.setOpen(false);assert.equal(pending.size,0);
    assert.ok(animations.every(animation=>animation.cancelled),'hidden state cancels compositor animations too');
    mascot.setOpen(true);button.onclick();assert.equal(pending.size,0);assert.equal(saved.get('soul-mascot-paused'),'true');
    button.onclick();assert.equal(button.dataset.state,'thinking');
    motion.matches=true;change();assert.equal(pending.size,0);assert.equal(button.dataset.frame,'0');
    motion.matches=false;change();assert.equal(pending.size,1);
    mascot.setBusy(false);mascot.curious();assert.equal(button.dataset.state,'curious');
    mascot.setOpen(true);assert.equal(button.dataset.state,'curious');
    mascot.setOpen(false);assert.equal(pending.size,0);
  }finally{global.setTimeout=originalSet;global.clearTimeout=originalClear;}
});
