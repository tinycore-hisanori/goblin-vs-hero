// Local-only browser QA harness. Never included in release archives.
import {createServer} from 'node:http';
import {createProductionServer} from '../server/production.js';
import {attachLobby} from '../server/lobby.js';
import {attachPartyRelay} from '../server/party-relay.js';
import WebSocket from 'ws';
const assets=createProductionServer(),serve=assets.server.listeners('request')[0],bots=[];
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/test') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;color:white}iframe{width:1100px;height:780px;border:0}button{padding:8px}</style><button onclick="fetch('/test/add',{method:'POST'})">ゴブリン追加</button><button onclick="fetch('/test/finish',{method:'POST'})">勝利で終了</button><button onclick="document.querySelector('iframe').style.width='390px';document.querySelector('iframe').style.height='620px'">スマホ幅</button><iframe id="game" src="/party.html?create=1"></iframe>`);return;}
 if(path.startsWith('/test/')&&req.method==='POST'){
  const room=[...lobby.rooms.values()][0];if(!room){res.writeHead(400);res.end('no room');return;}
  if(path==='/test/finish')room.members.get(room.hero)?.ws.emit('message',JSON.stringify({type:'finished',win:true}));
  if(path==='/test/add'){const ws=new WebSocket('ws://127.0.0.1:8799/lobby');bots.push(ws);ws.on('open',()=>ws.send(JSON.stringify({type:'join',id:crypto.randomUUID().replaceAll('-','').slice(0,24),name:'検証ゴブリン',code:room.code})));}
  res.end('ok');return;
 }
 return serve(req,res);
});
const relay=attachPartyRelay(server),lobby=attachLobby(server,{onLeave:(id,game)=>relay.removeGuest(game,id)});
server.listen(8799,'127.0.0.1',()=>console.log('QA http://127.0.0.1:8799/test'));
process.on('SIGTERM',()=>{bots.forEach(ws=>ws.terminate());lobby.close();relay.close();assets.close();server.close();});

