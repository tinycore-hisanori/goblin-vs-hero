import * as THREE from 'three';
import {loadPunch,retargetPunch} from './goblin-attack.js';
import {inPlaceClip} from './in-place-motion.js';

export function setupGoblinMotion(g,clips){
 // Restore the actual bind pose rather than freezing one frame of a run cycle.
 const skeletons=new Set();g.model.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);});
 for(const skeleton of skeletons)skeleton.pose();
 const bones=[];g.model.traverse(n=>{if(n.isBone)bones.push({bone:n,position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone()});});
 g.run.stop();g.run=g.mixer.clipAction(inPlaceClip(g.run.getClip()));
 const sourceWalk=clips.find(c=>/walking/i.test(c.name)),walkClip=sourceWalk?inPlaceClip(sourceWalk):null;
 g.motion={bones,walk:walkClip?g.mixer.clipAction(walkClip):g.run,current:null,age:0,phase:0,idleYaw:0,mode:null};
 g.run.stop();
 const motion=g.motion;motion.lastAttack=g.attackSeq||0;motion.attackTime=0;
 loadPunch().then(data=>{if(g.motion!==motion)return;motion.punch=g.mixer.clipAction(retargetPunch(g.model,data));}).catch(e=>console.warn('攻撃モーション読み込み失敗',e));
}
export function resetGoblinMotion(g){
 const m=g.motion;g.mixer.stopAllAction();m.current=null;m.age=0;m.mode=null;m.attackTime=0;m.lastAttack=g.attackSeq||0;g.model.position.y=0;g.model.rotation.z=0;
 for(const b of m.bones){b.bone.position.copy(b.position);b.bone.quaternion.copy(b.quaternion);b.bone.scale.copy(b.scale);}
}
export function updateGoblinMotion(g,dt,moving,mode){
 const m=g.motion;m.age+=dt;
 if(mode==='stunned'||g.hp<=0)m.attackTime=0;
 if((g.attackSeq||0)!==m.lastAttack){m.lastAttack=g.attackSeq||0;if(m.punch&&mode!=='stunned'&&g.hp!==0){g.mixer.stopAllAction();m.current=null;m.punch.reset().setLoop(THREE.LoopOnce,1).setEffectiveTimeScale(m.punch.getClip().duration/.7).setEffectiveWeight(1).play();m.attackTime=.7;}}
 if(m.attackTime>0){m.attackTime=Math.max(0,m.attackTime-dt);g.mixer.update(dt);if(!m.attackTime)m.punch.stop();return;}
 if(m.mode!==mode){m.mode=mode;m.phase=0;m.idleYaw=g.root.rotation.y;}m.phase+=dt;
 const action=moving?(mode==='chase'?g.run:m.walk):null;
 if(action){if(m.current!==action){m.current?.fadeOut(.15);action.reset().setLoop(THREE.LoopRepeat,Infinity).setEffectiveTimeScale(mode==='chase'?1:.8).setEffectiveWeight(1).fadeIn(.15).play();m.current=action;}action.paused=false;g.model.position.y=0;g.mixer.update(dt);return;}
 if(m.current){g.mixer.stopAllAction();m.current=null;}
 for(const b of m.bones){b.bone.position.copy(b.position);b.bone.quaternion.copy(b.quaternion);b.bone.scale.copy(b.scale);}
 const t=m.age,head=m.bones.find(b=>b.bone.name==='mixamorig:Head'),chest=m.bones.find(b=>b.bone.name==='mixamorig:Spine2');
 if(head){head.bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(t*1.1)*.05,Math.sin(t*.85)*.25,Math.sin(t*.7)*.025)));}
 if(chest)chest.bone.scale.y=chest.scale.y*(1+Math.sin(t*2.2)*.012);
 g.model.position.y=Math.sin(t*2.2)*.006;
 if(mode==='idle')g.root.rotation.y=m.idleYaw+Math.sin(m.phase*.75)*.55;
}
