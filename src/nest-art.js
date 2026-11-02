import {buildFood} from './food-art.js';
import * as THREE from 'three';
import {rooms,furniture,world,CELL,leverPosition} from './dungeon.js';
export function buildNest(scene,box,material){
 const wood=material('#715034'),darkWood=material('#3f2c22'),iron=material('#5e6861'),straw=material('#a58b44'),cloth=material('#4a623a'),bone=material('#b8b09b'),gold=material('#d5ad48');
 function cylinder(radius,height,x,y,z,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius*.88,radius,height,9),mat);m.position.set(x,y,z);scene.add(m);return m;}
 function sphere(radius,x,y,z,mat){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(radius,1),mat);m.position.set(x,y,z);scene.add(m);return m;}
 function sign(text,x,z,y=2.35,scale=1){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#493721';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#a48b54';ctx.lineWidth=8;ctx.strokeRect(6,6,500,116);ctx.fillStyle='#eedca9';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,82);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.43),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.scale.setScalar(scale);scene.add(mesh);}
 for(const r of rooms){const center=world((r.x1+r.x2)/2,(r.z1+r.z2)/2),width=(r.x2-r.x1+1)*CELL,depth=(r.z2-r.z1+1)*CELL;box(width,.025,depth,center.x,.015,center.z,material(r.color));const lamp=new THREE.PointLight(r.id==='treasury'?0xffdc8a:0xffad65,r.id==='entrance'?12:8,15,1.5);lamp.position.set(center.x,2.8,center.z);scene.add(lamp);const entry=world((r.x1+r.x2)/2,r.z2);for(const side of [-1,1]){box(.23,3.1,.25,entry.x+side*1.4,1.55,entry.z+.9,wood);box(.1,.1,.3,entry.x+side*1.4,2.55,entry.z+1,iron);}box(3.05,.25,.3,entry.x,3.05,entry.z+.9,wood);sign(r.name,entry.x,entry.z+.72);}
 for(const p of furniture){const {x,z}=world(p.x,p.z);
  if(p.type==='dummy'){box(.15,1.4,.15,x,.7,z,wood);box(1,.14,.14,x,1.1,z,wood);cylinder(.29,.65,x,.93,z,straw);sphere(.21,x,1.5,z,straw);box(.7,.12,.7,x,.06,z,darkWood);for(let i=0;i<3;i++)box(.62,.04,.04,x,.7+i*.2,z+.27,cloth);}
  if(p.type==='weights'){box(1.45,.12,.55,x,.12,z,wood);box(1.3,.06,.06,x,.42,z,iron);for(const sign of [-1,1]){const weight=cylinder(.24,.19,x+sign*.48,.42,z,iron);weight.rotation.z=Math.PI/2;}}
  if(p.type==='punchbag'){for(const sign of [-1,1])box(.12,2.3,.15,x+sign*.6,1.15,z,wood);box(1.45,.14,.18,x,2.3,z,wood);box(.04,.45,.04,x,2.02,z,iron);cylinder(.28,.85,x,1.39,z,material('#86704b'));for(const y of [1.05,1.7])cylinder(.3,.06,x,y,z,darkWood);}
  if(p.type==='trainingBench'){box(1.4,.15,.6,x,.5,z,wood);for(const sign of [-1,1])box(.13,.5,.5,x+sign*.52,.25,z,darkWood);sphere(.19,x-.4,.73,z,straw);}
  if(p.type==='barrel'){cylinder(.46,.95,x,.475,z,wood);for(const y of [.15,.78])cylinder(.48,.065,x,y,z,iron);}
  if(p.type==='shelf'){for(const y of [.25,.85,1.45])box(1.5,.12,.65,x,y,z,wood);for(const dx of [-.68,.68])box(.12,1.8,.65,x+dx,.9,z,darkWood);for(let i=0;i<4;i++)sphere(.14,x-.5+i*.32,1.02,z,straw);}
  if(p.type==='sack'){sphere(.48,x,.38,z,straw);cylinder(.16,.14,x,.8,z,darkWood);}
  if(p.type==='foodTable'){box(1.65,.14,1.1,x,.68,z,wood);for(const dx of [-.65,.65])box(.12,.6,.8,x+dx,.3,z,darkWood);sign('食料 / 食べて回復',x,z+.56,.48,.7);}
  if(p.type==='bed'){const healingMark=new THREE.MeshBasicMaterial({color:'#91dcb8'});box(.38,.09,.04,x,.86,z-.64,healingMark);box(.09,.38,.04,x,.86,z-.64,healingMark);box(1.5,.2,1.5,x,.2,z,wood);box(1.35,.17,1.35,x,.38,z,straw);box(.9,.08,1,x,.49,z+.2,cloth);box(.9,.18,.3,x,.52,z-.5,material('#8f9979'));}
  if(p.type==='bench'){box(1.6,.14,.8,x,.95,z,wood);for(const dx of [-.6,.6])box(.15,.9,.65,x+dx,.45,z,darkWood);box(.6,.1,.3,x,1.07,z,iron);cylinder(.12,.25,x+.5,1.15,z,iron);}
  if(p.type==='crate'){box(1.15,.9,1.1,x,.45,z,wood);for(const dx of [-.45,.45])box(.1,1,.1,x+dx,.5,z+.56,darkWood);}
  if(p.type==='fire'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.12,6,10),iron);ring.rotation.x=Math.PI/2;ring.position.set(x,.15,z);scene.add(ring);for(let i=0;i<3;i++){const log=box(.8,.12,.16,x,.2,z,darkWood);log.rotation.y=i*Math.PI/3;}const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,.65,6),new THREE.MeshBasicMaterial({color:'#ffc463'}));flame.position.set(x,.5,z);scene.add(flame);const light=new THREE.PointLight(0xff7f35,10,8);light.position.set(x,1,z);scene.add(light);}
  if(p.type==='bones'||p.type==='scrap'){for(let i=0;i<5;i++){const m=box(.55,.08,.1,x+(i%2)*.25-.2,.1+i*.045,z+(i%3)*.2-.2,p.type==='bones'?bone:iron);m.rotation.y=i*1.7;}sphere(.18,x+.4,.2,z+.2,bone);}
  if(p.type==='loot'){sphere(.35,x,.25,z,gold);box(.5,.3,.5,x+.3,.15,z+.4,wood);for(let i=0;i<3;i++)cylinder(.16,.045,x-.25+i*.16,.12+i*.04,z-.3,gold);}
 }
 const gym=world(5,21);box(3.4,.025,3.8,gym.x,.035,gym.z,material('#8c764a'));for(const side of [-1,1])box(.04,.008,3.7,gym.x+side*1.6,.054,gym.z,cloth);sign('鍛錬して、強くなれ',gym.x,gym.z-2.5);
 // Footprints and spilled food make the two wings visually distinct.
 for(let i=0;i<8;i++){const p=world(8+i*.5,14);const mark=box(.12,.009,.25,p.x,.04,p.z+(i%2?.22:-.22),darkWood);mark.rotation.y=.2;}
 const lp=leverPosition,leverBase=box(.65,.45,.65,lp.x,.225,lp.z,iron),lever=box(.09,.7,.09,lp.x,.75,lp.z,wood);lever.rotation.z=-.5;sphere(.12,lp.x+.16,1.08,lp.z,gold);sign('宝物庫の開閉レバー',lp.x,lp.z-.8);
 return {lever,leverBase,food:buildFood(scene)};
}
