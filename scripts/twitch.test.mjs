import test from 'node:test';
import assert from 'node:assert/strict';
import {once,EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {createProductionServer} from '../server/production.js';
import {createTwitchProvider} from '../server/twitch-chat.js';
import {createTwitchEffects} from '../src/twitch-effects.js';

const publicOrigin='https://goblin-vs-hero.kitakuarcade.com';
async function harness(t){
  let time=1000000;const connections=new Map(),clients=[];
  const provider={
    async exchange(code){return {user:{user_id:code,login:'streamer_'+code},credentials:{access_token:'NEVER_PUBLIC',refresh_token:'NEVER_PUBLIC_REFRESH'}};},
    connect(identity,handlers){const connection={...handlers,closed:false,close(){this.closed=true;}};connections.set(identity.user.user_id,connection);handlers.onStatus('connected');return connection;}
  };
  const app=createProductionServer({publicOrigin,twitchOptions:{clientId:'test-client',provider,now:()=>time}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base=`http://127.0.0.1:${app.server.address().port}`;
  t.after(()=>{clients.forEach(ws=>ws.terminate());app.close();});
  async function request(path,{method='GET',body,cookie='',origin=publicOrigin}={}){
    const response=await fetch(base+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const text=await response.text();assert.ok(!text.includes('NEVER_PUBLIC'));
    return {status:response.status,text,json:()=>JSON.parse(text),cookies:response.headers.getSetCookie()};
  }
  async function peer(id,type='create',code,extra={}){const ws=new WebSocket(base.replace('http','ws')+'/lobby');clients.push(ws);await once(ws,'open');const received=once(ws,'message');ws.send(JSON.stringify({type,id,name:id.slice(0,3),code,...extra}));return {ws,state:JSON.parse((await received)[0])};}
  async function message(peer,data,type='lobby'){
    const promise=new Promise(resolve=>{const handler=raw=>{const value=JSON.parse(raw);if(value.type===type){peer.ws.off('message',handler);if(value.type==='lobby')peer.state=value;resolve(value);}};peer.ws.on('message',handler);});peer.ws.send(JSON.stringify(data));return promise;
  }
  async function begin(peer){const result=await message(peer,{type:'twitch-ticket'},'twitch-ticket');const start=await request('/auth/twitch/start',{method:'POST',body:{ticket:result.ticket}});assert.equal(start.status,200);return {state:new URL(start.json().url).searchParams.get('state'),cookie:start.cookies[0].split(';')[0]};}
  async function authorize(peer,user){const flow=await begin(peer);const callback=await request(`/auth/twitch/callback?code=${user}&state=${flow.state}`,{cookie:flow.cookie});assert.equal(callback.status,200);return callback.cookies.find(s=>s.startsWith('gg_twitch=')).split(';')[0];}
  const status=(peer,cookie='')=>request('/api/twitch/status?room='+peer.state.code,{cookie}).then(r=>r.json());
  async function play(peer){await message(peer,peer.state.phase==='finished'?{type:'post-round',action:'same',round:peer.state.round}:{type:'next'});await message(peer,{type:'game-ready',game:'123456'});await message(peer,{type:'started'});}
  return {request,peer,message,begin,authorize,status,play,connections,advance(ms){time+=ms;}};
}

test('any two broadcasters authorize independently; chat votes and effects stay in their rooms',async t=>{
  const h=await harness(t),a=await h.peer('a'.repeat(24)),b=await h.peer('b'.repeat(24));
  const ca=await h.authorize(a,'111'),cb=await h.authorize(b,'222');
  assert.equal((await h.status(a,ca)).canControl,true);assert.equal((await h.status(a,cb)).canControl,false);
  assert.equal((await h.status(b,cb)).channel,'streamer_222');
  await h.play(a);await h.play(b);
  const start=(p,c)=>h.request('/api/twitch/vote',{method:'POST',cookie:c,body:{room:p.state.code}});
  assert.equal((await start(a,cb)).status,403);assert.equal((await start(a,ca)).status,200);assert.equal((await start(b,cb)).status,200);
  h.connections.get('111').onChat({id:'msg1',user:'viewer',text:'1'});
  h.connections.get('111').onChat({id:'msg2',user:'viewer',text:'3'});
  h.connections.get('111').onChat({id:'msg1',user:'viewer',text:'1'}); // redelivery cannot undo a changed vote
  h.connections.get('222').onChat({id:'msg1',user:'viewer',text:'2'});
  assert.deepEqual((await h.status(a)).poll.counts,[0,0,1]);assert.deepEqual((await h.status(b)).poll.counts,[0,1,0]);
  h.advance(20001);
  assert.equal((await h.status(a)).result.kind,'supplies');assert.equal((await h.status(b)).result.kind,'alarm');
  assert.equal((await start(a,ca)).status,409);
  await h.message(a,{type:'finished',win:false});assert.equal((await h.status(a)).result,null);
  assert.equal((await h.status(b)).result.kind,'alarm');
  const disconnect=await h.request('/api/twitch/disconnect',{method:'POST',cookie:ca,body:{room:a.state.code}});
  assert.equal(disconnect.status,200);assert.equal(h.connections.get('111').closed,true);assert.equal(h.connections.get('222').closed,false);
});

test('OAuth requires owner-only ticket, matching browser cookie, fresh state and same-origin POST',async t=>{
  const h=await harness(t),owner=await h.peer('c'.repeat(24)),guest=await h.peer('d'.repeat(24),'join',owner.state.code);
  assert.equal((await h.message(guest,{type:'twitch-ticket'},'twitch-ticket')).ticket,null);
  assert.equal((await h.request('/auth/twitch/start',{method:'POST',body:{ticket:'bad'}})).status,403);
  assert.equal((await h.request('/auth/twitch/start',{method:'POST',origin:'https://evil.example',body:{}})).status,403);
  const flow=await h.begin(owner);
  assert.equal((await h.request(`/auth/twitch/callback?code=333&state=${flow.state}`)).status,400);
  assert.equal((await h.request(`/auth/twitch/callback?code=333&state=${flow.state}`,{cookie:flow.cookie})).status,200);
  assert.equal((await h.request(`/auth/twitch/callback?code=333&state=${flow.state}`,{cookie:flow.cookie})).status,400);
  const different=await h.begin(owner);
  assert.equal((await h.request(`/auth/twitch/callback?code=444&state=${different.state}`,{cookie:different.cookie})).status,409);
  assert.equal((await h.status(owner)).channel,'streamer_333');
  const expired=await h.begin(owner);h.advance(600001);
  assert.equal((await h.request(`/auth/twitch/callback?code=333&state=${expired.state}`,{cookie:expired.cookie})).status,400);
});

test('no votes do not cause an event, and ending a round cancels an unfinished vote',async t=>{
  const h=await harness(t),a=await h.peer('e'.repeat(24)),cookie=await h.authorize(a,'555');await h.play(a);
  const start=()=>h.request('/api/twitch/vote',{method:'POST',cookie,body:{room:a.state.code}});
  await start();h.advance(20001);assert.equal((await h.status(a)).result.kind,null);
  h.advance(40000);await start();h.connections.get('555').onChat({id:'one',user:'u',text:'1'});
  await h.message(a,{type:'finished',win:true});h.advance(20001);
  assert.equal((await h.status(a)).poll,null);assert.equal((await h.status(a)).result,null);
  await h.play(a);assert.equal((await h.status(a)).result,null);
});

test('moving the same broadcaster to a new room stops the old chat connection',async t=>{
  const h=await harness(t),a=await h.peer('1'.repeat(24)),b=await h.peer('2'.repeat(24));await h.authorize(a,'999');const old=h.connections.get('999');await h.authorize(b,'999');
  assert.equal(old.closed,true);assert.equal((await h.status(a)).linked,false);assert.equal((await h.status(b)).linked,true);
});

test('knowing a public member ID does not grant its Twitch authorization capability',async t=>{
  const h=await harness(t),owner=await h.peer('3'.repeat(24));assert.ok(owner.state.twitchControl);
  const guest=await h.peer('4'.repeat(24),'join',owner.state.code);assert.equal(guest.state.twitchControl,undefined);
  const impostor=await h.peer('3'.repeat(24),'join',owner.state.code);assert.equal(impostor.state.twitchControl,undefined);
  assert.equal((await h.message(impostor,{type:'twitch-ticket'},'twitch-ticket')).ticket,null);
  const resumed=await h.peer('3'.repeat(24),'resume',owner.state.code,{twitchControl:owner.state.twitchControl});
  assert.equal(resumed.state.twitchControl,owner.state.twitchControl);
  assert.ok((await h.message(resumed,{type:'twitch-ticket'},'twitch-ticket')).ticket);
});

test('EventSub subscribes as each authorized broadcaster and excludes shared-channel chat',async()=>{
  const calls=[],sockets=[],chats=[];
  class Socket extends EventEmitter {constructor(url){super();this.url=url;sockets.push(this);}terminate(){this.emit('close');}close(){this.emit('close');}}
  const provider=createTwitchProvider({clientId:'app',clientSecret:'secret',Socket,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({data:[]})};}});
  const connection=provider.connect({credentials:{access_token:'test'},user:{user_id:'123',expires_in:3600}},{onChat:e=>chats.push(e),onStatus:()=>{}});
  try{
    sockets[0].emit('message',JSON.stringify({metadata:{message_type:'session_welcome'},payload:{session:{id:'session',keepalive_timeout_seconds:10}}}));
    await new Promise(resolve=>setImmediate(resolve));
    const subscription=JSON.parse(calls[0].options.body);assert.deepEqual(subscription.condition,{broadcaster_user_id:'123',user_id:'123'});assert.equal(subscription.transport.session_id,'session');
    const emit=event=>sockets[0].emit('message',JSON.stringify({metadata:{message_type:'notification'},payload:{subscription:{type:'channel.chat.message'},event:{chatter_user_id:'v',message_id:'m',message:{text:'2'},...event}}}));
    emit({broadcaster_user_id:'999'});emit({broadcaster_user_id:'123',source_broadcaster_user_id:'999'});emit({broadcaster_user_id:'123'});
    assert.equal(chats.length,1);assert.equal(chats[0].text,'2');
  }finally{connection.close();}
});

test('game effects deduplicate, expire darkness, respect max HP and never resurrect dead goblins',()=>{
  let time=1000,active=true,dark=false,noises=0;const goblins=[{hp:1,max:3},{hp:5,max:6},{hp:0,max:3}];
  const effects=createTwitchEffects({active:()=>active,now:()=>time,noise:()=>noises++,goblins:()=>goblins,maxHp:g=>g.max,notice:()=>{},darken:value=>dark=value});
  assert.equal(effects.apply({id:'a',kind:'supplies'}),true);assert.deepEqual(goblins.map(g=>g.hp),[3,6,0]);
  effects.apply({id:'b',kind:'alarm'});effects.apply({id:'b',kind:'alarm'});assert.equal(noises,1);
  effects.apply({id:'c',kind:'darkness'});assert.equal(dark,true);time+=8000;effects.tick();assert.equal(dark,false);
  active=false;assert.equal(effects.apply({id:'d',kind:'alarm'}),false);assert.equal(noises,1);
});

test('darkness notification counts down, expires with the effect, and clears after returning from a hidden tab',()=>{
  let time=0,active=true,dark=false;const notifications=[];
  const effects=createTwitchEffects({active:()=>active,now:()=>time,noise:()=>{},goblins:()=>[],maxHp:()=>3,notice:(text,seconds)=>notifications.push({text,seconds}),darken:value=>dark=value});
  effects.apply({id:'1',kind:'darkness'});assert.equal(dark,true);assert.equal(notifications.at(-1).seconds,8);
  time=1000;effects.tick();assert.equal(notifications.at(-1).seconds,7);
  time=7999;effects.tick();assert.equal(dark,true);assert.equal(notifications.at(-1).seconds,1);
  time=8000;effects.tick();assert.equal(dark,false);assert.deepEqual(notifications.at(-1),{text:'',seconds:0});
  effects.apply({id:'2',kind:'darkness'});time+=30000;effects.tick();assert.equal(dark,false);assert.equal(notifications.at(-1).text,'');
  effects.apply({id:'3',kind:'darkness'});active=false;effects.tick();assert.equal(dark,false);assert.equal(notifications.at(-1).text,'');
});

test('other Twitch notices expire in four seconds and reset clears visual state immediately',()=>{
  let time=0,text='',dark=false;const effects=createTwitchEffects({active:()=>true,now:()=>time,noise:()=>{},goblins:()=>[],maxHp:()=>3,notice:value=>text=value,darken:value=>dark=value});
  for(const kind of ['alarm','supplies']){effects.apply({id:kind,kind});assert.ok(text);time+=4000;effects.tick();assert.equal(text,'');}
  effects.apply({id:'dark',kind:'darkness'});assert.equal(dark,true);effects.reset();assert.equal(dark,false);assert.equal(text,'');
});
