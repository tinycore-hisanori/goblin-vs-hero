import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVOLUTIONS,newRoundProgress,newCareer,gainXP,train,evolve,creditKill,creditJob,finishRound,normalizeCareer,unlockedRewards} from '../src/progression.js';
import {LocalSession} from '../src/local-session.js';
import {world,holes,climbs,valid} from '../src/dungeon.js';

test('round strength resets; career rewards have a per-round cap and no stat bonuses',()=>{
 const r=newRoundProgress(),p=newCareer('test');for(let i=0;i<20;i++)gainXP(r,p,6,'training');assert.equal(r.xp,120);assert.equal(p.xp,60);assert.equal(p.training,10);assert(unlockedRewards(p).some(x=>x.id==='training'));assert(evolve(r,p));assert(evolve(r,p));assert(!evolve(r,p));gainXP(r,p,60,'training');assert(evolve(r,p));assert(!evolve(r,p));assert.equal(p.maxStage,3);assert(unlockedRewards(p).some(x=>x.id==='lord'));const fresh=newRoundProgress();assert.equal(fresh.xp,0);assert.equal(fresh.stage,0);assert.equal(p.xp,60);assert.equal(EVOLUTIONS[0].hp,6);
});
test('training requires uninterrupted time, with rest between awards',()=>{
 const r=newRoundProgress(),p=newCareer('test');train(r,p,3,true);assert.equal(r.xp,0);train(r,p,.1,false);assert.equal(r.trainingProgress,0);assert(train(r,p,4,true));assert.equal(r.xp,6);assert(!train(r,p,1,true));assert(!train(r,p,1,true));assert.equal(r.xp,6);assert(train(r,p,4,true));assert.equal(r.xp,12);
});
test('repeat victims, duplicate work credit and duplicate round-end credit are blocked',()=>{
 const r=newRoundProgress(),p=newCareer('test');assert(creditKill(r,p,'victim',0));assert(!creditKill(r,p,'victim',59));assert(creditKill(r,p,'victim',60));assert(creditJob(r,p,'hole'));assert(!creditJob(r,p,'hole'));assert(finishRound(r,p));assert(!finishRound(r,p));assert.equal(p.matches,1);assert.equal(p.kills,2);
});
test('evolved forms have explicit shortcut restrictions; invalid career data is sanitized',()=>{
 const [x,z]=holes[0],hole=world(x,z);assert(valid(hole.x,hole.z,.23,EVOLUTIONS[0].abilities));assert(!valid(hole.x,hole.z,.23,EVOLUTIONS[1].abilities));const c=world(...climbs[0]);assert(valid(c.x,c.z,.23,EVOLUTIONS[1].abilities));assert(!valid(c.x,c.z,.23,EVOLUTIONS[2].abilities));const p=normalizeCareer({xp:-2,kills:NaN,maxStage:999,decoration:'missing'},'safe');assert.equal(p.xp,0);assert.equal(p.kills,0);assert.equal(p.maxStage,3);assert.equal(p.decoration,'rookie');
});
test('local viewer travels to training, earns XP, evolves, reconnects and resets only round XP',()=>{
 const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};const goblins=[];let seq=0;const stages=[];
 const api={ready:()=>true,ended:()=>false,goblins:()=>goblins,hero:()=>({x:100,z:100}),appearance:(g,stage)=>stages.push(stage),tag:()=>{},motion:()=>{},damageHero:()=>{},impact:()=>{},spawn:()=>{const spawn=world(5,21),g={id:'g'+(++seq),root:{position:new THREE.Vector3(spawn.x,0,spawn.z),rotation:{y:0},visible:true},model:{position:{y:0},rotation:{z:0}},spawn,hp:6,route:[],repath:0,cooldown:0};goblins.push(g);return g;}};
 const session=new LocalSession(api);session.active=true;try{
  session.receive({type:'join',id:'test',name:'Test'});const m=session.members.get('test');session.receive({type:'command',id:'test',command:{type:'train',station:'dummy'}});
  for(let i=0;i<1200;i++){session.update(.04);session.updateGoblin(m.g,.04);}assert(m.round.xp>=30);assert(m.career.xp>=30);assert(m.g.root.position.distanceTo(new THREE.Vector3(...[world(4,20).x,0,world(4,20).z]))<.4);
  m.g.hp=3;session.receive({type:'command',id:'test',command:{type:'evolve'}});assert.equal(m.round.stage,1);assert.equal(m.g.hp,5);assert.equal(stages.at(-1),1);gainXP(m.round,m.career,180,'training');for(const expected of [2,3]){session.update(.1);session.receive({type:'command',id:'test',command:{type:'evolve'}});assert.equal(m.round.stage,expected);assert.equal(stages.at(-1),expected);}assert.equal(m.career.maxStage,3);const saved=m.career.xp;const originalGoblin=m.g;m.round.xp=222;session.receive({type:'join',id:'test',name:'Renamed'});assert.equal(session.members.size,1);assert.equal(m.g,originalGoblin);assert.equal(m.round.xp,222);assert.equal(m.round.stage,3);assert.equal(m.name,'Renamed');assert.equal(m.career.xp,saved);session.reset();assert.equal(m.round.xp,0);assert.equal(m.round.stage,0);assert.equal(m.career.xp,saved);assert.equal(m.g.hp,6);
  session.receive({type:'leave',id:'test'});session.receive({type:'join',id:'test',name:'Test'});assert.equal(session.members.get('test').career.xp,saved);assert.equal(session.members.get('test').round.xp,0);
 }finally{session.channel.close();}
});
