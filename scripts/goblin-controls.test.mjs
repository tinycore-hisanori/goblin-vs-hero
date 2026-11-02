import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoblinControls} from '../src/goblin-controls.js';
function surface(){const listeners={};return{tagName:'CANVAS',addEventListener(type,fn){(listeners[type]??=[]).push(fn);},focus(){},setPointerCapture(){},fire(type,data={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},...data};for(const fn of listeners[type]||[])fn(e);return e;}};}
test('shared movement, one-shot click/jump, shortcuts, blur and menu input suppression',()=>{
 const canvas=surface(),document=surface(),window=surface(),counts={};let enabled=true;
 const action=name=>()=>counts[name]=(counts[name]||0)+1;
 const input=createGoblinControls(canvas,{document,window,enabled:()=>enabled,onAttack:action('attack'),onJump:action('jump'),onInteract:action('eat'),onStone:action('stone'),onFriendly:action('friendly'),onMap:action('map'),onMenu:action('menu'),onCamera:action('camera'),onEvolve:action('evolve')});
 const key=(code,extra={})=>window.fire('keydown',{code,target:canvas,...extra});
 key('KeyW');window.fire('keyup',{code:'KeyW'});key('KeyW');assert(input.state().sprinting);key('ShiftLeft');assert(input.state().sneaking);assert(!input.state().sprinting);
 key('Space');key('Space',{repeat:true});assert.equal(counts.jump,1);assert.equal(counts.attack,undefined);
 canvas.fire('pointerdown',{button:0,pointerType:'mouse'});window.fire('pointerup',{button:0});assert.equal(counts.attack,1);assert(!input.state().attack);
 for(const code of ['KeyE','Digit2','KeyF','KeyV','KeyM','Tab','KeyG'])key(code);
 for(const name of ['eat','stone','friendly','camera','map','menu','evolve'])assert.equal(counts[name],1);
 window.fire('blur');assert.equal(input.state().forward,0);assert(!input.state().sneaking);
 enabled=false;key('Space');key('KeyW');assert.equal(counts.jump,1);assert.equal(input.state().forward,0);
 enabled=true;key('KeyF',{target:{tagName:'INPUT'}});assert.equal(counts.friendly,1);
 key('KeyW',{target:{tagName:'BUTTON'}});assert.equal(input.state().forward,1);window.fire('keyup',{code:'KeyW'});
 key('KeyW',{ctrlKey:true});assert.equal(input.state().forward,0);
});
