import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatSoundObserver} from '../src/combat-sound.js';
test('combat sounds follow authoritative attacks and damage, never repeated snapshots or healing',()=>{
 const sounds=[],observe=createCombatSoundObserver((...v)=>sounds.push(v)),me={x:0,z:0};
 const state=(hp,seq)=>[{id:'g',x:0,z:0,hp,attackSeq:seq}];
 observe(state(6,8),me,'round',0);assert.equal(sounds.length,0);
 observe(state(5,9),me,'round',100);assert.deepEqual(sounds,[['swing',1],['hit',1]]);
 observe(state(5,9),me,'round',200);observe(state(6,9),me,'round',300);assert.equal(sounds.length,2);
 observe(state(0,10),me,'round',400);assert.deepEqual(sounds.at(-1),['hit',1]);assert.equal(sounds.length,3);
});
test('distant fights and initial, changed-round, and resumed snapshots stay quiet',()=>{
 const sounds=[],observe=createCombatSoundObserver((...v)=>sounds.push(v));
 const actor={id:'g',x:20,z:0,hp:6,attackSeq:0},me={x:0,z:0};
 observe([actor],me,'one',0);observe([{...actor,hp:4,attackSeq:1}],me,'one',100);
 observe([{...actor,x:0,hp:1,attackSeq:3}],me,'two',200);
 observe([{...actor,x:0,hp:0,attackSeq:5}],me,'two',5000);assert.equal(sounds.length,0);
});
