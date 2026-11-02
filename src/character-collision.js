// Upright cylinders intersect only while their vertical ranges overlap.
export const verticalOverlap=(a,b)=>(a.position.y||0)<(b.position.y||0)+b.height-.02&&(b.position.y||0)<(a.position.y||0)+a.height-.02;
export function canStand(body,x,z,bodies){return body.valid(x,z)&&bodies.every(other=>other.id===body.id||!verticalOverlap(body,other)||Math.hypot(x-other.position.x,z-other.position.z)>=body.radius+other.radius-.00001);}
export function moveBody(body,dx,dz,bodies){
 const p=body.position,start={x:p.x,z:p.z},steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 function allowed(x,z){if(!body.valid(x,z))return false;return bodies.every(other=>{
  if(other.id===body.id||!verticalOverlap(body,other))return true;
  const d=Math.hypot(x-other.position.x,z-other.position.z),old=Math.hypot(p.x-other.position.x,p.z-other.position.z);
  return d>=body.radius+other.radius-.00001||d>old+.000001;
 });}
 for(let i=0;i<steps;i++){if(allowed(p.x+dx/steps,p.z))p.x+=dx/steps;if(allowed(p.x,p.z+dz/steps))p.z+=dz/steps;}
 return Math.hypot(p.x-start.x,p.z-start.z);
}
function terrainMove(body,dx,dz){const p=body.position,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.06));for(let i=0;i<steps;i++){if(body.valid(p.x+dx/steps,p.z))p.x+=dx/steps;if(body.valid(p.x,p.z+dz/steps))p.z+=dz/steps;}}
export function separateBodies(bodies){
 for(let pass=0;pass<16;pass++){let touching=false;
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j];if(!verticalOverlap(a,b))continue;
   let dx=b.position.x-a.position.x,dz=b.position.z-a.position.z,d=Math.hypot(dx,dz),overlap=a.radius+b.radius-d;
   if(overlap<.0001)continue;touching=true;if(d<.00001){const angle=(i*2.4+j)*2.399;dx=Math.cos(angle);dz=Math.sin(angle);d=1;}
   const step=Math.min(.12,(overlap+.0001)/2),nx=dx/d,nz=dz/d;
   terrainMove(a,-nx*step,-nz*step);terrainMove(b,nx*step,nz*step);
  }if(!touching)break;
 }
}
export function placeBody(body,desired,bodies,reachable=()=>true){
 const p=body.position;if(canStand(body,desired.x,desired.z,bodies)){p.x=desired.x;p.z=desired.z;return true;}
 for(let radius=.55;radius<=4.4;radius+=.55)for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=desired.x+Math.cos(angle)*radius,z=desired.z+Math.sin(angle)*radius;if(canStand(body,x,z,bodies)&&reachable({x,z})){p.x=x;p.z=z;return true;}}
 return false;
}
