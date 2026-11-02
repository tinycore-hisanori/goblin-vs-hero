import {foodTables,clearLine} from './dungeon.js';

export const FOOD_TYPES={
 apple:{name:'リンゴ',heroHeal:20,goblinHeal:2},
 pie:{name:'パイ',heroHeal:35,goblinHeal:4},
 rice:{name:'ご飯',heroHeal:25,goblinHeal:3}
};
export const FOOD_RANGE=1.9;
export const foodItems=foodTables.flatMap(table=>Object.keys(FOOD_TYPES).map((kind,i)=>({
 id:`${table.id}:${kind}`,kind,x:table.x+(i-1)*.48,y:.78,z:table.z,tableId:table.id,...FOOD_TYPES[kind]
})));
export function nearbyFood(position,taken=[]){
 const used=new Set(taken);
 return foodItems.filter(f=>!used.has(f.id)&&Math.hypot(position.x-f.x,position.z-f.z)<=FOOD_RANGE&&Math.abs((position.y||0)-f.y)<1.6&&clearLine(position,f))
  .sort((a,b)=>Math.hypot(position.x-a.x,position.z-a.z)-Math.hypot(position.x-b.x,position.z-b.z));
}
export class FoodSupply{
 constructor(){this.taken=new Set();}
 reset(){this.taken.clear();}
 snapshot(){return [...this.taken];}
 nearby(position){return nearbyFood(position,this.taken);}
 eat(position,hp,maxHp,role,id){
  if(hp<=0)return{ok:false,hp,reason:'倒れている間は食べられません'};
  if(hp>=maxHp)return{ok:false,hp,reason:'HPは満タンです'};
  const food=this.nearby(position).find(f=>!id||f.id===id);
  if(!food)return{ok:false,hp,reason:'食料に近づいてください（食べられた物はなくなります）'};
  this.taken.add(food.id);
  const recovered=Math.min(maxHp-hp,role==='hero'?food.heroHeal:food.goblinHeal);
  return{ok:true,hp:hp+recovered,recovered,food};
 }
}
