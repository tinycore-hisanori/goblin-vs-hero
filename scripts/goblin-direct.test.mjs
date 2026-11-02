import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LocalSession} from '../src/local-session.js';
import {world,valid,beds} from '../src/dungeon.js';
import {cameraMovement} from '../src/goblin-camera.js';

function fixture(t,start=world(5,21)){
 const goblins=[],hero=new THREE.Vector3(100,0,100);let damage=0;
 const spawn=()=>{const g={id:'g'+goblins.length,root:{position:new THREE.Vector3(start.x,0,start.z),rotation:{y:0},visible:true},model:{rotation:{z:0},position:{y:0}},spawn:start,hp:6,route:[],cooldown:0,repath:0};goblins.push(g);return g;};
 const s=new LocalSession({ready:()=>true,ended:()=>false,goblins:()=>goblins,hero:()=>hero,spawn,appearance(){},tag(){},motion(){},impact(){},damageHero(n){damage+=n;}});s.active=true;s.receive({type:'join',id:'p',name:'P'});t.after(()=>s.channel.close());
 return{s,m:s.members.get('p'),hero,spawn,damage:()=>damage,command(command){s.receive({type:'command',id:'p',command});},step(seconds){for(let i=0;i<Math.round(seconds/.01);i++){s.update(.01);s.updateGoblin(s.members.get('p').g,.01);}}};
}
test('jump is authoritative, cannot double-jump, lands, and does not get cancelled by bed updates',t=>{
 const f=fixture(t),g=f.m.g;f.command({type:'jump'});f.step(.15);assert(g.root.position.y>.5);const velocity=g.jump.velocity;f.command({type:'jump'});assert.equal(g.jump.velocity,velocity);f.step(.8);assert.equal(g.root.position.y,0);assert(g.jump.grounded);
 g.root.position.set(beds[0].x,.53,beds[0].z);g.hp=2;f.command({type:'jump'});f.step(.2);assert(g.root.position.y>1);assert(!g.bedRest.onBed);f.step(.8);assert.equal(g.root.position.y,.53);assert(g.jump.grounded);
});
test('jump clears low bones but never allows passing a full wall',t=>{
 const bones=world(12,11),f=fixture(t,{x:bones.x,z:bones.z-1.3}),g=f.m.g;
 const move=()=>f.command({type:'direct',dx:0,dz:1,yaw:0});
 for(let i=0;i<8;i++){move();f.step(.1);}assert(g.root.position.z<bones.z-1.2);
 f.command({type:'jump'});for(let i=0;i<7;i++){move();f.step(.1);}assert(g.root.position.z>bones.z-1);assert.equal(g.root.position.y,.3);
 assert(!valid(world(0,0).x,world(0,0).z,.23,{burrows:true,climb:true},10));
});
test('friendly-fire OFF blocks direct melee, stones, and Auto hunting; ON permits them and OFF cancels hunting',t=>{
 const f=fixture(t),p=f.m.g.root.position,v=f.spawn();v.root.position.set(p.x,0,p.z+.9);
 f.command({type:'direct',dx:0,dz:0,yaw:0,attack:true,hunt:true,target:v.id});f.step(.1);assert.equal(v.hp,6);
 f.command({type:'stone',target:v.id,yaw:0});f.step(.2);assert.equal(v.hp,6);
 f.command({type:'hunt',target:v.id});assert.notEqual(f.m.command.type,'hunt');
 f.command({type:'friendly-fire',enabled:true});f.m.g.cooldown=0;f.command({type:'direct',dx:0,dz:0,yaw:0,attack:true});f.step(.1);assert.equal(v.hp,5);
 f.command({type:'hunt',target:v.id});assert.equal(f.m.command.type,'hunt');f.command({type:'friendly-fire',enabled:false});assert.equal(f.m.command.type,'idle');
 f.command({type:'friendly-fire',enabled:true});f.m.stoneReady=0;f.command({type:'stone',target:v.id});f.command({type:'friendly-fire',enabled:false});f.step(.2);assert.equal(v.hp,5);
});
test('hero stays attackable when friendly-fire is ON, but attacks cannot hit behind the view',t=>{
 const f=fixture(t),p=f.m.g.root.position;f.hero.copy(p).add(new THREE.Vector3(0,0,.9));f.command({type:'friendly-fire',enabled:true});f.command({type:'direct',dx:0,dz:0,yaw:Math.PI,attack:true});f.step(.1);assert.equal(f.damage(),0);f.m.g.cooldown=0;f.command({type:'direct',dx:0,dz:0,yaw:0,attack:true});f.step(.1);assert.equal(f.damage(),3);
});
test('sprint doubles movement, legacy sneak flags have no effect, and diagonal speed is bounded',t=>{
 const f=fixture(t),p=f.m.g.root.position,start=p.clone();
 const distanceFor=flags=>{p.copy(start);f.command({type:'direct',dx:1,dz:1,...flags});f.step(.1);return p.distanceTo(start);};
 const normal=distanceFor({}),sneak=distanceFor({sneaking:true}),sprint=distanceFor({sprinting:true});assert(Math.abs(sneak/normal-1)<1e-6);assert(Math.abs(sprint/normal-2)<1e-6);assert(normal<.17);
});
test('a short click hits even between movement packets, and respects the attack cooldown',t=>{
 const f=fixture(t),p=f.m.g.root.position;f.hero.copy(p).add(new THREE.Vector3(0,0,1));f.command({type:'direct',dx:0,dz:0});f.command({type:'strike',yaw:0});assert.equal(f.damage(),3);f.command({type:'strike',yaw:0});assert.equal(f.damage(),3);
});
test('walking faces every camera-relative movement direction, retains facing when stopped, and still aims attacks',t=>{
 const f=fixture(t),g=f.m.g,start=g.root.position.clone();
 for(const cameraYaw of [0,.7,Math.PI])for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
  g.root.position.copy(start);const move=cameraMovement(x,z,cameraYaw);
  f.command({type:'direct',...move,yaw:cameraYaw+Math.PI});f.step(.1);
  const expected=Math.atan2(move.dx,move.dz);assert(Math.abs(g.root.rotation.y-expected)<1e-8);
  assert(g.root.position.distanceTo(start)>.01);
  f.command({type:'direct',dx:0,dz:0,yaw:cameraYaw});f.step(.1);assert(Math.abs(g.root.rotation.y-expected)<1e-8);
 }
 f.hero.copy(g.root.position).add(new THREE.Vector3(0,0,1));f.command({type:'strike',yaw:0});assert.equal(f.damage(),3);
});
