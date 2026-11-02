import * as THREE from 'three';
let shared;
export const loadPunch=()=>shared??=fetch('/models/goblin-punch.json').then(r=>{if(!r.ok)throw Error('Punch data unavailable');return r.json();}).catch(e=>{shared=null;throw e;});
// Transfer rotations relative to each skeleton's rest pose. Keep target lengths and root position.
export function retargetPunch(model,data){
 const tracks=[];
 for(const t of data.tracks){const bone=model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(t.bone));if(!bone?.isBone)continue;const offset=bone.quaternion.clone().multiply(new THREE.Quaternion().fromArray(t.rest).invert()),values=[];
 for(let i=0;i<t.values.length;i+=4)new THREE.Quaternion().fromArray(t.values,i).premultiply(offset).normalize().toArray(values,i);
 tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,t.times,values));}
 return new THREE.AnimationClip('Shared_Punch',data.duration,tracks);
}
export function markGoblinAttack(g){g.attackSeq=(g.attackSeq||0)+1;}
