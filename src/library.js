const fs = require('node:fs/promises');
const path = require('node:path');

async function searchFiles(roots, query, { limit = 60, budget = 5000,signal,minLength=2,match,skipFolders=['node_modules','.git','$recycle.bin','windows','appdata'] } = {}) {
  const needle = query.trim().toLowerCase();
  if (needle.length < minLength) return { items: [], truncated: false };
  const queue = [...new Set(roots)];
  const visited=new Set(),found=new Set();
  const skip=new Set(skipFolders.map(name=>name.toLowerCase()));
  const items = [];
  const started = Date.now();
  let scanned = 0;
  let truncated=false;
  while (queue.length && items.length < limit && Date.now() - started < budget && scanned < 15000 && !signal?.aborted) {
    const folder = queue.shift();
    const key=process.platform==='win32'?path.resolve(folder).toLowerCase():path.resolve(folder);
    if(visited.has(key))continue;visited.add(key);
    let entries;
    let timer,onAbort;
    try {
      entries=await Promise.race([fs.readdir(folder,{withFileTypes:true}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),Math.max(1,budget-(Date.now()-started)));if(signal){onAbort=()=>resolve(null);signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)resolve(null);}})]);
      if(entries===null){truncated=true;break;}
    } catch { continue; } finally {clearTimeout(timer);if(onAbort)signal.removeEventListener('abort',onAbort);}
    for (let index=0;index<entries.length;index++) {
      if(Date.now()-started>=budget || scanned>=15000 || signal?.aborted){truncated=true;break;}
      const entry=entries[index];
      scanned++;
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(folder, entry.name);
      if ((match?match({name:entry.name,path:fullPath}):entry.name.toLowerCase().includes(needle)) && !found.has(fullPath)) {
        found.add(fullPath);
        items.push({ name: entry.name, path: fullPath, kind: entry.isDirectory() ? 'folder' : 'file' });
        if (items.length >= limit) {truncated=index<entries.length-1 || queue.length>0 || (entry.isDirectory()&&!skip.has(entry.name.toLowerCase()));break;}
      }
      if (entry.isDirectory() && !skip.has(entry.name.toLowerCase())) queue.push(fullPath);
    }
  }
  return { items, truncated: truncated || queue.length > 0 };
}

async function discoverApps(roots) {
  const apps = [];
  const walk = async (folder, depth = 0) => {
    if (depth > 6) return;
    let entries;
    try { entries = await fs.readdir(folder, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(fullPath, depth + 1);
      else if (/\.lnk$/i.test(entry.name)) apps.push({ name: entry.name.replace(/\.lnk$/i, ''), path: fullPath, kind: 'app' });
    }
  };
  for (const root of roots) await walk(root);
  return [...new Map(apps.map(item=>[item.path,item])).values()].sort((a,b) => a.name.localeCompare(b.name));
}
module.exports = { searchFiles, discoverApps };
