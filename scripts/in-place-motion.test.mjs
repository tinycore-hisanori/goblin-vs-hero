import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {inPlaceClip} from '../src/in-place-motion.js';
test('actual viewer walking hips stay in place across repeated loops without losing their vertical motion',()=>{
 const file=readFileSync('public/models/viewer-goblin.glb'),jsonLength=file.readUInt32LE(12),j=JSON.parse(file.subarray(20,20+jsonLength)),bin=file.subarray(28+jsonLength);
 const animation=j.animations.find(a=>/walk/i.test(a.name)),channel=animation.channels.find(c=>c.target.path==='translation'&&/Hips$/.test(j.nodes[c.target.node].name)),sampler=animation.samplers[channel.sampler];
 const read=index=>{const a=j.accessors[index],v=j.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0),size=a.type==='VEC3'?3:1;return Array.from({length:a.count*size},(_,i)=>bin.readFloatLE(offset+i*4));};
 const times=read(sampler.input),values=read(sampler.output),original=new THREE.AnimationClip('Walking',times.at(-1),[new THREE.VectorKeyframeTrack('Hips.position',times,values)]),clip=inPlaceClip(original);
 assert(Math.max(...values.filter((_,i)=>i%3===2))-Math.min(...values.filter((_,i)=>i%3===2))>1);
 const root=new THREE.Group(),hips=new THREE.Bone();hips.name='Hips';root.add(hips);const mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).play();let minY=Infinity,maxY=-Infinity;
 for(let i=0;i<600;i++){mixer.update(.016);assert(Math.abs(hips.position.x-values[0])<1e-6);assert(Math.abs(hips.position.z-values[2])<1e-6);minY=Math.min(minY,hips.position.y);maxY=Math.max(maxY,hips.position.y);}
 assert(maxY-minY>.03);assert.deepEqual(Array.from(original.tracks[0].values),values);
});
