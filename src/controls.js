import {createMovement} from './movement.js';
export function createControls(canvas,{document:doc=globalThis.document,window:win=globalThis.window,onAttack,onLook,onState,onInteract=()=>{},onItem=()=>{},onWeapon=()=>{},onReload=()=>{},onJump=()=>{}}){
 const movement=createMovement(),held=movement.held;let leftDown=false,pending=false,sensitivity=.002;
 const locked=()=>doc.pointerLockElement===canvas;
 function clear(){movement.clear();leftDown=false;}
 function failed(){pending=false;clear();onState('blocked');}
 async function capture(){if(locked()||pending)return;pending=true;try{if(!canvas.requestPointerLock)throw Error('Pointer lock unavailable');await canvas.requestPointerLock();}catch{failed();}}
 canvas.addEventListener('mousedown',e=>{if(e.button!==0)return;e.preventDefault();if(!locked()){capture();return;}leftDown=true;onAttack();});
 win.addEventListener('mouseup',e=>{if(e.button===0)leftDown=false;});
 doc.addEventListener('mousemove',e=>{if(locked())onLook(e.movementX*sensitivity,e.movementY*sensitivity);});
 win.addEventListener('keydown',e=>{if(!locked())return;if(['Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();movement.down(e.code,performance.now(),e.repeat);if(e.code==='Space'&&!e.repeat)onJump();if(e.code==='KeyE'&&!e.repeat)onInteract();if(e.code==='KeyQ'&&!e.repeat)onWeapon();if(e.code==='KeyR'&&!e.repeat)onReload();if(!e.repeat&&/^Digit[123]$/.test(e.code))onItem(Number(e.code.slice(-1))-1);});
 win.addEventListener('keyup',e=>movement.up(e.code));
 win.addEventListener('blur',()=>{clear();if(locked())doc.exitPointerLock();});
 doc.addEventListener('pointerlockchange',()=>{pending=false;clear();onState(locked()?'playing':'paused');});
 doc.addEventListener('pointerlockerror',failed);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 return{held,movement,locked,capture,clear,setSensitivity(value){sensitivity=value;},update(){if(locked()&&leftDown)onAttack();}};
}
