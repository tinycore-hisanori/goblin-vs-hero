import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {attachPartyRelay} from '../server/party-relay.js';
import {LocalSession} from '../src/local-session.js';
import * as THREE from 'three';
import {world} from '../src/dungeon.js';

test('network pulses advance a host without RAF or browser timer callbacks and relay responsive movement',async()=>{
 const server=createServer(),relay=attachPartyRelay(server),sockets=[];server.listen(0,'127.0.0.1');await once(server,'listening');
 const connect=async()=>{const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/party`);sockets.push(ws);await once(ws,'open');return ws;};
 let session;
 try{
  const host=await connect(),p=world(5,21),g={id:'g',root:{position:new THREE.Vector3(p.x,0,p.z),rotation:{y:0}},model:{rotation:{z:0}},spawn:p,hp:6,route:[],cooldown:0};
  session=new LocalSession({ready:()=>true,ended:()=>false,hero:()=>({x:100,z:100}),goblins:()=>[g],spawn:()=>g,appearance(){},tag(){},motion(){}});session.channel.close();session.channel={postMessage:data=>host.send(JSON.stringify(data))};session.active=true;
  let last=performance.now(),pulses=0;
  function advance(){let left=Math.min((performance.now()-last)/1000,1.5);last=performance.now();while(left>.00001){const dt=Math.min(.04,left);left-=dt;session.update(dt);if(g.viewer)session.updateGoblin(g,dt);}}
  const roomReady=new Promise(resolve=>host.on('message',raw=>{const data=JSON.parse(raw);if(data.type==='room-created')resolve(data.room);else if(data.type==='host-tick'){pulses++;advance();}else{advance();session.receive(data);}}));
  host.send(JSON.stringify({type:'create-room',hostClock:true}));const room=await roomReady,guest=await connect();
  const joined=once(guest,'message');guest.send(JSON.stringify({type:'join',room,id:'clock-test',name:'test'}));await joined;
  // Only the guest sends input on its timer; the host is driven exclusively by incoming network events.
  const start=g.root.position.clone();for(let i=0;i<12;i++){guest.send(JSON.stringify({type:'command',command:{type:'direct',dx:1,dz:0,yaw:0}}));await new Promise(r=>setTimeout(r,50));}
  assert(pulses>=5);assert(g.root.position.x-start.x>.65);assert.equal(g.root.rotation.y,Math.PI/2);
  guest.send(JSON.stringify({type:'command',command:{type:'direct',dx:0,dz:0}}));await new Promise(r=>setTimeout(r,80));const stopped=g.root.position.x;await new Promise(r=>setTimeout(r,150));assert.equal(g.root.position.x,stopped);
 }finally{for(const ws of sockets)ws.terminate();relay.close();await new Promise(r=>server.close(r));}
});
