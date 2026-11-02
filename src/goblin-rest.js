import {bedAt, BED_HEIGHT} from './dungeon.js';

export const BED_HEAL_RATE = .5;
export const BED_SETTLE_SECONDS = 1;
export const BED_COMBAT_DELAY = 3;

// Runs on the hero's authoritative simulation; guests only display the result.
export function updateBedRest(g, dt, maxHp, ended = false) {
 const state = g.bedRest ??= {lastHp:g.hp, attackSeq:g.attackSeq||0, bedId:null, settle:0, combat:0};
 const fighting = g.hp < state.lastHp - 1e-8 || (g.attackSeq||0) !== state.attackSeq || g.stun > 0;
 if (fighting) state.combat = BED_COMBAT_DELAY;
 const bed = g.hp > 0 && !ended && !g.climb && (!g.jump || g.jump.grounded) ? bedAt(g.root.position) : null;
 if (bed?.id !== state.bedId) state.settle = BED_SETTLE_SECONDS;
 state.bedId = bed?.id ?? null;
 state.onBed = !!bed;
 // Only the time after both delays has elapsed contributes to healing.
 const blocked = Math.max(state.combat, state.settle);
 const healingTime = fighting ? 0 : Math.max(0, dt - blocked);
 state.combat = Math.max(0, state.combat - (fighting ? 0 : dt));
 state.settle = bed ? Math.max(0, state.settle - dt) : BED_SETTLE_SECONDS;
 state.delay = Math.max(state.combat, state.settle);
 state.healing = !!bed && !fighting && state.delay <= 0 && g.hp < maxHp;
 if (bed && healingTime > 0 && g.hp < maxHp) g.hp = Math.min(maxHp, g.hp + healingTime * BED_HEAL_RATE);
 if (g.hp >= maxHp) state.healing = false;
 if (g.hp > 0 && !g.climb && !g.jump && !ended) g.root.position.y = bed ? BED_HEIGHT : 0;
 state.lastHp = g.hp;
 state.attackSeq = g.attackSeq || 0;
 return state;
}
