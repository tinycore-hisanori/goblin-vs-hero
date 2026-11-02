import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovement,SPRINT_MULTIPLIER,HERO_WALK_SPEED} from '../src/movement.js';
test('Shift is hold-to-sprint for both shift keys; double-tap no longer sprints; clear releases everything',()=>{
 const m=createMovement();m.down('KeyW',0);m.up('KeyW');m.down('KeyW',100);assert(!m.state().sprinting);
 m.down('ShiftLeft',200);assert(m.state().sprinting);assert(!m.state().sneaking);assert.equal(HERO_WALK_SPEED*SPRINT_MULTIPLIER,5);
 m.up('ShiftLeft');assert(!m.state().sprinting);m.down('ShiftRight',300);assert(m.state().sprinting);
 m.up('KeyW');assert(!m.state().sprinting);m.down('KeyD',400);assert(m.state().sprinting);m.clear();assert.deepEqual(m.state(),{forward:0,side:0,sneaking:false,sprinting:false});
});
