export function cameraMovement(x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return{dx:x*c+z*s,dz:-x*s+z*c};}
export function followCamera(position,yaw,distance=4.2,height=5.4){return{x:position.x+Math.sin(yaw)*distance,y:(position.y||0)+height,z:position.z+Math.cos(yaw)*distance};}
