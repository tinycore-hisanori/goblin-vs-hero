export const SPRINT_MULTIPLIER=2,HERO_WALK_SPEED=2.5;
const directions={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
export function createMovement(){
 const held=new Set();
 const pressed=direction=>Object.entries(directions).some(([key,value])=>value===direction&&held.has(key));
 function down(code,time,repeat=false){if(!repeat)held.add(code);}
 function up(code){held.delete(code);}
 function clear(){held.clear();}
 function state(){const forward=Number(pressed('forward'))-Number(pressed('back')),side=Number(pressed('right'))-Number(pressed('left'));return{forward,side,sneaking:false,sprinting:(held.has('ShiftLeft')||held.has('ShiftRight'))&&!!(forward||side)};}
 return{held,down,up,clear,state};
}
