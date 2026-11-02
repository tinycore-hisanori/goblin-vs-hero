import {createMovement} from './movement.js';
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
export function createGoblinControls(canvas,{enabled=()=>true,onMove=()=>{},onAttack=()=>{},onJump=()=>{},onStone=()=>{},onInteract=()=>{},onFriendly=()=>{},onCamera=()=>{},onMap=()=>{},onMenu=()=>{},onEvolve=()=>{},onLook=()=>{},onHint=()=>{},document:doc=globalThis.document,window:win=globalThis.window}={}){
 const movement=createMovement();let attack=false,pending=false,drag=null;
 const locked=()=>doc.pointerLockElement===canvas;
 const editable=e=>['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable;
 function clear(){movement.clear();attack=false;drag=null;}
 function unlock(){clear();if(locked())doc.exitPointerLock();}
 async function capture(){if(locked()||pending||!canvas.requestPointerLock)return;pending=true;try{await canvas.requestPointerLock();}catch{onHint('カーソル固定が使えないため、右ドラッグで視点を操作できます');}finally{pending=false;}}
 win.addEventListener('keydown',e=>{
  if(editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(!enabled()||(e.target?.tagName==='BUTTON'&&['Space','Enter'].includes(e.code)))return;
  if(movementCodes.has(e.code)){e.preventDefault();canvas.focus({preventScroll:true});onMove();movement.down(e.code,performance.now(),e.repeat);return;}
  const actions={Space:onJump,KeyE:onInteract,Digit2:onStone,KeyF:onFriendly,KeyV:onCamera,KeyM:onMap,Tab:onMenu,KeyG:onEvolve,Escape:onMenu};
  if(actions[e.code]){e.preventDefault();if(!e.repeat)actions[e.code]();}
 });
 win.addEventListener('keyup',e=>movement.up(e.code));
 canvas.addEventListener('pointerdown',e=>{
  if(!enabled())return;canvas.focus({preventScroll:true});
  if(e.pointerType==='touch'||e.button===2){e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
  if(e.button===0){e.preventDefault();onMove();attack=true;onAttack();capture();}
 });
 canvas.addEventListener('pointermove',e=>{if(locked()||!drag||e.pointerId!==drag.id||!enabled())return;onLook((e.clientX-drag.x)*.004,(e.clientY-drag.y)*.004);drag={id:e.pointerId,x:e.clientX,y:e.clientY};});
 const release=e=>{if(e.button===0)attack=false;if(drag?.id===e.pointerId)drag=null;};
 win.addEventListener('pointerup',release);win.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 doc.addEventListener('mousemove',e=>{if(locked()&&enabled())onLook(e.movementX*.002,e.movementY*.002);});
 doc.addEventListener('pointerlockchange',()=>{clear();});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 win.addEventListener('blur',unlock);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)unlock();});
 return{movement,clear,unlock,locked,state:()=>({...movement.state(),attack})};
}
