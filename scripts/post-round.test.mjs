import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {attachLobby} from '../server/lobby.js';

async function fixture(t){
 let time=1000,serial=0;const removed=[],clients=[],server=createServer(),lobby=attachLobby(server,{now:()=>time,onLeave:(id,game)=>removed.push({id,game})});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{clients.forEach(ws=>ws.terminate());lobby.close();server.close();});
 async function peer(id=String(++serial).padStart(24,'0')){
  const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/lobby`),messages=[];clients.push(ws);ws.on('message',raw=>messages.push(JSON.parse(raw)));await once(ws,'open');
  return{id,ws,send:d=>ws.send(JSON.stringify({id,name:'player'+id.slice(-2),...d})),async wait(predicate){for(let i=0;i<200;i++){const at=messages.findIndex(predicate);if(at>=0)return messages.splice(at,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Missing expected lobby message');}};
 }
 async function party({random=false,otherHero=false}={}){
  const a=await peer();a.send({type:random?'match':'create'});const room=await a.wait(d=>d.code);const b=await peer();b.send(random?{type:'match'}:{type:'join',code:room.code});await b.wait(d=>d.members?.length===2);
  if(random){time+=21000;lobby.tick();}else{a.send({type:'settings',heroMode:'fixed',fixedHero:otherHero?b.id:a.id});await a.wait(d=>d.fixedHero===(otherHero?b.id:a.id));a.send({type:'next'});}
  const started=await a.wait(d=>d.phase==='preparing'),hero=started.hero===a.id?a:b,guest=hero===a?b:a;
  hero.send({type:'game-ready',game:'123456'});hero.send({type:'started'});await a.wait(d=>d.phase==='playing');hero.send({type:'finished',win:true});const ended=await a.wait(d=>d.phase==='finished');
  return{a,b,hero,guest,room:ended};
 }
 return{lobby,removed,peer,party,advance(ms){time+=ms;lobby.tick();}};
}

test('finished rounds wait for the hero; replay retains the exact roster and fixed hero',async t=>{
 const f=await fixture(t),{hero,guest,room}=await f.party({otherHero:true});
 f.advance(60000);assert.equal(f.lobby.rooms.get(room.code).phase,'finished');
 guest.send({type:'post-round',action:'same',round:1});assert((await guest.wait(d=>d.type==='error')).recoverable);
 hero.send({type:'post-round',action:'same',round:1});const next=await hero.wait(d=>d.phase==='preparing'&&d.round===2);
 assert.equal(next.code,room.code);assert.equal(next.hero,hero.id);assert(next.rosterLocked);assert.deepEqual(next.members.map(m=>m.id).sort(),room.members.map(m=>m.id).sort());assert.equal(next.members.find(m=>m.id===hero.id).clears,1);
 hero.send({type:'post-round',action:'new',round:1});assert((await hero.wait(d=>d.type==='error')).recoverable);assert.equal(f.lobby.rooms.size,1);
 const extra=await f.peer();extra.send({type:'join',code:room.code});assert.match((await extra.wait(d=>d.type==='error')).message,/同じメンバー/);
});

test('new room retires the old code and members, gives the hero ownership, and preserves fixed mode',async t=>{
 const f=await fixture(t),{hero,guest,room}=await f.party({otherHero:true});hero.send({type:'post-round',action:'new',round:1});
 const next=await hero.wait(d=>d.code&&d.code!==room.code),closed=await guest.wait(d=>d.type==='room-ended');
 assert.match(closed.message,/新しいメンバー/);assert.equal(next.phase,'waiting');assert.equal(next.owner,hero.id);assert.equal(next.fixedHero,hero.id);assert.equal(next.heroMode,'fixed');assert.equal(next.round,0);assert.equal(next.members.length,1);assert(next.twitchControl);assert(!f.lobby.rooms.has(room.code));assert.equal(f.removed.length,2);
 const stale=await f.peer(guest.id);stale.send({type:'resume',code:room.code});assert.match((await stale.wait(d=>d.type==='error')).message,/見つかりません/);
});

test('return to title closes the room for everyone; finished state survives a hero page reload',async t=>{
 const f=await fixture(t),{hero,guest,room}=await f.party();const reloaded=await f.peer(hero.id);reloaded.send({type:'resume',code:room.code,freshPage:true,twitchControl:room.twitchControl});const state=await reloaded.wait(d=>d.phase==='finished');assert.equal(state.round,1);
 reloaded.send({type:'post-round',action:'title',round:1});await reloaded.wait(d=>d.type==='room-ended');await guest.wait(d=>d.type==='room-ended');assert(!f.lobby.rooms.has(room.code));
});

test('random rematches do not auto-start or accept new players; new-room choice prevents immediately rematching the old goblins',async t=>{
 const f=await fixture(t),{hero,guest,room}=await f.party({random:true});f.advance(60000);assert.equal(f.lobby.rooms.get(room.code).phase,'finished');
 const newcomer=await f.peer();newcomer.send({type:'match'});assert.notEqual((await newcomer.wait(d=>d.code)).code,room.code);
 hero.send({type:'post-round',action:'same',round:1});const replay=await hero.wait(d=>d.phase==='preparing'&&d.round===2);assert.notEqual(replay.hero,hero.id);assert(replay.rosterLocked);
 const nextHero=replay.hero===hero.id?hero:guest;nextHero.send({type:'finished',win:false});await nextHero.wait(d=>d.phase==='finished'&&d.round===2);nextHero.send({type:'post-round',action:'new',round:2});const fresh=await nextHero.wait(d=>d.code&&d.code!==room.code);assert.equal(fresh.kind,'random');assert.equal(fresh.countdown,null);assert.equal(fresh.members.length,1);
 const oldGoblin=await f.peer(replay.hero===hero.id?guest.id:hero.id);oldGoblin.send({type:'match'});assert.notEqual((await oldGoblin.wait(d=>d.code)).code,fresh.code);
});

test('fresh-room replacement works at room capacity and cannot duplicate completed-round rewards',async t=>{
 const f=await fixture(t),{hero,room}=await f.party();for(let n=0;n<31;n++){const p=await f.peer();p.send({type:'create'});await p.wait(d=>d.code);}assert.equal(f.lobby.rooms.size,32);
 hero.send({type:'finished',win:true});hero.send({type:'post-round',action:'new',round:1});const next=await hero.wait(d=>d.code&&d.code!==room.code);assert.equal(f.lobby.rooms.size,32);assert.equal(next.members.length,1);
});
