import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {attachPartyRelay} from './party-relay.js';
import {attachLobby} from './lobby.js';
import {createTwitchIntegration} from './twitch.js';
const defaultRoot=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.ico':'image/x-icon','.woff2':'font/woff2'};
export function createProductionServer({root=defaultRoot,publicOrigin=process.env.PUBLIC_ORIGIN||'',twitchOptions={}}={}){
 root=resolve(root);if(publicOrigin){const u=new URL(publicOrigin);if(!['http:','https:'].includes(u.protocol)||u.pathname!=='/'||u.search||u.hash)throw Error('PUBLIC_ORIGIN must be an HTTP(S) origin');publicOrigin=u.origin;}
 const server=createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 const reply=(code,text)=>{res.statusCode=code;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(text);};
 if(await twitch.handle(req,res))return;
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');reply(405,'Method not allowed');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{reply(400,'Bad request');return;}
 if(pathname==='/healthz'){reply(200,'ok');return;}
 if(pathname==='/api/lan-info'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({addresses:publicOrigin?[{interface:'公開サーバー',url:publicOrigin+'/party.html'}]:[]}));return;}
 if(pathname==='/')pathname='/party.html';
 if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p.startsWith('.'))){reply(404,'Not found');return;}
 const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep)){reply(404,'Not found');return;}
 try{const actual=await realpath(file);if(!actual.startsWith(root+sep)){reply(404,'Not found');return;}const info=await stat(actual);if(!info.isFile()){reply(404,'Not found');return;}res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Content-Length',info.size);res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':extname(file)==='.html'?'no-store':'public, max-age=3600');if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(actual);stream.on('error',()=>res.destroy());stream.pipe(res);}catch{reply(404,'Not found');}
 });
 const relay=attachPartyRelay(server),lobby=attachLobby(server,{onLeave:(id,game)=>relay.removeGuest(game,id),onTwitchTicket:(code,member)=>twitch.ticket(code,member)});
 const twitch=createTwitchIntegration({rooms:lobby.rooms,publicOrigin,...twitchOptions});
 server.on('upgrade',(req,socket)=>{let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{socket.destroy();return;}if(!['/party','/lobby'].includes(path))socket.destroy();});
 let closing=false;return{server,close(){if(closing)return;closing=true;twitch.close();relay.close();lobby.close();server.close();server.closeIdleConnections?.();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8788),host=process.env.HOST||'127.0.0.1';if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const app=createProductionServer();app.server.on('error',e=>{console.error(e.message);process.exitCode=1;app.close();});app.server.listen(port,host,()=>console.log(`Goblin vs Hero listening on http://${host}:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close();setTimeout(()=>process.exit(0),5000).unref();});
}
