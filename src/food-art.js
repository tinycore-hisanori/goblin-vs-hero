import * as THREE from 'three';
import {foodItems} from './food.js';

// Small, readable props shared by both cameras; no external art downloads.
export function buildFood(scene){
 const groups=new Map();
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.8});
 const red=mat('#d64b36'),green=mat('#7fa64c'),crust=mat('#c78d43'),lattice=mat('#efd08a'),rice=mat('#f1e4bf'),bowl=mat('#344f50'),wood=mat('#654329');
 function mesh(group,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
 for(const food of foodItems){
  const group=new THREE.Group();group.position.set(food.x,food.y,food.z);scene.add(group);groups.set(food.id,group);
  if(food.kind==='apple'){
   const apple=mesh(group,new THREE.SphereGeometry(.17,10,8),red,0,.14,0);apple.scale.y=.9;
   mesh(group,new THREE.CylinderGeometry(.018,.022,.12,5),wood,0,.32,0);
   const leaf=mesh(group,new THREE.SphereGeometry(.07,6,4),green,.06,.33,0);leaf.scale.set(1,.22,.5);
  }else if(food.kind==='pie'){
   mesh(group,new THREE.CylinderGeometry(.21,.17,.12,12),crust,0,.07,0);
   mesh(group,new THREE.CylinderGeometry(.18,.18,.025,12),red,0,.135,0);
   for(const offset of [-.09,0,.09]){mesh(group,new THREE.BoxGeometry(.32,.025,.035),lattice,0,.155,offset);mesh(group,new THREE.BoxGeometry(.035,.025,.32),lattice,offset,.18,0);}
  }else{
   mesh(group,new THREE.CylinderGeometry(.19,.11,.18,12),bowl,0,.09,0);
   const mound=mesh(group,new THREE.SphereGeometry(.17,10,8),rice,0,.18,0);mound.scale.y=.55;
   for(const x of [-.04,.04]){const chopstick=mesh(group,new THREE.CylinderGeometry(.012,.012,.48,5),wood,x,.25,.04);chopstick.rotation.x=1.28;}
  }
 }
 return{update(taken=[]){const used=new Set(taken);for(const [id,g]of groups)g.visible=!used.has(id);}};
}
