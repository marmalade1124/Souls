const path=require('node:path');
const clips=require('./clip-formats');
const tabs=new Set(['settings','apps','search','clipboard','music','power']);
const validString=value=>typeof value==='string'&&value.length>0&&value.length<=32767&&!/[\0\r\n]/.test(value);
function preferences(data={}) {
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  const pins=Array.isArray(data.pins)?data.pins.filter(p=>p&&validString(p.name)&&validString(p.path)&&(path.isAbsolute(p.path)||p.path.startsWith('app:'))).map(p=>({name:p.name.slice(0,256),path:p.path,kind:'app'})):[];
  return {pins:[...new Map(pins.map(p=>[p.path,p])).values()],roots:Array.isArray(data.roots)?[...new Set(data.roots.filter(root=>validString(root)&&path.isAbsolute(root)))]:[],
    clipboardEnabled:data.clipboardEnabled===true,alwaysOnTop:typeof data.alwaysOnTop==='boolean'?data.alwaysOnTop:true,lastTab:tabs.has(data.lastTab)?data.lastTab:'settings'};
}
function history(items) {
  if(!Array.isArray(items))return [];
  const seen=new Set();
  return clips.trim(items.filter(item=>{
    if(!item||typeof item.id!=='string'||!item.id||typeof item.text!=='string'||!item.text||item.text.length>20000||!Number.isFinite(item.time)||item.time<0||(item.payloads&&!clips.validPayloads(item.payloads)))return false;
    const key=clips.key(item);if(seen.has(key))return false;seen.add(key);return true;
  }).map(({id,text,time,kind,payloads})=>({id,text,time,...(payloads?{kind:['text','image','files','formatted'].includes(kind)?kind:'formatted',payloads}: {})})));
}
module.exports={preferences,history};
