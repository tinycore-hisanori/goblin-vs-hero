export const MAGAZINE=6,RELOAD_SECONDS=1.6,SHOT_INTERVAL=.28,GUN_RANGE=18;
export function newFirearm(){return{ammo:MAGAZINE,reserve:36,reload:0,cooldown:0};}
export function beginReload(gun){if(gun.reload>0||gun.ammo===MAGAZINE||gun.reserve<=0)return false;gun.reload=RELOAD_SECONDS;return true;}
export function tickFirearm(gun,dt){gun.cooldown=Math.max(0,gun.cooldown-dt);if(gun.reload>0){gun.reload=Math.max(0,gun.reload-dt);if(gun.reload===0){const count=Math.min(MAGAZINE-gun.ammo,gun.reserve);gun.ammo+=count;gun.reserve-=count;}}}
export function fireRound(gun){if(gun.reload>0||gun.cooldown>0||gun.ammo<=0)return false;gun.ammo--;gun.cooldown=SHOT_INTERVAL;return true;}
