import WebSocket from 'ws';
import {randomBytes} from 'node:crypto';
const base=new URL(process.argv[2]||'http://127.0.0.1:8788'),clients=[];
async function connect(path){const u=new URL(path,base);u.protocol=base.protocol==='https:'?'wss:':'ws:';const ws=new WebSocket(u,{origin:base.origin}),queue=[];clients.push(ws);ws.on('message',b=>queue.push(JSON.parse(b)));await new Promise((ok,no)=>{ws.once('open',ok);ws.once('error',no);});return{ws,send:d=>ws.send(JSON.stringify(d)),async wait(fn){for(let i=0;i<100;i++){const j=queue.findIndex(fn);if(j>=0)return queue.splice(j,1)[0];await new Promise(r=>setTimeout(r,30));}throw Error('WebSocket response timeout');}};}
try{
 for(const path of ['/healthz','/party.html','/goblin.html','/api/lan-info']){const r=await fetch(new URL(path,base));if(!r.ok)throw Error(path+': '+r.status);await r.arrayBuffer();console.log('HTTP OK',path);}
 const host=await connect('/party');host.send({type:'create-room'});const {room}=await host.wait(d=>d.type==='room-created'),guest=await connect('/party');guest.send({type:'join',room,id:randomBytes(12).toString('hex'),name:'接続確認'});await guest.wait(d=>d.type==='room-joined');await host.wait(d=>d.type==='join');guest.send({type:'command',command:{type:'idle'}});await host.wait(d=>d.type==='command');console.log('Game WebSocket OK');
 const owner=await connect('/lobby'),id=randomBytes(12).toString('hex');owner.send({type:'create',id,name:'接続確認'});const lobby=await owner.wait(d=>d.type==='lobby');owner.send({type:'chat',text:'接続確認'});await owner.wait(d=>d.chat?.length===1);owner.send({type:'leave'});console.log('Lobby WebSocket / chat OK',lobby.code);
}finally{for(const ws of clients)ws.close();setTimeout(()=>{for(const ws of clients)ws.terminate();},200).unref();}
