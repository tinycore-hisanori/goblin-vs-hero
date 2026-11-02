import test from 'node:test';
import assert from 'node:assert/strict';
import {moveBody,separateBodies,placeBody} from '../src/character-collision.js';
import {LocalSession} from '../src/local-session.js';
import {EVOLUTIONS,newRoundProgress,newCareer} from '../src/progression.js';
import {world} from '../src/dungeon.js';
import * as THREE from 'three';
const body=(id,x,z,y=0,height=.8)=>({id,position:{x,y,z},radius:.3,height,valid:()=>true});
test('fast movement cannot pass through a character; sideways movement slides around contact',()=>{
 const a=body('hero',0,0,0,1.65),b=body('goblin',1,0),all=[a,b];
 moveBody(a,5,0,all);assert(a.position.x<=.40001);assert(a.position.x>.3);
 moveBody(a,0,1,all);assert(a.position.z>.99);moveBody(a,2,0,all);assert(a.position.x>2);
});
test('height permits jumping over a short body, and landing separates bodies without crossing a wall',()=>{
 const a=body('hero',0,0,1,1.65),b=body('goblin',1,0);moveBody(a,1,0,[a,b]);assert(Math.abs(a.position.x-1)<1e-8);
 a.position.y=0;b.valid=(x,z)=>x>=1;separateBodies([a,b]);assert(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)>=.599);assert(b.position.x>=1);
});
test('spawn placement avoids occupied spots and never chooses a blocked location',()=>{
 const a=body('one',0,0),b=body('two',0,0);b.valid=(x,z)=>x>=0&&z>=0;
 assert(placeBody(b,{x:0,z:0},[a,b]));assert(Math.hypot(b.position.x,b.position.z)>=.6);assert(b.position.x>=0&&b.position.z>=0);
});
test('authoritative hero, direct goblin and Auto movement collide; defeated actors do not block',()=>{
 const origin=world(5,21),hero=new THREE.Vector3(origin.x,0,origin.z),g={id:'g',root:{position:hero.clone().add(new THREE.Vector3(1,0,0)),rotation:{y:0}},hp:6,spawn:origin,route:[],repath:0,model:{position:{y:0},rotation:{z:0}}};
 const session=new LocalSession({goblins:()=>[g],hero:()=>hero,heroHp:()=>150},{networked:false});
 session.moveActor(null,1,0,1,5);assert(hero.x<g.root.position.x-.52);
 const stopped=g.root.position.x;session.moveActor(g,-1,0,1,5);assert(g.root.position.x>=hero.x+.529);assert(g.root.position.x<=stopped);
 session.walk(g,hero,.2,{speed:2,abilities:{burrows:true,climb:true}});assert(g.root.position.x>=hero.x+.529);
 g.hp=0;session.moveActor(null,1,0,.3,5);assert(hero.x>g.root.position.x);
});
test('every evolution increases authoritative movement speed, and sprint is exactly double at every stage',()=>{
 const p=world(5,21),g={root:{position:new THREE.Vector3(p.x,0,p.z),rotation:{y:0}},hp:22,route:[],cooldown:0,model:{position:{y:0},rotation:{z:0}}};g.viewer={round:newRoundProgress(),career:newCareer('test'),g,command:{type:'idle'}};
 const session=new LocalSession({goblins:()=>[g],hero:()=>({x:100,z:100}),ended:()=>false,motion(){}},{networked:false});let previous=0;
 for(let stage=0;stage<4;stage++){
  g.viewer.round.stage=stage;const distances=[];
  for(const sprinting of [false,true]){g.root.position.set(p.x,0,p.z);g.viewer.command={type:'direct',dx:1,dz:0,until:1,sprinting};session.updateGoblin(g,.05);distances.push(g.root.position.x-p.x);}
  assert(Math.abs(distances[1]/distances[0]-2)<1e-8);assert(distances[0]>previous);previous=distances[0];assert(Math.abs(distances[0]-.05*EVOLUTIONS[stage].speed)<1e-8);
 }
});
test('six simultaneous joins and a growing goblin remain separated inside walkable terrain',t=>{
 const actors=[],p=world(5,21),session=new LocalSession({ready:()=>true,ended:()=>false,hero:()=>({x:100,z:100}),goblins:()=>actors,appearance(){},tag(){},spawn(){const g={id:String(actors.length),hp:6,root:{position:new THREE.Vector3(p.x,0,p.z),rotation:{y:0}},spawn:p};actors.push(g);return g;}});t.after(()=>session.channel.close());
 for(let i=0;i<6;i++)session.receive({type:'join',id:String(i),name:'test'});
 actors[0].viewer.round.stage=3;session.resolveBodies();const bodies=session.bodies().filter(b=>b.id!=='hero');
 for(let i=0;i<bodies.length;i++){const a=bodies[i];assert(a.valid(a.position.x,a.position.z));for(let j=i+1;j<bodies.length;j++){const b=bodies[j];assert(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)>=a.radius+b.radius-.005);}}
});
