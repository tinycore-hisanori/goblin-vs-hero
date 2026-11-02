import test from 'node:test';
import assert from 'node:assert/strict';
import {createControls} from '../src/controls.js';
import {createGoblinControls} from '../src/goblin-controls.js';
import {FoodSupply,foodItems} from '../src/food.js';
function surface(){const listeners={};return{tagName:'CANVAS',addEventListener(type,fn){(listeners[type]??=[]).push(fn);},focus(){},fire(type,data){for(const fn of listeners[type]||[])fn({target:this,preventDefault(){},...data});}};}
for(const role of ['hero','goblin'])test(`${role}: E consumes nearby food once, caps HP, ignores repeat and does nothing while UI is inactive`,()=>{
 const canvas=surface(),document=surface(),window=surface(),supply=new FoodSupply(),food=foodItems[0],position={x:food.x,z:food.z};let hp=role==='hero'?145:5,max=role==='hero'?150:6,enabled=true;
 const onInteract=()=>{const result=supply.eat(position,hp,max,role);hp=result.hp;};
 if(role==='hero'){document.pointerLockElement=canvas;createControls(canvas,{document,window,onInteract,onState(){},onAttack(){},onLook(){}});}
 else createGoblinControls(canvas,{document,window,onInteract,enabled:()=>enabled});
 const press=repeat=>window.fire('keydown',{target:canvas,code:'KeyE',repeat});
 press(false);assert.equal(hp,max);assert.equal(supply.snapshot().length,1);
 hp-=1;press(true);assert.equal(hp,max-1);assert.equal(supply.snapshot().length,1);
 enabled=false;document.pointerLockElement=null;press(false);assert.equal(hp,max-1);assert.equal(supply.snapshot().length,1);
});
