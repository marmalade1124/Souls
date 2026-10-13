const {spawn} = require('node:child_process');
const {createInterface} = require('node:readline');
const path = require('node:path');
function createClient({spawnProcess=spawn,timeout=20000}={}) {
let worker, sequence = 0;
const pending = new Map();
function stop() {
  if (worker) { const old=worker; worker=null; old.kill(); }
  for(const task of pending.values()) {clearTimeout(task.timer);task.reject(new Error('Windows controls are unavailable.'));}
  pending.clear();
}
function request(app, action, value) {
  if (!worker) {
    const script=app.isPackaged ? path.join(process.resourcesPath,'app.asar.unpacked','src','controls.ps1') : path.join(__dirname,'controls.ps1');
    const child=spawnProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    worker=child;
    createInterface({input:child.stdout}).on('line',line=>{
      try {const message=JSON.parse(line), task=pending.get(message.id);if(!task)return;
        pending.delete(message.id);clearTimeout(task.timer);message.error ? task.reject(new Error(message.error)) : task.resolve(message.result);
      } catch { /* Ignore non-protocol output. */ }
    });
    child.stderr.resume(); child.stdin.on('error',()=>{if(worker===child)stop();});
    child.on('error',()=>{if(worker===child)stop();});child.on('exit',()=>{if(worker===child)stop();});
  }
  return new Promise((resolve,reject)=>{
    const id=++sequence; const timer=setTimeout(()=>stop(),timeout);
    pending.set(id,{resolve,reject,timer});worker.stdin.write(JSON.stringify({id,action,value})+'\n');
  });
}
return {request,stop};
}
module.exports={...createClient(),createClient};
