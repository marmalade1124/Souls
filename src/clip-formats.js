const {createHash}=require('node:crypto');
const formats=new Set(['text/plain','text/html','text/rtf','image/png','image/jpeg','electron application/osclipboard;format="CF_HDROP"']);
const maxBytes=4*1024*1024, maxHistoryBytes=16*1024*1024;
function key(item){if(item.payloads?.length===1&&item.payloads[0].type==='text/plain')return Buffer.from(item.payloads[0].data,'base64').toString('utf8');return item.payloads?createHash('sha256').update(JSON.stringify(item.payloads)).digest('hex'):item.text;}
async function capture(clipboard){
  // Older text-only callers remain supported while the Electron API reads all formats.
  const text=await clipboard.readText();
  const payloads=[];let size=0;
  if(typeof clipboard.read==='function')for(const item of await clipboard.read())for(const type of [...item.types].sort()){
    if(!formats.has(type)||payloads.some(p=>p.type===type))continue;
    const blob=await item.getType(type);if(!blob.size||blob.size>maxBytes-size)continue;
    const bytes=Buffer.from(await blob.arrayBuffer());if(bytes.length>maxBytes-size)continue;
    size+=bytes.length;payloads.push({type,data:bytes.toString('base64')});
  }
  if(!payloads.length)return text&&text.length<=20000?{text}:null;
  const image=payloads.find(p=>p.type.startsWith('image/'));
  const files=payloads.find(p=>p.type.endsWith('"CF_HDROP"'));
  let names=[];
  if(files){const data=Buffer.from(files.data,'base64');if(data.length>=20){const offset=data.readUInt32LE(0);if(offset>=20&&offset<data.length)names=data.subarray(offset).toString(data.readUInt32LE(16)?'utf16le':'latin1').split('\0').filter(Boolean);}}
  const plain=payloads.find(p=>p.type==='text/plain');
  return {text:((plain?Buffer.from(plain.data,'base64').toString('utf8'):'')||names.join('\n')||(image?'Copied image':'Formatted content')).slice(0,20000),kind:files?'files':image?'image':payloads.some(p=>p.type!=='text/plain')?'formatted':'text',payloads};
}
function trim(items){let size=0;return items.filter(item=>{size+=JSON.stringify(item).length;return size<=maxHistoryBytes;}).slice(0,40);}
function validPayloads(payloads){return Array.isArray(payloads)&&payloads.length>0&&payloads.length<=formats.size&&new Set(payloads.map(p=>p?.type)).size===payloads.length&&payloads.every(p=>p&&formats.has(p.type)&&typeof p.data==='string'&&p.data.length<=Math.ceil(maxBytes/3)*4&&Buffer.from(p.data,'base64').toString('base64')===p.data)&&payloads.reduce((sum,p)=>sum+Buffer.from(p.data,'base64').length,0)<=maxBytes;}
module.exports={capture,key,trim,validPayloads};
