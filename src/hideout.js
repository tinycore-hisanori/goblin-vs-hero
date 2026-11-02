export function createHideout(canvas,{id,send}){
 const ctx=canvas.getContext('2d'),actors=new Map();let state=null,last=0,keys=new Set(),lastInput=0;
 const colors=['#a7d66a','#e9ba68','#8eced1','#ca9ad6','#e29387','#9aaae3'];
 function update(data){state=data;for(const [i,m]of data.members.entries()){let a=actors.get(m.id);if(!a){a={x:m.x,y:m.y};actors.set(m.id,a);}Object.assign(a,{targetX:m.x,targetY:m.y,name:m.name,color:colors[i%6],online:m.online});}for(const key of actors.keys())if(!data.members.some(m=>m.id===key))actors.delete(key);}
 function destination(x,y){if(state?.phase==='waiting')send({type:'walk',x,y});}
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();const r=canvas.getBoundingClientRect();destination((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
 const controls={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
 canvas.addEventListener('keydown',e=>{if(controls[e.code]){e.preventDefault();keys.add(e.code);}});addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('blur',()=>keys.clear());
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function text(t,x,y,color,size=12){ctx.fillStyle=color;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(t,x,y);}
 function frame(t){requestAnimationFrame(frame);if(document.hidden||!state||state.phase!=='waiting'||canvas.getBoundingClientRect().width<1)return;const dt=Math.min(.1,(t-last)/1000||.016);last=t;const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height;
 ctx.fillStyle='#111e26';ctx.fillRect(0,0,w,h);const glow=ctx.createRadialGradient(w*.52,h*.53,5,w*.52,h*.53,w*.65);glow.addColorStop(0,'#51604d');glow.addColorStop(1,'#172a30');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 // Layered cave ceiling and warm floor, with a tiny exit portal.
 ctx.fillStyle='#0d1921';ctx.beginPath();ctx.moveTo(0,0);for(let x=0;x<=w+30;x+=30)ctx.lineTo(x,h*(.16+.045*Math.sin(x*.036)));ctx.lineTo(w,0);ctx.fill();ellipse(w*.5,h*.67,w*.43,h*.25,'#39483f');ellipse(w*.5,h*.68,w*.38,h*.19,'#414e42');
 for(let i=0;i<24;i++){const x=((i*73.3)%w),y=h*(.35+((i*17)%43)/100);ellipse(x,y,2.5,1,'#61705a55');}
 ctx.fillStyle='#53616a';ctx.fillRect(w*.77,h*.15,w*.12,h*.23);ctx.fillStyle='#071721';ctx.fillRect(w*.79,h*.16,w*.08,h*.22);ellipse(w*.83,h*.26,w*.035,h*.1,'#a4e2dc33');text('DUNGEON',w*.83,h*.13,'#9bb6ba',9);
 for(const [x,y]of [[.14,.37],[.88,.58],[.22,.78]]){ctx.fillStyle='#7e7155';ctx.fillRect(w*x-3,h*y,6,13);ellipse(w*x,h*y,13,6,'#ca8b65');ellipse(w*x-4,h*y-1,2,1,'#f3dbaf');}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipse(w*.52+Math.cos(a)*23,h*.59+Math.sin(a)*9,7,4,'#77775f');}ellipse(w*.52,h*.58,15,6,'#f1aa4e44');ellipse(w*.52,h*.55,8+Math.sin(t*.011)*2,15,'#d97642');ellipse(w*.52,h*.55,4,10,'#ffe6a1');
 for(let i=0;i<9;i++){ellipse((w*.2+i*51+t*.005)%w,h*(.27+.5*((i*3)%11)/11)+Math.sin(t*.001+i)*6,1.2,1.2,'#e6d88a99');}
 const own=actors.get(id);if(own&&keys.size&&t-lastInput>120){let dx=0,dy=0;for(const key of keys){dx+=controls[key][0];dy+=controls[key][1];}destination(own.targetX+dx*.07,own.targetY+dy*.07);lastInput=t;}
 for(const [key,a]of [...actors].sort((a,b)=>a[1].y-b[1].y)){const moving=Math.hypot(a.targetX-a.x,a.targetY-a.y)>.003;a.x+=(a.targetX-a.x)*Math.min(1,dt*12);a.y+=(a.targetY-a.y)*Math.min(1,dt*12);const x=a.x*w,y=a.y*h,bob=moving?Math.sin(t*.017)*2:Math.sin(t*.002+key.length)*.7;ctx.globalAlpha=a.online===false?.4:1;ellipse(x,y+12,15,5,'#07131788');if(key===id){ctx.strokeStyle='#e8cd8c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+12,19,7,0,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#6a5441';ctx.fillRect(x-8,y-2+bob,16,16);ctx.fillStyle='#29362d';ctx.fillRect(x-9,y+9,7,6);ctx.fillRect(x+2,y+9,7,6);ctx.fillStyle=a.color;ctx.beginPath();ctx.moveTo(x-10,y-18+bob);ctx.lineTo(x-24,y-23+bob);ctx.lineTo(x-12,y-8+bob);ctx.fill();ctx.beginPath();ctx.moveTo(x+10,y-18+bob);ctx.lineTo(x+24,y-23+bob);ctx.lineTo(x+12,y-8+bob);ctx.fill();ellipse(x,y-13+bob,13,12,a.color);ellipse(x-5,y-14+bob,2,2,'#14242a');ellipse(x+5,y-14+bob,2,2,'#14242a');ctx.fillStyle='#d68d5b';ctx.fillRect(x-9,y-1+bob,18,4);text(a.name+(key===id?' · YOU':''),x,y+30,key===id?'#f6dfad':'#d5ded2',10);
 const msg=state.chat?.findLast(c=>c.member===key&&Date.now()-c.at<6500);if(msg){const str=msg.text.length>18?msg.text.slice(0,18)+'…':msg.text;ctx.font='11px system-ui';const width=ctx.measureText(str).width+20;ctx.fillStyle='#f1e7c9';ctx.beginPath();ctx.roundRect(x-width/2,y-61,width,25,8);ctx.fill();text(str,x,y-44,'#263731',11);}ctx.globalAlpha=1;
 }
 }requestAnimationFrame(frame);return{update};
}
