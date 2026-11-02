import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {attachPartyRelay} from '../server/party-relay.js';
const next=ws=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('message timeout')),3000);ws.once('message',raw=>{clearTimeout(timer);resolve(JSON.parse(raw));});});
test('LAN relay joins by code, forwards commands with bound identity and sends snapshots',async()=>{
 const server=createServer(),relay=attachPartyRelay(server);server.listen(0,'127.0.0.1');await once(server,'listening');const url=`ws://127.0.0.1:${server.address().port}/party`,clients=[];
 const connect=async()=>{const ws=new WebSocket(url);clients.push(ws);await once(ws,'open');return ws;};
 try{const host=await connect();let p=next(host);host.send(JSON.stringify({type:'create-room'}));let {room}=await p;assert.match(room,/^\d{6}$/);p=next(host);host.send(JSON.stringify({type:'configure-room',room:'012345',nest:'goblin-den'}));assert.equal((await p).room,'012345');room='012345';
 const guest=await connect();p=next(guest);let hp=next(host);guest.send(JSON.stringify({type:'join',room,id:'device-one',name:'test'}));assert.equal((await p).type,'room-joined');assert.equal((await hp).id,'device-one');
 hp=next(host);guest.send(JSON.stringify({type:'command',id:'spoof',command:{type:'train',station:'dummy'}}));assert.equal((await hp).id,'device-one');
 p=next(guest);host.send(JSON.stringify({type:'snapshot',players:[{id:'device-one'}]}));assert.equal((await p).players[0].id,'device-one');
 const invalid=await connect();p=next(invalid);invalid.send(JSON.stringify({type:'join',room:'bad',id:'two',name:'test'}));assert.equal((await p).type,'connection-error');
 p=next(guest);host.close();assert.equal((await p).type,'room-closed');
 }finally{for(const ws of clients)ws.terminate();relay.close();await new Promise(resolve=>server.close(resolve));}
});
