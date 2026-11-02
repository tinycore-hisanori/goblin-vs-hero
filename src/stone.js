export const STONE_CD=5,STONE_SPEED=7,STONE_RANGE=9;
export function stoneDirection(from,to,yaw=0){const dx=to?to.x-from.x:Math.sin(yaw),dz=to?to.z-from.z:Math.cos(yaw),n=Math.hypot(dx,dz);return n>.001?{x:dx/n,z:dz/n}:{x:Math.sin(yaw),z:Math.cos(yaw)};}
export function segmentDistance(a,b,p){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);}
