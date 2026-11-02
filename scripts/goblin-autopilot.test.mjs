import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {LocalSession} from '../src/local-session.js';import {world,regenerateDungeon,path,cell,tiles} from '../src/dungeon.js';import {sealHole,isSealed,resetSeals} from '../src/burrows.js';
function fixture(start=world(5,21)){const goblins=[];let seq=0;const spawn=()=>{const g={id:'g'+ ++seq,root:{position:new THREE.Vector3(start.x,0,start.z),rotation:{y:0},visible:true},model:{position:{y:0},rotation:{z:0}},spawn:start,hp:6,route:[],repath:0,cooldown:0};goblins.push(g);return g;};const api={ready:()=>true,ended:()=>false,goblins:()=>goblins,hero:()=>({x:100,z:100}),appearance:()=>{},tag:()=>{},motion:()=>{},damageHero:()=>{},impact:()=>{},spawn};const s=new LocalSession(api);s.active=true;s.receive({type:'join',id:'player',name:'P'});s.receive({type:'command',id:'player',command:{type:'friendly-fire',enabled:true}});return{s,m:s.members.get('player'),goblins,spawn,step(n){for(let i=0;i<n;i++){s.update(.04);for(const g of goblins)s.updateGoblin(g,.04);}}};}
test('hunt immediately after direct input is accepted, then travels and kills without more input',()=>{regenerateDungeon(()=>.3);const f=fixture();try{const victim=f.spawn(),p=world(6,15);victim.root.position.set(p.x,0,p.z);victim.hp=3;f.s.receive({type:'command',id:'player',command:{type:'direct',dx:0,dz:0}});f.s.update(.01);f.s.receive({type:'command',id:'player',command:{type:'hunt',target:victim.id}});assert.equal(f.m.command.type,'hunt');f.step(2000);assert(f.m.round.xp>=18);assert(victim.hp<=0||f.m.round.victims[victim.id]!==undefined);}finally{f.s.channel.close();}});
test('same-cell target at opposite corner is approached and attacked',()=>{const center=world(5,21),f=fixture();try{f.m.g.root.position.set(center.x-.7,0,center.z-.7);const victim=f.spawn();victim.root.position.set(center.x+.7,0,center.z+.7);victim.hp=3;f.s.receive({type:'command',id:'player',command:{type:'hunt',target:victim.id}});f.step(180);assert(f.m.round.xp>=18);}finally{f.s.channel.close();}});
test('Auto walks through a sealed shortcut by digging instead of waiting forever',()=>{resetSeals();const f=fixture(world(12,20));try{sealHole(13,20);const target=world(14,20);f.s.receive({type:'command',id:'player',command:{type:'move',...target}});f.step(600);assert(!isSealed(13,20));assert(Math.hypot(f.m.g.root.position.x-target.x,f.m.g.root.position.z-target.z)<.3);}finally{resetSeals();f.s.channel.close();}});

test('reset clears old input throttles; reconnect keeps the exact goblin and round XP',()=>{const f=fixture();try{f.s.elapsed=70;f.s.receive({type:'command',id:'player',command:{type:'direct',dx:1,dz:0}});f.s.reset();f.s.receive({type:'command',id:'player',command:{type:'direct',dx:1,dz:0}});assert.equal(f.m.command.type,'direct');f.m.round.xp=123;f.m.round.stage=2;const original=f.m.g;f.s.receive({type:'suspended',id:'player',until:Date.now()+90000});assert.equal(f.m.command.type,'idle');f.m.lastSeen=Date.now()-60000;f.s.update(.1);assert.equal(f.s.members.get('player'),f.m);f.s.receive({type:'join',id:'player',name:'returned'});assert.equal(f.m.g,original);assert.equal(f.m.round.xp,123);assert.equal(f.m.round.stage,2);assert.equal(f.m.disconnectedUntil,0);}finally{f.s.channel.close();}});


test('switching direct to AUTO trains, then follows and attacks the hero without more input',()=>{
 regenerateDungeon(()=>.3);const f=fixture();let started=false,damage=0;const hero=new THREE.Vector3(...[world(6,21).x,0,world(6,21).z]);
 f.s.api.started=()=>started;f.s.api.hero=()=>started?hero:{x:100,z:100};f.s.api.damageHero=n=>damage+=n;
 try{
  f.s.receive({type:'command',id:'player',command:{type:'direct',dx:0,dz:0}});
  f.s.receive({type:'command',id:'player',command:{type:'idle'}});
  f.s.receive({type:'command',id:'player',command:{type:'auto'}});
  assert(f.m.autopilot);assert.equal(f.m.command.type,'train');const before=f.m.g.root.position.clone();f.step(250);
  assert(f.m.g.root.position.distanceTo(before)>1);assert(f.m.round.xp>=6);
  started=true;f.step(500);assert.equal(f.m.command.type,'hero');assert(damage>0);
 }finally{f.s.channel.close();}
});

