import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {retargetPunch,markGoblinAttack} from '../src/goblin-attack.js';
const data=JSON.parse(fs.readFileSync('public/models/goblin-punch.json'));
for(const id of ['ai-goblin','viewer-goblin','hob-goblin','goblin-king','goblin-lord','child-goblin'])test(`punch binds and rotates ${id} without replacing bone lengths or root position`,()=>{
 const b=fs.readFileSync(`public/models/${id}.glb`),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),model=new THREE.Group();
 for(const i of j.skins[0].joints){const n=j.nodes[i],bone=new THREE.Bone();bone.name=THREE.PropertyBinding.sanitizeNodeName(n.name);bone.quaternion.fromArray(n.rotation||[0,0,0,1]);bone.position.fromArray(n.translation||[0,0,0]);model.add(bone);}
 const initial=model.children.map(b=>({q:b.quaternion.clone(),p:b.position.clone()})),clip=retargetPunch(model,data);assert.equal(clip.tracks.length,28);assert.ok(clip.tracks.every(t=>t.name.endsWith('.quaternion')));
 const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixer.update(.4);assert.ok(model.children.some((b,i)=>b.quaternion.angleTo(initial[i].q)>.1));assert.ok(model.children.every((b,i)=>b.position.equals(initial[i].p)));mixer.stopAllAction();assert.ok(model.children.every((b,i)=>b.quaternion.angleTo(initial[i].q)<.00001));
});
test('attack sequence increments on every strike',()=>{const g={};markGoblinAttack(g);markGoblinAttack(g);assert.equal(g.attackSeq,2);});
