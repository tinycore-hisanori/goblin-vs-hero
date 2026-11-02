import {callbackError} from './twitch-locale.js';
import {randomBytes,randomInt} from 'node:crypto';
import {createTwitchProvider} from './twitch-chat.js';

export const TWITCH_CHOICES=[{id:'darkness',label:'暗闇：勇者の視界が8秒暗くなる'},{id:'alarm',label:'騒音：勇者の場所にゴブリンをおびき寄せる'},{id:'supplies',label:'差し入れ：生きているゴブリンを2回復'}];
const nonce=()=>randomBytes(32).toString('hex');
const cookie=(req,name)=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);

// Rooms, credentials and browser sessions share the game's in-memory lifetime.
// No channel allowlist: every broadcaster authorizes their own chat independently.
export function createTwitchIntegration({rooms,publicOrigin,clientId=process.env.TWITCH_CLIENT_ID,clientSecret=process.env.TWITCH_CLIENT_SECRET,provider,now=Date.now}={}) {
  const enabled=!!(publicOrigin?.startsWith('https://')&&clientId&&(clientSecret||provider));
  provider??=enabled?createTwitchProvider({clientId,clientSecret}):null;
  const tickets=new Map(),pending=new Map(),sessions=new Map(),links=new Map();
  const redirect=publicOrigin+'/auth/twitch/callback';
  const session=req=>{const s=sessions.get(cookie(req,'gg_twitch'));return s&&s.until>now()?s:null;};
  const clean=map=>{for(const [key,value]of map)if(value.until<=now())map.delete(key);};
  function ticket(code,member) {
    const room=rooms.get(code);clean(tickets);
    if(!enabled||room?.kind!=='private'||room.owner!==member||room.phase!=='waiting'||tickets.size>=128)return null;
    const key=nonce();tickets.set(key,{code,owner:member,until:now()+60000});return key;
  }
  function detach(code){const link=links.get(code);if(link){link.connection?.close();links.delete(code);}}
  function counts(link){const tally=[0,0,0];for(const v of link.poll?.votes.values()||[])tally[v]++;return tally;}
  function status(code,req) {
    const link=links.get(code),room=rooms.get(code);
    return {enabled,linked:!!link,channel:link?.login||null,connection:link?.status||'disconnected',canControl:!!(req&&link&&session(req)?.user===link.user),choices:TWITCH_CHOICES,
      poll:link?.poll?{endsAt:link.poll.endsAt,counts:counts(link),remaining:Math.max(0,Math.ceil((link.poll.endsAt-now())/1000))}:null,
      result:room?.phase==='playing'&&link?.result?.round===room.round?link.result:null,
      cooldown:link?Math.max(0,Math.ceil((link.nextVote-now())/1000)):0};
  }
  function receive(code,message) {
    const link=links.get(code),room=rooms.get(code),poll=link?.poll;
    if(!poll||room?.phase!=='playing'||poll.round!==room.round||now()>=poll.endsAt||!message.id||!message.user||link.seen.has(message.id))return;
    const text=String(message.text||'').trim();if(!/^[123]$/.test(text))return;
    if(link.seen.size>=20000)link.seen.delete(link.seen.values().next().value);link.seen.add(message.id);
    // A viewer may change their mind; only their latest choice counts.
    poll.votes.set(message.user,Number(text)-1);
  }
  function startVote(code) {
    tick();
    const room=rooms.get(code),link=links.get(code);
    if(!link||link.status!=='connected'||room?.phase!=='playing'||link.poll||now()<link.nextVote)return false;
    link.poll={round:room.round,endsAt:now()+20000,votes:new Map()};link.result=null;link.nextVote=now()+60000;return true;
  }
  function tick() {
    clean(tickets);clean(pending);clean(sessions);
    for(const [code,link]of links){
      const room=rooms.get(code);
      if(!room||room.owner!==link.owner||link.until<=now()){detach(code);continue;}
      if(room.phase!=='playing'||link.round!==room.round){link.poll=null;link.result=null;link.nextVote=0;link.round=room.round;}
      if(link.poll&&now()>=link.poll.endsAt){const tally=counts(link),maximum=Math.max(...tally),winners=tally.map((n,i)=>n===maximum?i:-1).filter(i=>i>=0),choice=maximum?TWITCH_CHOICES[winners[randomInt(winners.length)]]:null;
        link.result={id:nonce(),round:room.round,kind:choice?.id||null,label:choice?.label||'投票がなかったためイベントなし',counts:tally,at:now()};link.poll=null;}
    }
  }
  async function body(req){let data='';for await(const part of req){data+=part;if(Buffer.byteLength(data)>4096)throw Error('Body too large');}return JSON.parse(data||'{}');}
  async function handle(req,res) {
    let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}
    if(!url.pathname.startsWith('/api/twitch/')&&!url.pathname.startsWith('/auth/twitch/'))return false;
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    const callbackLanguage=pending.get(url.searchParams.get('state'))?.language||'en';
    const json=(code,value)=>{if(url.pathname==='/auth/twitch/callback'&&value.error)value={...value,error:callbackError(value.error,callbackLanguage)};res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
    try {
      if(url.pathname==='/api/twitch/status'&&req.method==='GET'){tick();json(200,status(url.searchParams.get('room'),req));return true;}
      if(!enabled){json(503,{error:'サーバー管理者によるTwitchアプリ設定が必要です'});return true;}
      if(url.pathname==='/auth/twitch/callback'&&req.method==='GET') {
        const key=url.searchParams.get('state'),flow=pending.get(key);
        if(!flow||flow.until<=now()||cookie(req,'gg_twitch_state')!==key){json(400,{error:'認証の期限切れです。部屋から連携し直してください'});return true;}
        pending.delete(key);
        res.setHeader('Set-Cookie','gg_twitch_state=; Path=/auth/twitch; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        if(url.searchParams.has('error')){json(400,{error:'Twitchの認可がキャンセルされました。このタブを閉じてゲームに戻れます'});return true;}
        const room=rooms.get(flow.code),existing=links.get(flow.code);
        if(!room||room.owner!==flow.owner){json(409,{error:'部屋の管理役が変わりました'});return true;}
        const identity=await provider.exchange(url.searchParams.get('code'),redirect);
        // Recheck after network I/O: a room can end while authorization is running.
        if(rooms.get(flow.code)!==room||room.owner!==flow.owner){json(409,{error:'部屋が変更されました'});return true;}
        if((links.get(flow.code)||existing)?.user && (links.get(flow.code)||existing).user!==identity.user.user_id){json(409,{error:'この部屋には別の配信者が連携しています。先に連携解除してください'});return true;}
        for(const [code,link]of links)if(link.user===identity.user.user_id)detach(code);
        const link={user:identity.user.user_id,login:identity.user.login,owner:flow.owner,until:now()+12*3600000,status:'connecting',round:room.round,poll:null,result:null,nextVote:0,seen:new Set()};links.set(flow.code,link);
        link.connection=provider.connect(identity,{onChat:message=>{if(links.get(flow.code)===link)receive(flow.code,message);},onStatus:value=>{if(links.get(flow.code)===link){link.status=value;if(value==='reauthorize'){link.poll=null;for(const [key,s]of sessions)if(s.user===link.user)sessions.delete(key);}}}});
        const sid=nonce();sessions.set(sid,{user:link.user,until:link.until});
        res.setHeader('Set-Cookie',['gg_twitch_state=; Path=/auth/twitch; HttpOnly; Secure; SameSite=Lax; Max-Age=0',`gg_twitch=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`]);
        res.setHeader('Content-Type','text/html; charset=utf-8');
        const ja=flow.language==='ja';res.end(`<!doctype html><html lang="${ja?'ja':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ja?'Twitch連携完了':'Twitch linked'}</title><body style="background:#101a22;color:#eee;font:18px system-ui;padding:40px"><h1>${ja?'Twitch連携が完了しました':'Twitch account linked'}</h1><p>${ja?'このタブを閉じて、ゲームの部屋へ戻ってください。':'Close this tab and return to your game room.'}</p></body></html>`);return true;
      }
      if(req.method!=='POST'){json(405,{error:'Method not allowed'});return true;}
      if(req.headers.origin!==publicOrigin){json(403,{error:'Invalid origin'});return true;}
      const data=await body(req);
      if(url.pathname==='/auth/twitch/start') {
        clean(pending);const grant=tickets.get(data.ticket);tickets.delete(data.ticket);
        const room=rooms.get(grant?.code);
        if(!grant||grant.until<=now()||room?.owner!==grant.owner||room.phase!=='waiting'||pending.size>=128){json(403,{error:'部屋の管理役が待機画面から連携してください'});return true;}
        const state=nonce();pending.set(state,{...grant,language:data.language==='ja'?'ja':'en',until:now()+600000});
        res.setHeader('Set-Cookie',`gg_twitch_state=${state}; Path=/auth/twitch; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
        json(200,{url:'https://id.twitch.tv/oauth2/authorize?'+new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'user:read:chat',state,force_verify:'true'})});return true;
      }
      const link=links.get(data.room);
      if(!link||session(req)?.user!==link.user){json(403,{error:'連携した配信者のブラウザーで操作してください'});return true;}
      if(url.pathname==='/api/twitch/vote'){const started=startVote(data.room);json(started?200:409,started?{ok:true}:{error:'冒険開始・Twitch接続完了後に投票できます（投票開始は60秒ごと）'});}
      else if(url.pathname==='/api/twitch/disconnect'){detach(data.room);json(200,{ok:true});}
      else json(404,{error:'Not found'});
    }catch{if(!res.headersSent)json(502,{error:'Twitch連携に失敗しました。時間をおいて再度お試しください'});else res.end();}
    return true;
  }
  const timer=setInterval(tick,250);timer.unref();
  return {handle,ticket,status,tick,close(){clearInterval(timer);for(const code of links.keys())detach(code);tickets.clear();pending.clear();sessions.clear();}};
}
