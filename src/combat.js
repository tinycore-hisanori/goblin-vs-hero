import * as THREE from 'three';
// A short, thick aim ray intersects the goblin's vertical body capsule.
export function aimedHit(origin,direction,feet,reach=2.2){
 const ray=new THREE.Ray(origin,direction.clone().normalize());let nearest=null;
 for(const y of [.2,.4,.6]){const center=new THREE.Vector3(feet.x,feet.y+y,feet.z),point=ray.intersectSphere(new THREE.Sphere(center,.32),new THREE.Vector3());if(point&&point.distanceTo(origin)<=reach&&(!nearest||point.distanceToSquared(origin)<nearest.distanceToSquared(origin)))nearest=point;}
 return nearest;
}
