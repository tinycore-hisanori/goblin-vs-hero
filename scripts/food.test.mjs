import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FoodSupply,foodItems,nearbyFood} from '../src/food.js';
import {LocalSession} from '../src/local-session.js';
import {foodTables,tiles,valid,world,path,regenerateDungeon,entrance,cell} from '../src/dungeon.js';

function approach(table){return [[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dz])=>({x:table.x+dx*1.35,z:table.z+dz*1.35})).find(p=>valid(p.x,p.z,.3)&&nearbyFood(p).some(f=>f.tableId===table.id));}
test('three food rooms remain accessible after layout generation, with apples, pies and rice',()=>{
 for(const seed of [.1,.8]){regenerateDungeon(()=>seed);for(const table of foodTables){const p=approach(table);assert(p);const c=cell(p.x,p.z);assert(path(entrance,world(c.x,c.z)).length);assert.equal(foodItems.filter(f=>f.tableId===table.id).length,3);}}
 assert.equal(foodTables.length,3);
});
test('hero and goblins share finite food; healing caps, full health does not waste food, reset restores it',()=>{
 const supply=new FoodSupply(),p=approach(foodTables[0]),food=supply.nearby(p)[0];
 const full=supply.eat(p,150,150,'hero',food.id);assert(!full.ok);assert.equal(supply.snapshot().length,0);
 const hero=supply.eat(p,145,150,'hero',food.id);assert(hero.ok);assert.equal(hero.hp,150);assert.equal(hero.recovered,5);
 const goblin=supply.eat(p,1,6,'goblin',food.id);assert(!goblin.ok);assert.equal(goblin.hp,1);
 const next=supply.nearby(p)[0],eat=supply.eat(p,1,6,'goblin',next.id);assert(eat.ok);assert.equal(eat.hp,1+next.goblinHeal);
 assert(!nearbyFood(p,supply.snapshot()).some(f=>f.id===food.id));supply.reset();assert(supply.nearby(p).some(f=>f.id===food.id));
});
test('remote, through-wall, dead and unknown-food requests cannot consume food',()=>{
 const supply=new FoodSupply(),food=foodItems[0];assert(!supply.eat({x:100,z:100},1,6,'goblin',food.id).ok);
 const p=approach(foodTables[0]);assert(!supply.eat(p,0,6,'goblin',food.id).ok);assert(!supply.eat(p,1,6,'goblin','forged').ok);
 const c=cell(p.x,p.z),old=tiles[c.z][c.x];try{tiles[c.z][c.x]='#';assert(!supply.eat(p,1,6,'goblin',food.id).ok);}finally{tiles[c.z][c.x]=old;}
 assert.equal(supply.snapshot().length,0);
});
test('guest eat command uses host position and HP, synchronizes consumption, and stops at round end',()=>{
 const p=approach(foodTables[0]),g={id:'g',root:{position:new THREE.Vector3(p.x,0,p.z),rotation:{y:0}},spawn:p,hp:1};let ended=false;const messages=[];
 const s=new LocalSession({ready:()=>true,ended:()=>ended,goblins:()=>[g],hero:()=>entrance,spawn:()=>g,appearance:()=>{},tag:()=>{}});s.send=m=>messages.push(m);
 try{s.active=true;s.receive({type:'join',id:'P'});const food=s.food.nearby(p)[0];s.receive({type:'command',id:'P',command:{type:'eat',foodId:food.id,hp:999}});assert.equal(g.hp,1+food.goblinHeal);
 assert(messages.filter(m=>m.type==='snapshot').at(-1).foodTaken.includes(food.id));const before=g.hp;ended=true;s.elapsed+=1;s.receive({type:'command',id:'P',command:{type:'eat'}});assert.equal(g.hp,before);s.reset();assert.equal(s.food.snapshot().length,0);
 }finally{s.channel.close();}
});
