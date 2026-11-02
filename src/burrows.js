export const SEAL_SECONDS=30,DIG_HITS=24,DIG_INTERVAL=.45,SEAL_COOLDOWN=5;
export const sealedHoles=new Map();
const key=(x,z)=>`${x},${z}`;
export const isSealed=(x,z)=>sealedHoles.has(key(x,z));
export function sealHole(x,z){if(isSealed(x,z))return false;sealedHoles.set(key(x,z),{x,z,remaining:SEAL_SECONDS,hits:DIG_HITS});return true;}
export function digHole(x,z){const state=sealedHoles.get(key(x,z));if(!state)return false;state.hits--;if(state.hits<=0){sealedHoles.delete(key(x,z));return true;}return false;}
export function updateSeals(dt){for(const [id,state]of sealedHoles){state.remaining-=dt;if(state.remaining<=0)sealedHoles.delete(id);}}
export function resetSeals(){sealedHoles.clear();}
