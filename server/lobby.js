import {WebSocketServer,WebSocket} from 'ws';
import {randomInt,randomBytes} from 'node:crypto';
export function attachLobby(server,{now=Date.now,graceMs=90000,onLeave=()=>{},onTwitchTicket=()=>null}={}){
 const wss=new WebSocketServer({noServer:true,maxPayload:4096}),rooms=new Map();
 const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
 const snapshot=r=>({type:'lobby',code:r.code,kind:r.kind,rosterLocked:!!r.rosterLocked,heroMode:r.heroMode,fixedHero:r.fixedHero,countdown:r.deadline===null?null:Math.max(0,Math.ceil((r.deadline-now())/1000)),owner:r.owner,phase:r.phase,round:r.round,hero:r.hero,game:r.game,result:r.result,chat:r.chat||[],members:[...r.members.values()].map(m=>({id:m.id,name:m.name,x:m.x??.5,y:m.y??.6,willing:m.willing,turns:m.turns,clears:m.clears,online:!!m.ws,late:m.joinedDuring===r.round&&r.phase!=='waiting'}))});
 const broadcast=r=>{const state=snapshot(r);for(const m of r.members.values())send(m.ws,{...state,...(m.id===r.owner&&m.ws?.twitchControl===r.twitchControl?{twitchControl:r.twitchControl}:{})});};
 function schedule(r){if(r.kind!=='random'||r.phase!=='waiting'||[...r.members.values()].filter(m=>m.ws).length<2||![...r.members.values()].some(m=>m.ws&&m.willing)){r.deadline=null;return;}if(r.deadline===null)r.deadline=now()+20000;if([...r.members.values()].filter(m=>m.ws).length>=3)r.deadline=Math.min(r.deadline,now()+5000);}
 function reset(r,message){r.phase='waiting';r.hero=null;r.game=null;r.deadline=null;r.result=message;schedule(r);}
 function start(r){let candidates=[...r.members.values()].filter(m=>m.ws&&m.willing);if(r.kind==='random'&&[...r.members.values()].filter(m=>m.ws).length<2)return false;if(r.heroMode==='fixed')candidates=candidates.filter(m=>m.id===r.fixedHero);if(!candidates.length)return false;const min=Math.min(...candidates.map(m=>m.turns)),pool=candidates.filter(m=>m.turns===min),hero=pool[randomInt(pool.length)];hero.turns++;r.hero=hero.id;r.round++;r.phase='preparing';r.game=null;r.result='';r.deadline=null;broadcast(r);return true;}
 function dropMember(r,id){onLeave(id,r.game);r.members.delete(id);if(!r.members.size){rooms.delete(r.code);return;}if(r.owner===id){r.owner=[...r.members.values()].find(m=>m.ws)?.id||r.members.keys().next().value;r.twitchControl=randomBytes(32).toString('hex');const next=r.members.get(r.owner);if(next?.ws)next.ws.twitchControl=r.twitchControl;}if(r.fixedHero===id){r.fixedHero=null;r.result='固定の勇者が退出しました。勇者を指定し直してください';}if(r.hero===id)reset(r,'勇者が退出したため準備に戻りました');schedule(r);broadcast(r);}
 function leave(ws,permanent=false){const r=rooms.get(ws.room);if(!r||r.members.get(ws.memberId)?.ws!==ws)return;if(permanent){dropMember(r,ws.memberId);return;}const m=r.members.get(ws.memberId);m.ws=null;m.disconnectedAt=now();schedule(r);broadcast(r);}

 function create(id,kind,replacing=false){if(rooms.size>=32&&!replacing)return null;let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));const r={code,kind,twitchControl:randomBytes(32).toString('hex'),heroMode:'rotate',fixedHero:null,deadline:null,owner:id,phase:'waiting',round:0,hero:null,game:null,result:'',chat:[],lastWalk:now(),members:new Map()};rooms.set(code,r);return r;}
 wss.on('connection',ws=>{ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('close',()=>leave(ws));ws.on('error',()=>{});ws.on('message',raw=>{let d;try{d=JSON.parse(raw);}catch{return;}if(!d||typeof d!=='object')return;const error=(message,recoverable=false)=>send(ws,{type:'error',message,recoverable});
 if(['match','create','join','resume'].includes(d.type)){
  if(ws.room)return;const id=String(d.id||''),name=String(d.name||'ゴブリン').trim().slice(0,16);if(!/^[a-f0-9]{24}$/.test(id)||!name)return error('名前を確認してください');let r;
  if(d.type==='match'){r=[...rooms.values()].find(r=>r.kind==='random'&&r.members.has(id))||[...rooms.values()].filter(r=>r.kind==='random'&&r.phase!=='finished'&&!r.rosterLocked&&!r.excludedMembers?.has(id)&&r.members.size<6).sort((a,b)=>b.members.size-a.members.size)[0]||create(id,'random');}
  else if(d.type==='create')r=create(id,'private');
  else{r=rooms.get(String(d.code));if(!r)return error('部屋が見つかりません');if(d.type==='resume'&&!r.members.has(id))return error('再接続の待機時間を過ぎました。入り直してください');if(d.type!=='resume'&&r.kind!=='private')return error('この部屋へは「ランダムメンバーで遊ぶ」から参加してください');}
  if(!r)return error('部屋が満員です');const old=r.members.get(id);if(!old&&r.rosterLocked)return error('この部屋は同じメンバーで再戦中です。別の部屋に参加してください');if(!old&&r.members.size>=6)return error('この部屋は6人で満員です');
  if(old&&r.hero===id&&d.freshPage&&['preparing','playing'].includes(r.phase))reset(r,'勇者画面が再読み込みされたため準備に戻りました');ws.room=r.code;ws.memberId=id;if(r.owner===id&&(d.type==='create'||d.twitchControl===r.twitchControl))ws.twitchControl=r.twitchControl;r.members.set(id,{id,name,x:old?.x??(.25+r.members.size*.09),y:old?.y??.62,walkX:old?.x??(.25+r.members.size*.09),walkY:old?.y??.62,lastChat:old?.lastChat??-Infinity,willing:old?.willing??true,turns:old?.turns||0,clears:old?.clears||0,disconnectedAt:null,joinedDuring:old?old.joinedDuring:(r.phase==='waiting'?null:r.round),ws});if(old?.ws&&old.ws!==ws)old.ws.close(1000,'reconnected');schedule(r);broadcast(r);return;
 }
 const r=rooms.get(ws.room),m=r?.members.get(ws.memberId);if(!r||m?.ws!==ws)return;
 if(d.type==='twitch-ticket'){send(ws,{type:'twitch-ticket',ticket:r.owner===m.id&&ws.twitchControl===r.twitchControl?onTwitchTicket(r.code,m.id):null});return;}
 if(d.type==='walk'&&r.phase==='waiting'&&Number.isFinite(d.x)&&Number.isFinite(d.y)){m.walkX=Math.max(.08,Math.min(.92,d.x));m.walkY=Math.max(.32,Math.min(.86,d.y));return;}
 if(d.type==='chat'&&r.phase==='waiting'){const text=String(d.text||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,100);if(!text||now()-m.lastChat<800)return;m.lastChat=now();r.chat.push({id:randomInt(1000000000),member:m.id,name:m.name,text,at:now()});r.chat=r.chat.slice(-30);broadcast(r);return;}
 if(d.type==='willing'){if(r.phase!=='waiting')return;m.willing=!!d.value;if(!m.willing&&r.fixedHero===m.id){r.fixedHero=null;r.result='固定の勇者が辞退しました。勇者を指定し直してください';}schedule(r);broadcast(r);}
 if(d.type==='settings'){if(r.kind!=='private'||r.owner!==m.id||r.phase!=='waiting')return error('固定部屋の管理役がラウンドの合間に設定できます');if(!['rotate','fixed'].includes(d.heroMode))return;if(d.heroMode==='fixed'&&!r.members.get(d.fixedHero)?.willing)return error('勇者OKの参加者から指定してください');r.heroMode=d.heroMode;r.fixedHero=d.heroMode==='fixed'?d.fixedHero:null;r.result='勇者の設定を保存しました';broadcast(r);}
 if(d.type==='next'){if(r.kind!=='private'||r.owner!==m.id||r.phase!=='waiting')return;if(!start(r))error(r.heroMode==='fixed'?'固定する勇者を指定してください':'勇者になれる人を1人以上選んでください');}
 if(d.type==='game-ready'&&r.hero===m.id&&r.phase==='preparing'&&/^\d{6}$/.test(d.game)){r.game=d.game;broadcast(r);}
 if(d.type==='started'&&r.hero===m.id&&r.phase==='preparing'){r.phase='playing';broadcast(r);}
 if(d.type==='finished'&&r.hero===m.id&&['preparing','playing'].includes(r.phase)){if(d.win)m.clears++;r.phase='finished';r.deadline=null;r.result=d.win?`${m.name}が宝を持ち帰りました！`:`${m.name}をゴブリンが阻止！`;broadcast(r);}
 if(d.type==='post-round'){if(r.phase!=='finished'||r.hero!==m.id||d.round!==r.round)return error('終了したラウンドの勇者が選択できます',true);if(!['same','new','title'].includes(d.action))return;
  if(d.action==='same'){const locked=r.rosterLocked;r.rosterLocked=true;if(!start(r)){r.rosterLocked=locked;return error('再戦できる参加者を待っています。勇者候補が必要で、ランダム部屋は2人以上必要です',true);}return;}
  const next=d.action==='new'?create(m.id,r.kind,true):null;if(d.action==='new'&&!next)return error('新しい部屋を作れませんでした。もう一度お試しください',true);
  if(next){next.heroMode=r.heroMode;next.fixedHero=r.heroMode==='fixed'?m.id:null;next.excludedMembers=new Set([...r.members.keys()].filter(id=>id!==m.id));}
  const message=d.action==='new'?'勇者が新しいメンバーを募集するため、この部屋を終了しました。':'勇者がタイトルに戻ったため、この部屋を終了しました。';
  for(const member of r.members.values()){onLeave(member.id,r.game);if(member.id!==m.id){send(member.ws,{type:'room-ended',message});if(member.ws){member.ws.room=null;member.ws.close(1000,'room ended');}}}
  rooms.delete(r.code);r.members.clear();
  if(next){ws.room=next.code;ws.twitchControl=next.twitchControl;next.members.set(m.id,{...m,turns:0,clears:0,joinedDuring:null,disconnectedAt:null,x:.5,y:.62,walkX:.5,walkY:.62});next.result='新しい部屋を作りました。新しいメンバーを待っています。';broadcast(next);}
  else{ws.room=null;send(ws,{type:'room-ended',message:'部屋を終了しました。'});ws.close(1000,'room ended');}return;
 }
 if(d.type==='cancel'&&r.kind==='private'&&r.owner===m.id&&['preparing','playing'].includes(r.phase)){reset(r,'ラウンドを中断しました');broadcast(r);}
 if(d.type==='leave'){leave(ws,true);ws.room=null;ws.close();}
 });});
 const upgrade=(req,socket,head)=>{if(new URL(req.url,'http://localhost').pathname!=='/lobby')return;if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));};server.on('upgrade',upgrade);
 function tick(){for(const r of [...rooms.values()]){for(const m of [...r.members.values()])if(m.disconnectedAt!==null&&m.disconnectedAt!==undefined&&now()-m.disconnectedAt>=graceMs)dropMember(r,m.id);if(!rooms.has(r.code))continue;if(r.phase==='waiting'){const dt=Math.min(.5,Math.max(0,(now()-(r.lastWalk??now()))/1000));let moved=false;for(const m of r.members.values()){if(!m.ws)continue;const dx=(m.walkX??m.x)-m.x,dy=(m.walkY??m.y)-m.y,len=Math.hypot(dx,dy);if(len>.002){const k=Math.min(1,dt*.24/len);m.x+=dx*k;m.y+=dy*k;moved=true;}}r.lastWalk=now();if(moved)broadcast(r);}else r.lastWalk=now();if(r.kind!=='random'||r.phase!=='waiting')continue;schedule(r);if(r.deadline!==null&&r.deadline<=now()){start(r);continue;}const seconds=r.deadline===null?null:Math.ceil((r.deadline-now())/1000);if(seconds!==r.lastSeconds){r.lastSeconds=seconds;broadcast(r);}}}

 const matchmaking=setInterval(tick,250);matchmaking.unref();const timer=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},10000);timer.unref();
 return{rooms,tick,close(){clearInterval(timer);clearInterval(matchmaking);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();}};
}
