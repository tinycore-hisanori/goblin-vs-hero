import {EVOLUTIONS} from './progression.js';
export const RESPAWN_SECONDS=10,CHILD_SECONDS=20;
export const CHILD_TIER={...EVOLUTIONS[0],name:'子ゴブリン',model:'/models/child-goblin.glb',hp:3,damage:.5,height:.5};
export const isChild=member=>(member?.round?.childRemaining||0)>0;
export const goblinTier=member=>isChild(member)?CHILD_TIER:EVOLUTIONS[member.round.stage];
export const canHunt=(attacker,victim)=>!isChild(attacker)&&!isChild(victim?.viewer);
export function beginRebirth(member){const r=member.round;r.rebirthStage=isChild(member)?r.rebirthStage:Math.max(0,r.stage-1);r.childRemaining=0;r.trainingProgress=0;r.trainingRest=0;member.command={type:'idle'};}
export function hatch(member){const r=member.round;r.stage=0;r.xp=0;r.childRemaining=CHILD_SECONDS;member.g.hp=CHILD_TIER.hp;member.command={type:'idle'};}
export function grow(member,dt){const r=member.round;if(!isChild(member))return false;r.childRemaining=Math.max(0,r.childRemaining-dt);if(r.childRemaining>0)return false;r.stage=r.rebirthStage||0;r.xp=EVOLUTIONS[r.stage].xp;member.g.hp=EVOLUTIONS[r.stage].hp;r.trainingProgress=0;r.trainingRest=0;member.command={type:'idle'};return true;}
