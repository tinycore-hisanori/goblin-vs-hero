import {isSealed} from './burrows.js';
export const SIZE=25,CELL=2,HEIGHT=3.4,ORIGIN=(SIZE-1)/2;
export const tiles=Array.from({length:SIZE},()=>Array(SIZE).fill('#'));
export const rooms=[
 {id:'entrance',name:'巣の入口',x1:10,z1:21,x2:14,z2:23,color:'#6c6552'},
 {id:'guard',name:'見張りの焚き火',x1:10,z1:16,x2:14,z2:19,color:'#665442'},
 {id:'training',name:'ゴブリン鍛錬場',x1:3,z1:19,x2:7,z2:23,color:'#66533b'},
 {id:'pantry',name:'食料庫',x1:3,z1:12,x2:7,z2:16,color:'#666343'},
 {id:'sleep',name:'ゴブリンの寝床・食堂',x1:17,z1:12,x2:21,z2:16,color:'#4e5a4e'},
 {id:'workshop',name:'盗品工房・食堂',x1:3,z1:4,x2:7,z2:8,color:'#5e5250'},
 {id:'junction',name:'骨と罠の広間',x1:10,z1:8,x2:14,z2:11,color:'#565e5c'},
 {id:'treasury',name:'宝物庫',x1:17,z1:3,x2:21,z2:7,color:'#695937'}
];
function floor(x,z){tiles[z][x]='.';}
for(const r of rooms)for(let z=r.z1;z<=r.z2;z++)for(let x=r.x1;x<=r.x2;x++)floor(x,z);
function corridor(x1,z1,x2,z2){for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)floor(x,z1);for(let z=Math.min(z1,z2);z<=Math.max(z1,z2);z++)floor(x2,z);}
// Main approach, two lower wings, workshop circuit, treasury approach.
corridor(5,19,5,16);corridor(7,21,10,21);
corridor(12,21,12,19);corridor(12,16,12,14);corridor(7,14,17,14);
corridor(5,12,5,8);corridor(7,6,12,6);corridor(12,6,12,8);
corridor(14,9,19,9);corridor(19,9,19,7);corridor(19,12,19,9);
// A goblin-only shortcut linking the pantry wing and sleeping wing.
corridor(7,11,9,11);floor(7,12);tiles[11][10]='h';floor(10,12);floor(10,13);
// Concealed side entrance to the treasury, and a climb over the workshop wall.
corridor(14,5,15,5);corridor(14,5,14,7);tiles[5][16]='h';
floor(8,7);tiles[7][9]='c';floor(10,7);floor(9,8);
// Low tunnel bypass of the main approach; a second climb into the sleeping wing.
floor(14,20);tiles[20][13]='g';floor(13,21);floor(13,19);
floor(16,16);tiles[15][16]='c';floor(16,14);
// Normal low tunnel linking the two upper corridors.
floor(15,8);tiles[7][15]='g';floor(15,6);floor(15,5);
export const holes=[],secretHoles=[],climbs=[];
for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){if(['g','h'].includes(tiles[z][x]))holes.push([x,z]);if(tiles[z][x]==='h')secretHoles.push([x,z]);if(tiles[z][x]==='c')climbs.push([x,z]);}
export const furniture=[
 {type:'dummy',x:3,z:20},{type:'weights',x:7,z:20},{type:'punchbag',x:3,z:22},{type:'trainingBench',x:7,z:22},
 {type:'barrel',x:3,z:12},{type:'barrel',x:4,z:12},{type:'shelf',x:3,z:14},{type:'sack',x:7,z:16},
 {type:'foodTable',x:6,z:12},{type:'foodTable',x:7,z:8},{type:'foodTable',x:17,z:16},
 {type:'bed',x:17,z:12},{type:'bed',x:21,z:12},{type:'bed',x:18,z:16},{type:'bed',x:21,z:16},
 {type:'bench',x:3,z:4},{type:'bench',x:7,z:4},{type:'scrap',x:3,z:8},
 {type:'fire',x:10,z:17},{type:'crate',x:14,z:19},{type:'bones',x:10,z:8},
 {type:'bones',x:12,z:11},{type:'bones',x:14,z:10},
 {type:'loot',x:17,z:3},{type:'loot',x:21,z:3},{type:'crate',x:21,z:7}
];
for(const p of furniture)tiles[p.z][p.x]='p';
export let gateOpen=false;
export const gateCell={x:19,z:8},leverCell={x:5,z:5};tiles[gateCell.z][gateCell.x]='d';
export function openGate(){gateOpen=true;}
export function resetGate(){gateOpen=false;}
export const roomAt=(x,z)=>rooms.find(r=>x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2);
export const world=(x,z)=>({x:(x-ORIGIN)*CELL,z:(z-ORIGIN)*CELL});
export const foodTables=furniture.filter(p=>p.type==='foodTable').map(p=>({...world(p.x,p.z),id:`food-${p.x},${p.z}`}));
export const BED_HEIGHT=.53;
export const beds=furniture.filter(p=>p.type==='bed').map(p=>({...world(p.x,p.z),id:`${p.x},${p.z}`,cellX:p.x,cellZ:p.z}));
export const bedAt=p=>beds.find(b=>Math.abs(p.x-b.x)<=.7&&Math.abs(p.z-b.z)<=.7);
export const cell=(x,z)=>({x:Math.round(x/CELL+ORIGIN),z:Math.round(z/CELL+ORIGIN)});
export const passable=(x,z,goblin=false,allowSealed=false)=>{const tile=tiles[z]?.[x];if(tile==='.'||(tile==='d'&&gateOpen)||(goblin&&tile==='p'&&beds.some(b=>b.cellX===x&&b.cellZ===z)))return true;const abilities=typeof goblin==='object'?goblin:{burrows:goblin,climb:goblin};return ((tile==='c'&&abilities.climb)||(['g','h'].includes(tile)&&abilities.burrows))&&(allowSealed||!isSealed(x,z));};
export const obstacleHeight=(x,z)=>{const p=furniture.find(p=>p.x===x&&p.z===z);return p?.type==='foodTable'?.75:p?.type==='bed'?BED_HEIGHT:p&&['bones','scrap'].includes(p.type)?.3:Infinity;};
export function supportHeight(x,z,r=.3){let support=0;for(const dx of [-r,r])for(const dz of [-r,r]){const c=cell(x+dx,z+dz),h=obstacleHeight(c.x,c.z);if(Number.isFinite(h))support=Math.max(support,h);}return support;}
export function valid(x,z,r=.3,goblin=false,feetHeight=0){for(const dx of [-r,r])for(const dz of [-r,r]){const px=x+dx,pz=z+dz,c=cell(px,pz);if(!passable(c.x,c.z,goblin)&&!(tiles[c.z]?.[c.x]==='p'&&feetHeight+.001>=obstacleHeight(c.x,c.z)))return false;if(['g','h'].includes(tiles[c.z][c.x])){const center=world(c.x,c.z),horizontal=tiles[c.z][c.x-1]==='.'&&tiles[c.z][c.x+1]==='.';if(Math.abs(horizontal?pz-center.z:px-center.x)>.525)return false;}}return true;}
export function path(from,to,goblin=false,allowSealed=false){const start=cell(from.x,from.z),end=cell(to.x,to.z),queue=[start],seen=new Set([`${start.x},${start.z}`]);for(let i=0;i<queue.length;i++){const c=queue[i];if(c.x===end.x&&c.z===end.z){const out=[];let n=c;while(n.parent){out.unshift(world(n.x,n.z));n=n.parent;}return out;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,z=c.z+dz,k=`${x},${z}`;if(!seen.has(k)&&passable(x,z,goblin,allowSealed)){seen.add(k);queue.push({x,z,parent:c});}}}return [];}
export function clearLine(a,b,goblin=false){const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!valid(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.04,goblin,1))return false;}return true;}

