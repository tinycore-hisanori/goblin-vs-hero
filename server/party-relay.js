import {attachLobby} from './lobby.js';
import {getCareer,putCareer} from './career-store.js';
import {WebSocketServer,WebSocket} from 'ws';
import {randomInt} from 'node:crypto';
import {networkInterfaces} from 'node:os';

export function lanAddresses(port){const addresses=[];for(const [name,entries] of Object.entries(networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)addresses.push({interface:name,address:entry.address,url:`http://${entry.address}:${port}/goblin.html`});return addresses;}
export function attachPartyRelay(server,{now=Date.now,graceMs=90000}={}){
 const wss=new WebSocketServer({noServer:true,maxPayload:131072,perMessageDeflate:false}),rooms=new Map();
 const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<262144)ws.send(JSON.stringify(data));};
 const error=(ws,message)=>send(ws,{type:'connection-error',message});
 function detach(ws){const room=rooms.get(ws.partyRoom);if(!room)return;if(ws.partyRole==='host'){rooms.delete(room.code);for(const peer of room.peers.values()){send(peer,{type:'room-closed',message:'勇者が部屋を閉じました。新しい部屋コードで参加してください。'});peer.close(1000,'host left');}}else if(room.peers.get(ws.partyId)===ws){if(ws.intentionalLeave){room.peers.delete(ws.partyId);send(room.host,{type:'leave',id:ws.partyId});}else{ws.expiresAt=now()+graceMs;send(room.host,{type:'suspended',id:ws.partyId,until:ws.expiresAt});return;}}ws.partyRoom=null;}
 wss.on('connection',ws=>{ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});ws.on('close',()=>detach(ws));
  ws.on('message',(raw,isBinary)=>{if(isBinary)return;let data;try{data=JSON.parse(raw.toString());}catch{return error(ws,'通信データを読み取れません');}if(!data||typeof data!=='object')return;
   if(!ws.partyRole&&data.type==='create-room'){if(rooms.size>=32)return error(ws,'部屋が満員です');let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));const room={code,host:ws,peers:new Map(),snapshot:null};rooms.set(code,room);ws.partyRole='host';ws.partyRoom=code;send(ws,{type:'room-created',room:code});return;}
   if(ws.partyRole==='host'&&data.type==='configure-room'){const room=rooms.get(ws.partyRoom),code=String(data.room||'');if(!room)return;if(!/^\d{6}$/.test(code))return error(ws,'部屋コードは数字6桁で入力してください');if(data.nest!=='goblin-den')return error(ws,'この巣はまだ選べません');if(room.peers.size)return error(ws,'参加者がいるため部屋番号を変更できません');if(rooms.has(code)&&code!==room.code)return error(ws,'その番号は使用中です。別の番号を選んでください');rooms.delete(room.code);room.code=code;room.nest=data.nest;room.snapshot=null;rooms.set(code,room);ws.partyRoom=code;send(ws,{type:'room-created',room:code});return;}
   if(ws.partyRole==='host'){const room=rooms.get(ws.partyRoom);if(!room)return;if(data.type==='snapshot'){data.room=room.code;for(const player of data.players||[])putCareer(player.id,player.career);room.snapshot=data;for(const peer of room.peers.values())send(peer,data);}else if(data.type==='notice'){const peer=room.peers.get(data.to);if(peer)send(peer,data);}return;}
   if(!ws.partyRole&&data.type==='join'){const code=String(data.room||'');if(!/^\d{6}$/.test(code))return error(ws,'6桁の部屋コードを入力してください');const room=rooms.get(code);if(!room)return error(ws,'その部屋は見つかりません。勇者の部屋コードを確認してください');if(typeof data.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id))return error(ws,'参加者IDを読み取れません');const name=String(data.name||'ゴブリン').trim().slice(0,16);if(!name)return error(ws,'名前を入力してください');const old=room.peers.get(data.id);if(!old&&room.peers.size>=6)return error(ws,'ゴブリンは6人まで参加できます');ws.partyRole='guest';ws.partyRoom=code;ws.partyId=data.id;room.peers.set(data.id,ws);if(old&&old!==ws){error(old,'同じ参加者の別画面に接続を移しました');old.close(1000,'reconnected');}send(ws,{type:'room-joined',room:code});send(room.host,{type:'join',id:ws.partyId,name,career:getCareer(ws.partyId)});if(room.snapshot)send(ws,room.snapshot);return;}
   if(ws.partyRole==='guest'){const room=rooms.get(ws.partyRoom);if(!room)return;const now=Date.now();if(!ws.rateStart||now-ws.rateStart>1000){ws.rateStart=now;ws.rate=0;}if(++ws.rate>30)return;if(!['join','heartbeat','command','leave'].includes(data.type))return;if(raw.length>8192)return;if(data.type==='leave'){ws.intentionalLeave=true;detach(ws);ws.close();return;}send(room.host,{...data,career:data.type==='join'?getCareer(ws.partyId):undefined,id:ws.partyId,name:String(data.name||'ゴブリン').slice(0,16)});}
  });
 });
 const upgrade=(request,socket,head)=>{let pathname;try{pathname=new URL(request.url,'http://localhost').pathname;}catch{return;}if(pathname!=='/party')return;
  if(request.headers.origin){try{if(new URL(request.headers.origin).host!==request.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));};
 server.on('upgrade',upgrade);
 function sweep(){for(const room of rooms.values())for(const [id,peer] of room.peers)if(peer.expiresAt&&peer.expiresAt<=now()){room.peers.delete(id);send(room.host,{type:'leave',id});}}
 const timer=setInterval(()=>{sweep();for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);timer.unref();
 const close=()=>{clearInterval(timer);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();rooms.clear();};
 return{rooms,close,sweep,removeGuest(code,id){const room=rooms.get(code),peer=room?.peers.get(id);if(!peer)return;room.peers.delete(id);peer.partyRoom=null;send(room.host,{type:'leave',id});peer.close(1000,'left lobby');}};
}

export function partyRelayPlugin(){const mount=server=>{if(!server.httpServer)return;const relay=attachPartyRelay(server.httpServer),lobby=attachLobby(server.httpServer,{onLeave:(id,game)=>relay.removeGuest(game,id)});server.middlewares.use('/api/lan-info',(req,res)=>{const port=server.httpServer.address()?.port||5173;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({port,addresses:lanAddresses(port)}));});server.httpServer.once('close',()=>{relay.close();lobby.close();});};return{name:'goblin-lan-party',configureServer:mount,configurePreviewServer:mount};}
