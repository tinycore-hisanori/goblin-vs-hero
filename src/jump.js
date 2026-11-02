export const JUMP_SPEED=5.8,GRAVITY=18;
export function newJump(){return{y:0,velocity:0,grounded:true};}
export function startJump(state){if(!state.grounded)return false;state.velocity=JUMP_SPEED;state.grounded=false;return true;}
export function stepJump(state,dt,support=0){const before=state.grounded;if(state.grounded&&state.y>support+.01)state.grounded=false;if(!state.grounded){state.velocity-=GRAVITY*dt;state.y+=state.velocity*dt;if(state.velocity<=0&&state.y<=support){state.y=support;state.velocity=0;state.grounded=true;}}return !before&&state.grounded;}
