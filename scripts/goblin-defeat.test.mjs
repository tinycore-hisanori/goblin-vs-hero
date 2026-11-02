import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LocalSession} from '../src/local-session.js';
import {AI_RESPAWN_SECONDS,DEFEAT_DURATION,defeatPose,applyDefeatPose,clearDefeatPose} from '../src/goblin-defeat.js';
import {world} from '../src/dungeon.js';
test('defeat falls first, pauses on the floor, then sinks and disappears; revival restores the model',()=>{
 const root=new THREE.Group(),model=new THREE.Group();root.add(model);const g={root,model,height:1.8};
 assert.equal(defeatPose(0).visible,true);assert.equal(defeatPose(.6).tilt,Math.PI/2);assert.equal(defeatPose(.9).sink,0);assert(defeatPose(1.9).sink>0);assert.equal(defeatPose(DEFEAT_DURATION).visible,false);
 applyDefeatPose(g,0);assert(root.visible);applyDefeatPose(g,.6);assert.equal(model.rotation.x,Math.PI/2);assert(g.defeatMark.visible);
 applyDefeatPose(g,2);assert(model.position.y<0);applyDefeatPose(g,DEFEAT_DURATION);assert(!root.visible);
 clearDefeatPose(g);assert.equal(model.position.y,0);assert.equal(model.rotation.x,0);assert(!g.defeatMark.visible);
});
test('AI goblins revive after 22 seconds even during preparation and can be defeated repeatedly',()=>{
 const spawn=world(5,21),root=new THREE.Group(),model=new THREE.Group();root.add(model);root.position.set(spawn.x,0,spawn.z);const g={root,model,spawn,hp:3,route:[],cooldown:0};let revived=0;
 const session=new LocalSession({goblins:()=>[g],ended:()=>false,hero:()=>({x:100,z:100}),reviveAI:()=>revived++},{networked:false});
 for(let life=0;life<2;life++){
  session.defeated(g);assert.equal(g.hp,0);assert(g.root.visible);assert.equal(g.respawn,AI_RESPAWN_SECONDS);
  for(let i=0;i<30;i++)session.updateGoblin(g,.1);assert(!g.root.visible);assert.equal(g.hp,0);
  for(let i=0;i<191;i++)session.updateGoblin(g,.1);
  assert.equal(g.hp,3);assert(g.root.visible);assert.equal(g.model.rotation.x,0);assert.equal(g.model.position.y,0);assert.equal(g.root.position.x,spawn.x);assert.equal(g.root.position.z,spawn.z);
 }
 assert.equal(revived,2);
});
