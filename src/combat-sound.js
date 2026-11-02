// Compare authoritative states rather than input: blocked/repeated clicks make no hit sound.
export function createCombatSoundObserver(play){
 let previous=new Map(),round=null,lastTime=-Infinity;
 return (actors,listener,roundKey,time)=>{
  const fresh=round===roundKey&&time-lastTime<2000;round=roundKey;lastTime=time;
  const next=new Map();let swing=0,hit=0;
  for(const actor of actors){
   next.set(actor.id,{hp:actor.hp,attackSeq:actor.attackSeq||0});
   const old=previous.get(actor.id);if(!fresh||!old||!listener)continue;
   const volume=Math.max(0,1-Math.hypot(actor.x-listener.x,actor.z-listener.z)/12);
   if(actor.hp<old.hp)hit=Math.max(hit,volume);
   if(actor.hp>0&&(actor.attackSeq||0)>old.attackSeq)swing=Math.max(swing,volume);
  }
  previous=next;
  if(swing)play('swing',swing);if(hit)play('hit',hit);
 };
}
