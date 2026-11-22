import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async(req,res)=>{
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', `http://localhost:${port}`).pathname);
    const file = resolve(root, '.'+pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (file !== root && !file.startsWith(root+sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const metadata = await stat(file);
    if (!metadata.isFile()) throw Error('File not found');
    const buffer = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
    res.end(buffer);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`TraceMortem http://127.0.0.1:${port}`));
