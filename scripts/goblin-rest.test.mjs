import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LocalSession} from '../src/local-session.js';
import {beds,bedAt,world,regenerateDungeon,valid,clearLine,path,goblinSpawns,openGate,resetGate} from '../src/dungeon.js';
import {EVOLUTIONS} from '../src/progression.js';
import {updateBedRest} from '../src/goblin-rest.js';
import {markGoblinAttack} from '../src/goblin-attack.js';

function actor(p=beds[0]){return {id:'g1',root:{position:new THREE.Vector3(p.x,0,p.z),rotation:{y:0},visible:true},model:{position:{y:0},rotation:{z:0}},spawn:p,hp:2,route:[],repath:0,cooldown:0,stun:0};}
function advance(g,seconds,max=6,ended=false){for(let t=0;t<seconds-1e-8;t+=.04)updateBedRest(g,Math.min(.04,seconds-t),max,ended);}
function fixture(start=world(5,21)){const g=actor(start),f={g,ended:false,messages:[]};const s=new LocalSession({ready:()=>true,ended:()=>f.ended,goblins:()=>[g],hero:()=>({x:100,z:100}),spawn:()=>g,appearance:()=>{},tag:()=>{},motion:()=>{}});s.send=m=>f.messages.push(m);s.active=true;s.receive({type:'join',id:'tester',name:'休息テスト'});f.s=s;f.m=s.members.get('tester');f.step=seconds=>{for(let t=0;t<seconds;t+=.04){s.update(.04);s.updateGoblin(g,.04);}};return f;}

test('beds heal gradually after settling, cap at current max HP, and stop off-bed, dead or ended',()=>{
 const g=actor();advance(g,1);assert.equal(g.hp,2);advance(g,2);assert(Math.abs(g.hp-3)<1e-8);assert.equal(g.root.position.y,.53);
 advance(g,30);assert.equal(g.hp,6);assert.equal(g.bedRest.healing,false);
 g.hp=2;g.root.position.x+=1;advance(g,10);assert.equal(g.hp,2);assert.equal(g.root.position.y,0);
 g.root.position.x-=1;g.hp=0;advance(g,10);assert.equal(g.hp,0);g.hp=2;advance(g,10,6,true);assert.equal(g.hp,2);
 const child=actor();advance(child,20,3);assert.equal(child.hp,3);
});

test('taking damage or attacking interrupts rest for three seconds, including stones',()=>{
 const g=actor();advance(g,2);g.hp-=1;updateBedRest(g,.04,6);const hp=g.hp;
 advance(g,3);assert(Math.abs(g.hp-hp)<1e-8);advance(g,2);assert(Math.abs(g.hp-hp-1)<1e-8);
 markGoblinAttack(g);updateBedRest(g,.04,6);const attackHp=g.hp;advance(g,3);assert(Math.abs(g.hp-attackHp)<1e-8);advance(g,1);assert(g.hp>attackHp);
 const f=fixture(beds[0]);try{f.step(2);f.s.receive({type:'command',id:'tester',command:{type:'stone'}});f.s.update(.04);assert.equal(f.g.bedRest.combat,3);assert.equal(f.g.bedRest.healing,false);}finally{f.s.channel.close();}
});

test('every evolution can reach beds; beds do not block melee line of sight',()=>{
 openGate(); // Upper treasury spawns require the existing gate to be open for large forms.
 for(const seed of [.1,.8]){regenerateDungeon(()=>seed);for(const tier of EVOLUTIONS)for(const spawn of goblinSpawns){const from=world(...spawn);assert(beds.some(b=>path(from,b,tier.abilities,true).length));}
 for(const b of beds){assert(valid(b.x,b.z,.23,{burrows:false,climb:false}));assert(!valid(b.x,b.z,.3,false));const adjacent=[{x:b.x,z:b.z+2},{x:b.x,z:b.z-2},{x:b.x+2,z:b.z},{x:b.x-2,z:b.z}].find(p=>valid(p.x,p.z,.23,true));assert(adjacent&&clearLine(adjacent,b));}}resetGate();
});

test('rest command actually walks to a bed, heals, broadcasts status and allows direct departure',()=>{
 regenerateDungeon(()=>.8);const f=fixture();try{f.m.round.stage=3;f.s.receive({type:'command',id:'tester',command:{type:'rest'}});assert.equal(f.m.command.type,'rest');
 f.step(120);assert(bedAt(f.g.root.position));assert.equal(f.g.hp,EVOLUTIONS[3].hp);assert.equal(f.m.round.xp,0);
 const snap=f.messages.filter(m=>m.type==='snapshot').at(-1);assert.equal(snap.goblins[0].onBed,true);assert.equal(snap.goblins[0].y,.53);
 f.s.receive({type:'command',id:'tester',command:{type:'direct',dx:0,dz:1}});assert.equal(f.m.command.type,'direct');const before=f.g.root.position.z;f.step(.2);assert(f.g.root.position.z>before);
 f.s.reset();assert.equal(f.g.bedRest,null);assert.equal(f.g.hp,EVOLUTIONS[0].hp);
 }finally{f.s.channel.close();}
});

test('a fresh rest command can walk onto a bed through its occupied furniture cell',()=>{
 const b=beds[0],f=fixture({x:b.x,z:b.z+2});try{f.s.receive({type:'command',id:'tester',command:{type:'rest',bedId:b.id}});f.step(8);assert(bedAt(f.g.root.position));assert(f.g.hp>2);}finally{f.s.channel.close();}
});
