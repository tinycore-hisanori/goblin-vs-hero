const copy=p=>({x:p.x,z:p.z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createBrain(home,patrol){const patrolPoints=(Array.isArray(patrol)?patrol:[patrol]).map(copy);return{home:copy(home),patrol:copy(patrolPoints[0]||home),patrolPoints,patrolIndex:-1,mode:'idle',timer:1.4+(Math.abs(home.x+home.z)%7)*.16,awareness:0,memory:0,target:copy(home),heard:0};}
export function alertBrain(brain,source){brain.mode='chase';brain.target=copy(source);brain.memory=5;brain.awareness=1;}
export function updateBrain(brain,{position,yaw,hero,sneaking,dt,visible,noise,hearingDistance,arrived}){
 const atTarget=()=>distance(position,brain.target)<.25;
 const d=distance(position,hero),dx=hero.x-position.x,dz=hero.z-position.z;
 const facing=d<.001?1:(Math.sin(yaw)*dx+Math.cos(yaw)*dz)/d;
 const sees=visible&&d<(sneaking?4.5:7.5)&&(facing>.42||d<(sneaking?.85:1.4));
 brain.timer-=dt;
 if(sees){brain.awareness=Math.min(1,brain.awareness+dt*(sneaking?.65:1.8));if(brain.awareness>=1){alertBrain(brain,hero);}else if(brain.mode!=='chase'){brain.mode='suspicious';brain.target=copy(hero);brain.timer=2;}}
 else brain.awareness=Math.max(0,brain.awareness-dt*.45);
 if(noise&&noise.id!==brain.heard){brain.heard=noise.id;if(hearingDistance<=noise.radius&&brain.mode!=='chase'){brain.mode='investigate';brain.target=copy(noise.position);brain.timer=7;}}
 if(brain.mode==='chase'&&!sees){brain.memory-=dt;if(brain.memory<=0){brain.mode='search';brain.timer=4;}}
 if((brain.mode==='investigate'||brain.mode==='suspicious')&&(atTarget()||brain.timer<=0)&&!sees){brain.mode='search';brain.timer=3;}
 if(brain.mode==='search'&&brain.timer<=0){brain.mode='return';brain.target=copy(brain.home);}
 if(brain.mode==='return'&&atTarget()){brain.mode='idle';brain.timer=2;}
 if(brain.mode==='idle'&&brain.timer<=0){brain.mode='patrol';const points=[...brain.patrolPoints,brain.home];for(let n=0;n<points.length;n++){brain.patrolIndex=(brain.patrolIndex+1)%points.length;if(distance(position,points[brain.patrolIndex])>.3){brain.target=copy(points[brain.patrolIndex]);break;}}}
 if(brain.mode==='patrol'&&atTarget()){brain.mode='idle';brain.timer=2.5;}
 return{sees,moving:['chase','investigate','return','patrol'].includes(brain.mode),speed:brain.mode==='chase'?1.35:.75,canAttack:brain.mode==='chase'&&sees};
}
