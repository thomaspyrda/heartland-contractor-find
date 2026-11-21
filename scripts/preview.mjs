import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.svg':'image/svg+xml','.xml':'application/xml','.json':'application/json','.txt':'text/plain'};
createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/api/form-config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ready:false,sitekey:null}));return;}
    if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Static preview only. No inquiry has been submitted.'}));return;}
    let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep))throw new Error('path');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(resolve(root,'404.html')));}
}).listen(4173,'0.0.0.0',()=>console.log('Static preview at http://localhost:4173 — inquiry submission disabled.'));