export const entrance=world(12,23);
export const treasureCell={x:19,z:4};
export const treasurePosition=world(treasureCell.x,treasureCell.z);
export const leverPosition=world(leverCell.x,leverCell.z);
export const gatePosition=world(gateCell.x,gateCell.z);
export const goblinSpawns=[[12,17],[6,15],[18,15],[20,13],[6,7],[11,9],[20,6],[18,4]];

export const trainingStations=[{id:'dummy',name:'木人打ち',x:3,z:20,approach:{x:4,z:20}},{id:'weights',name:'重り上げ',x:7,z:20,approach:{x:6,z:20}},{id:'punchbag',name:'打ち込み袋',x:3,z:22,approach:{x:4,z:22}}];

// Keep room landmarks, but reroute the passages on every expedition.
const authoredTiles=tiles.map(row=>[...row]);
export let layoutVersion=0;
export function regenerateDungeon(random=Math.random){
 for(let z=0;z<SIZE;z++)tiles[z].splice(0,SIZE,...authoredTiles[z]);
 const carve=(x,z)=>{if(x>0&&z>0&&x<SIZE-1&&z<SIZE-1&&tiles[z][x]==='#')floor(x,z);};
 const line=(a,b)=>{let [x,z]=a;carve(x,z);while(x!==b[0]){x+=Math.sign(b[0]-x);carve(x,z);}while(z!==b[1]){z+=Math.sign(b[1]-z);carve(x,z);}};
 const routes=[{old:[[5,9],[5,10],[5,11]],choices:[[[5,8],[1,8],[1,12],[5,12]],[[5,8],[2,8],[2,11],[5,11],[5,12]]]},
 {old:[[8,6],[9,6],[10,6],[11,6],[12,6]],choices:[[[5,4],[5,2],[12,2],[12,8]],[[7,6],[8,6],[8,3],[12,3],[12,8]]]},
 {old:[[8,14],[9,14],[10,14],[11,14],[12,14],[13,14],[14,14],[15,14],[16,14]],choices:[[[7,14],[8,14],[8,18],[12,18],[12,16]],[[7,16],[8,16],[8,18],[12,18]]]}];
 for(const route of routes){for(const [x,z] of route.old)if(!roomAt(x,z)&&tiles[z][x]==='.')tiles[z][x]='#';const points=route.choices[Math.floor(random()*route.choices.length)];for(let i=1;i<points.length;i++)line(points[i-1],points[i]);}
 // The sleeping wing has its own twisting access from the guard chamber.
 const bend=random()<.5?22:23;const east=[[14,18],[bend,18],[bend,14],[21,14]];for(let i=1;i<east.length;i++)line(east[i-1],east[i]);
 layoutVersion++;return tiles;
}
export function applyDungeonLayout(rows){if(!Array.isArray(rows)||rows.length!==SIZE||rows.some(r=>typeof r!=='string'||r.length!==SIZE))return;for(let z=0;z<SIZE;z++)tiles[z].splice(0,SIZE,...rows[z]);}
