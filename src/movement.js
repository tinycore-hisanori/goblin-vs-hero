const directions={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
export function createMovement(){
 const held=new Set(),lastTap=new Map();let sprintDirection=null;
 const pressed=direction=>Object.entries(directions).some(([key,value])=>value===direction&&held.has(key));
 const sneak=()=>held.has('ShiftLeft')||held.has('ShiftRight');
 function down(code,time,repeat=false){if(repeat||held.has(code))return;const direction=directions[code],already=direction&&pressed(direction);held.add(code);if(code==='ShiftLeft'||code==='ShiftRight'){sprintDirection=null;lastTap.clear();}if(direction&&!already){if(!sneak()&&lastTap.has(direction)&&time-lastTap.get(direction)<=280){sprintDirection=direction;lastTap.delete(direction);}else lastTap.set(direction,time);}}
 function up(code){held.delete(code);if(directions[code]===sprintDirection&&!pressed(sprintDirection))sprintDirection=null;}
 function clear(){held.clear();lastTap.clear();sprintDirection=null;}
 function state(){const forward=Number(pressed('forward'))-Number(pressed('back')),side=Number(pressed('right'))-Number(pressed('left'));return{forward,side,sneaking:sneak(),sprinting:!sneak()&&!!sprintDirection&&pressed(sprintDirection)&&!!(forward||side)};}
 return{held,down,up,clear,state};
}