test('explicit wait and direct movement cancel AUTO; switching back restarts it immediately',()=>{
 const f=fixture();const command=command=>f.s.receive({type:'command',id:'player',command});
 try{command({type:'auto'});f.step(40);command({type:'idle'});const p=f.m.g.root.position.clone();f.step(40);assert(!f.m.autopilot);assert.equal(f.m.command.type,'idle');assert(f.m.g.root.position.distanceTo(p)<.001);
 command({type:'auto'});assert(f.m.autopilot);command({type:'direct',dx:1,dz:0});assert(!f.m.autopilot);assert.equal(f.m.command.type,'direct');command({type:'auto'});assert.equal(f.m.command.type,'train');
 }finally{f.s.channel.close();}
});

test('AUTO avoids occupied training stations and preserves an explicit training order',()=>{
 const f=fixture();try{f.s.receive({type:'join',id:'other',name:'Other'});for(const id of ['player','other'])f.s.receive({type:'command',id,command:{type:'auto'}});
 assert.notEqual(f.m.command.station,f.s.members.get('other').command.station);
 f.step(1000);assert(f.m.round.xp>=6,JSON.stringify([...f.s.members.values()].map(m=>({p:m.g.root.position,command:m.command,xp:m.round.xp,nav:m.g.navigation,route:m.g.route}))));assert(f.s.members.get('other').round.xp>=6);
 f.s.receive({type:'command',id:'player',command:{type:'train',station:'punchbag'}});assert(!f.m.autopilot);f.step(50);assert.equal(f.m.command.station,'punchbag');
 }finally{f.s.channel.close();}
});

test('AUTO retreats to a reachable bed when wounded and resumes combat after healing',()=>{
 const f=fixture();try{f.s.api.started=()=>true;f.m.g.hp=1;f.s.receive({type:'command',id:'player',command:{type:'auto'}});assert.equal(f.m.command.type,'rest');f.step(2500);assert(f.m.g.hp>=5,JSON.stringify({p:f.m.g.root.position,hp:f.m.g.hp,command:f.m.command,nav:f.m.g.navigation,route:f.m.g.route,jump:f.m.g.jump}));assert.equal(f.m.command.type,'hero');
 }finally{f.s.channel.close();}
});


test('routes enter low tunnels through their openings, never through a side wall',()=>{
 const from=world(13,21),to=world(21,16),route=path(from,to,{burrows:true,climb:true},true);assert(route.length>0);
 const points=[from,...route];for(let i=1;i<points.length;i++){const a=cell(points[i-1].x,points[i-1].z),b=cell(points[i].x,points[i].z);for(const c of [a,b])if(['g','h'].includes(tiles[c.z][c.x])){const horizontal=tiles[c.z][c.x-1]==='.'&&tiles[c.z][c.x+1]==='.';assert.equal(horizontal?a.z-b.z:a.x-b.x,0);}}
});

test('AUTO survives round reset and rebirth without training a protected child',()=>{
 const f=fixture();try{f.s.receive({type:'command',id:'player',command:{type:'auto'}});f.step(80);f.s.reset();f.step(40);assert(f.m.autopilot);assert.equal(f.m.command.type,'train');
 f.s.defeated(f.m.g);f.step(270);assert(f.m.g.hp>0);assert(f.m.round.childRemaining>0);assert.equal(f.m.command.type,'move');f.step(550);assert.equal(f.m.round.childRemaining,0);assert.equal(f.m.command.type,'train');
 }finally{f.s.channel.close();}
});


test('commands received while dead cannot disable AUTO; repeated respawns preserve it',()=>{
 const f=fixture();try{f.s.receive({type:'command',id:'player',command:{type:'auto'}});
 for(let life=0;life<2;life++){f.s.defeated(f.m.g);for(const command of [{type:'direct',dx:1,dz:0},{type:'strike',yaw:0},{type:'jump'},{type:'idle'}]){f.s.receive({type:'command',id:'player',command});f.step(3);}assert(f.m.autopilot);f.step(260);assert(f.m.g.hp>0);assert(f.m.autopilot);assert.notEqual(f.m.command.type,'direct');}
 }finally{f.s.channel.close();}
});
