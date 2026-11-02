import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import './style.css';

const scene=new THREE.Scene(); scene.background=new THREE.Color('#162228');scene.fog=new THREE.Fog('#162228',23,52);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#game').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd2e3df,0x344133,2));const sun=new THREE.DirectionalLight(0xffd8a0,3);sun.position.set(5,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22});scene.add(sun);
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.9});const stone=mat('#465453'),wallMat=mat('#303d40');
function box(w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
box(32,.4,32,0,-.2,0,stone);
const grid=new THREE.GridHelper(32,16,0x6d7465,0x556160);grid.position.y=.015;scene.add(grid);
const walls=[];function wall(x,z,w,d){box(w,1.65,d,x,.825,z,wallMat);walls.push({x,z,w,d});}
wall(-16,0,.6,32);wall(16,0,.6,32);wall(0,16,32,.6);wall(-9,-16,14,.6);wall(9,-16,14,.6);
wall(-6,5,.7,13);wall(5,-4,.7,14);wall(-10,-5,10,.7);wall(10,7,11,.7);wall(-2,-10,6,.7);
for(const [x,z] of [[-14,-14],[14,-14],[-14,14],[14,14]]){box(.9,2.3,.9,x,1.15,z,wallMat);const light=new THREE.PointLight(0xffa64e,13,9);light.position.set(x,2.6,z);scene.add(light);box(.2,.35,.2,x,2.4,z,mat('#ffc06b'));}
const exit=box(3,.12,1.8,0,.06,-14.8,mat('#41bbad'));const beacon=new THREE.PointLight(0x4fffe2,12,9);beacon.position.set(0,2,-14.5);scene.add(beacon);
const loader=new GLTFLoader(),clock=new THREE.Clock(),held=new Set(),mouse=new THREE.Vector2(),ray=new THREE.Raycaster(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),aim=new THREE.Vector3();
const hpEl=document.querySelector('#hp'),keyEl=document.querySelector('#keys'),timeEl=document.querySelector('#clock'),notice=document.querySelector('#notice');
let hero,goblins=[],keys=[],ready=false,ended=false,hp=100,collected=0,remaining=300,attackTime=0,attackCooldown=0,invulnerable=0,hitDone=false,flash=0;
const mixers=[];
function actor(asset,height){const root=new THREE.Group(),model=clone(asset.scene);const bounds=new THREE.Box3().setFromObject(model);model.scale.setScalar(height/(bounds.max.y-bounds.min.y));root.add(model);scene.add(root);const mixer=new THREE.AnimationMixer(model);mixers.push(mixer);const actions={};for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);return {root,model,mixer,actions,current:null};}
function play(a,name,once=false){const next=a.actions[name];if(!next||a.current===next)return;a.current?.fadeOut(.13);next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.fadeIn(.13).play();a.current=next;}
function valid(x,z,r=.4){return Math.abs(x)<15.3&&Math.abs(z)<15.3&&!walls.some(w=>Math.abs(x-w.x)<w.w/2+r&&Math.abs(z-w.z)<w.d/2+r);}
function move(a,x,z,dt,speed){const p=a.root.position;if(valid(p.x+x*dt*speed,p.z))p.x+=x*dt*speed;if(valid(p.x,p.z+z*dt*speed))p.z+=z*dt*speed;}
function start(){hp=100;collected=0;remaining=300;ended=false;attackTime=attackCooldown=invulnerable=0;hero.root.position.set(0,0,12);hero.root.rotation.y=Math.PI;for(const g of goblins){g.root.position.set(g.spawn[0],0,g.spawn[1]);g.hp=3;g.root.visible=true;g.cooldown=0;g.respawn=0;g.current?.stop();g.current=null;}for(const k of keys)scene.remove(k);keys=[[-12,-11],[12,-9],[11,12]].map(([x,z])=>{const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.42),mat('#ffd273'));mesh.position.set(x,.8,z);scene.add(mesh);return mesh;});notice.textContent='鍵を3つ集めて脱出。ゴブリンの正面突破には気をつけよう！';}
function finish(win){ended=true;notice.textContent=win?'脱出成功！ ゴブリンたちを出し抜いた！':'脱出失敗… ゴブリンたちの勝利！';}
function attack(){if(!ready||ended||attackCooldown>0)return;attackTime=.75;attackCooldown=.85;hitDone=false;play(hero,'Double_Combo_Attack',true);hero.current?.setEffectiveTimeScale(2.833/.75);}
addEventListener('keydown',e=>{held.add(e.code);if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Space')attack();});addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>held.clear());
renderer.domElement.addEventListener('pointerdown',attack);addEventListener('pointermove',e=>{mouse.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);});document.querySelector('#restart').onclick=()=>{if(ready)start();};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
try{const [h,g]=await Promise.all([loader.loadAsync('/models/hero.glb'),loader.loadAsync('/models/ai-goblin.glb')]);hero=actor(h,1.7);for(const spawn of [[-11,8],[11,0],[-10,-12],[10,-12],[1,-6],[11,12],[-12,0],[8,10]])goblins.push({...actor(g,1.05),spawn,hp:3,cooldown:0,respawn:0});ready=true;start();}catch(e){notice.textContent='モデルの読み込みに失敗しました。再読み込みしてください。';console.error(e);}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);for(const m of mixers)m.update(dt);if(!ready)return;
const p=hero.root.position;camera.position.lerp(new THREE.Vector3(p.x*.45,21,p.z*.45+19),.08);camera.lookAt(p.x*.6,0,p.z*.6-1);
if(!ended){remaining-=dt;attackCooldown-=dt;invulnerable-=dt;attackTime-=dt;flash-=dt;
ray.setFromCamera(mouse,camera);if(ray.ray.intersectPlane(ground,aim)&&attackTime<=0)hero.root.rotation.y=Math.atan2(aim.x-p.x,aim.z-p.z);
let x=Number(held.has('KeyD'))-Number(held.has('KeyA')),z=Number(held.has('KeyS'))-Number(held.has('KeyW'));const len=Math.hypot(x,z);if(len){x/=len;z/=len;if(attackTime<=0)move(hero,x,z,dt,held.has('ShiftLeft')?5:3.2);}
if(attackTime<=0){if(len){play(hero,held.has('ShiftLeft')?'Running':'Walking');hero.current?.setEffectiveTimeScale(1);hero.current?.setEffectiveWeight(1);}else{hero.current?.stop();hero.current=null;hero.mixer.setTime(0);}}
if(attackTime>0&&attackTime<.52&&!hitDone){hitDone=true;for(const g of goblins){if(g.hp<=0)continue;const diff=g.root.position.clone().sub(p),dist=diff.length(),dir=new THREE.Vector3(Math.sin(hero.root.rotation.y),0,Math.cos(hero.root.rotation.y));if(dist<2&&diff.normalize().dot(dir)>.15){g.hp-=1;move(g,diff.x,diff.z,.15,4);if(g.hp<=0){g.root.visible=false;g.respawn=7;}}}}
for(const g of goblins){if(g.hp<=0){g.respawn-=dt;if(g.respawn<=0){g.hp=3;g.root.position.set(...[g.spawn[0],0,g.spawn[1]]);g.root.visible=true;}continue;}g.cooldown-=dt;const diff=p.clone().sub(g.root.position),dist=diff.length();if(dist<8&&dist>1){diff.normalize();move(g,diff.x,diff.z,dt,1.7);g.root.rotation.y=Math.atan2(diff.x,diff.z);play(g,'Running');}else if(dist<=1.2){g.current?.stop();g.current=null;if(g.cooldown<=0&&invulnerable<=0){hp=Math.max(0,hp-8);g.cooldown=1.2;invulnerable=.5;flash=.15;}}else{g.current?.stop();g.current=null;}}
for(const k of keys){if(!k.visible)continue;k.rotation.y+=dt*2;k.position.y=.85+Math.sin(remaining*3)*.1;if(k.position.distanceTo(p)<1.3){k.visible=false;collected++;notice.textContent=collected===3?'鍵が揃った！ 北の光る出口へ！':`鍵を入手！ あと${3-collected}個`;}}
hero.model.visible=invulnerable<=0||Math.floor(invulnerable*20)%2===0;
if(collected===3&&Math.abs(p.x)<1.7&&p.z<-13.7)finish(true);else if(hp<=0||remaining<=0)finish(false);
}hero.model.visible=ended?true:hero.model.visible;hpEl.textContent=`HP ${hp}`;keyEl.textContent=`鍵 ${collected} / 3`;timeEl.textContent=`${Math.floor(Math.max(0,remaining)/60)}:${String(Math.floor(Math.max(0,remaining)%60)).padStart(2,'0')}`;exit.material.emissive.set(collected===3?'#185d50':'#000000');renderer.render(scene,camera);}
frame();
