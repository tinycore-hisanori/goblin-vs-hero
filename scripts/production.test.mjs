import {readdir,readFile} from 'node:fs/promises';
import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import WebSocket from 'ws';import {createProductionServer} from '../server/production.js';
test('production serves only built assets, public invitation address, and same-host WebSockets',async()=>{const app=createProductionServer({publicOrigin:'https://goblin-vs-hero.kitakuarcade.com'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const origin=`http://127.0.0.1:${app.server.address().port}`,clients=[];try{
 for(const path of ['/','/party.html','/goblin.html','/models/child-goblin.glb','/healthz']){const r=await fetch(origin+path);assert.equal(r.status,200,path);await r.arrayBuffer();}
 for(const path of ['/server/production.js','/package.json','/data/goblin-careers.json','/.env','/%2e%2e%2fpackage.json'])assert.equal((await fetch(origin+path)).status,404,path);
 const info=await(await fetch(origin+'/api/lan-info')).json();assert.equal(info.addresses[0].url,'https://goblin-vs-hero.kitakuarcade.com/party.html');
 assert.equal((await fetch(origin+'/party.html',{method:'HEAD'})).headers.get('cache-control'),'no-store');assert.equal((await fetch(origin+'/healthz',{method:'POST'})).status,405);
 for(const path of ['/party','/lobby']){const ws=new WebSocket(origin.replace('http','ws')+path,{origin});clients.push(ws);await once(ws,'open');const response=once(ws,'message');ws.send(JSON.stringify(path==='/party'?{type:'create-room'}:{type:'create',id:'d'.repeat(24),name:'test'}));assert.ok(JSON.parse((await response)[0]).type);}
 const bad=new WebSocket(origin.replace('http','ws')+'/party',{origin:'https://other.example'});bad.on('error',()=>{});await new Promise(resolve=>bad.once('close',resolve));assert.notEqual(bad.readyState,WebSocket.OPEN);
 }finally{for(const c of clients)c.terminate();app.close();}});

test('music assets serve as MP3 with accurate full, partial and suffix bytes',async()=>{
 const app=createProductionServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const origin=`http://127.0.0.1:${app.server.address().port}`;
 try{const names=(await readdir('dist/assets')).filter(n=>n.endsWith('.mp3'));assert.equal(names.length,3);
 for(const name of names){const bytes=await readFile('dist/assets/'+name),url=origin+'/assets/'+name,head=await fetch(url,{method:'HEAD'});assert.equal(head.headers.get('content-type'),'audio/mpeg');assert.equal(Number(head.headers.get('content-length')),bytes.length);
 const part=await fetch(url,{headers:{Range:'bytes=0-31'}});assert.equal(part.status,206);assert.deepEqual(Buffer.from(await part.arrayBuffer()),bytes.subarray(0,32));
 const tail=await fetch(url,{headers:{Range:'bytes=-16'}});assert.equal(tail.status,206);assert.deepEqual(Buffer.from(await tail.arrayBuffer()),bytes.subarray(-16));
 assert.equal((await fetch(url,{headers:{Range:`bytes=${bytes.length+1}-`}})).status,416);
 }}finally{app.close();}
});
