import * as THREE from 'three';
export const AI_RESPAWN_SECONDS=22;
export const DEFEAT_DURATION=2.8;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function defeatPose(age,height=1){const fall=smooth(age/.55),sink=smooth((age-1.1)/1.7);return{fall,tilt:fall*Math.PI/2,sink,drop:sink*(.28+height*.25),visible:age<DEFEAT_DURATION};}
export function clearDefeatPose(g){
 const base=g.defeatBase;if(base&&base.model===(g.model||g.placeholder)){base.model.position.y=base.y;base.model.rotation.x=base.rx;base.model.rotation.z=base.rz;}
 g.defeatBase=null;g.defeatAge=null;if(g.defeatMark)g.defeatMark.visible=false;
}
export function applyDefeatPose(g,age){
 const model=g.model||g.placeholder,pose=defeatPose(age,g.height||.8);g.root.visible=pose.visible;
 if(g.label)g.label.visible=false;if(g.alertIcon)g.alertIcon.visible=false;
 if(!model?.position||!model.rotation)return;
 if(g.defeatBase?.model!==model){g.mixer?.stopAllAction();g.defeatBase={model,y:model.position.y||0,rx:model.rotation.x||0,rz:model.rotation.z||0};}
 const base=g.defeatBase;model.rotation.x=base.rx+pose.tilt;model.rotation.z=base.rz*(1-pose.fall);model.position.y=base.y+.16*pose.fall-pose.drop-(g.root.position.y||0)*pose.fall;
 // Keep the earth ripple at floor level while the body sinks through it.
 if(!g.defeatMark&&g.root.add){const mark=new THREE.Group();for(const [geometry,color]of [[new THREE.CircleGeometry(.55,32),'#172119'],[new THREE.RingGeometry(.54,.61,32),'#a8a16d']]){const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mark.add(mesh);}g.root.add(mark);g.defeatMark=mark;}
 if(g.defeatMark){const mark=g.defeatMark;mark.visible=pose.visible;mark.position.set(0,.065-(g.root.position.y||0),(g.height||.8)*.4);mark.scale.setScalar(.6+pose.fall*.7+pose.sink*.45);for(const mesh of mark.children)mesh.material.opacity=Math.min(1,age*5)*(1-pose.sink)*.75;}
}
