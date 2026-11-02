import WebSocket from 'ws';

const oauth = 'https://id.twitch.tv/oauth2/';
export function createTwitchProvider({clientId, clientSecret, fetchImpl=fetch, Socket=WebSocket}) {
  const request = async (url, options={}) => {
    const response = await fetchImpl(url, {...options, signal:AbortSignal.timeout(8000)});
    if (!response.ok) { const error=new Error('Twitch request failed'); error.status=response.status; throw error; }
    return response.json();
  };
  const token = params => request(oauth+'token', {method:'POST', body:new URLSearchParams({client_id:clientId, client_secret:clientSecret, ...params})});
  const validate = async credentials => {
    const user=await request(oauth+'validate', {headers:{Authorization:'OAuth '+credentials.access_token}});
    if(user.client_id!==clientId || !user.user_id || !user.scopes?.includes('user:read:chat')) throw Error('Invalid Twitch authorization');
    return user;
  };
  return {
    async exchange(code, redirect) {
      const credentials=await token({grant_type:'authorization_code',code,redirect_uri:redirect});
      return {credentials,user:await validate(credentials)};
    },
    connect(identity, {onChat,onStatus}) {
      let credentials=identity.credentials, socket, candidate, retry, watchdog, validation;
      let stopped=false, backoff=1000, expires=Date.now()+identity.user.expires_in*1000, refreshing;
      const sockets=new Set();
      const stop=()=>{stopped=true;clearTimeout(retry);clearTimeout(watchdog);clearInterval(validation);for(const s of sockets)s.terminate();sockets.clear();};
      const revoked=()=>{stop();onStatus('reauthorize');};
      async function refresh() {
        if(!refreshing) refreshing=(async()=>{
          credentials=await token({grant_type:'refresh_token',refresh_token:credentials.refresh_token});
          const user=await validate(credentials);
          if(user.user_id!==identity.user.user_id) throw Error('Identity changed');
          expires=Date.now()+user.expires_in*1000;
        })().finally(()=>{refreshing=null;});
        return refreshing;
      }
      function retryLater() {
        if(stopped || retry) return;
        onStatus('reconnecting');
        retry=setTimeout(()=>{retry=null;open();},backoff);
        retry.unref?.();backoff=Math.min(30000,backoff*2);
      }
      async function open(url='wss://eventsub.wss.twitch.tv/ws', migrating=false) {
        if(stopped)return;
        try { if(expires-Date.now()<60000) await refresh(); }
        catch(error){if([400,401,403].includes(error.status))revoked();else retryLater();return;}
        if(stopped)return;
        const ws=new Socket(url);sockets.add(ws);if(migrating)candidate=ws;else socket=ws;
        let keepalive=15000;
        const arm=()=>{if(ws!==socket)return;clearTimeout(watchdog);watchdog=setTimeout(()=>ws.terminate(),keepalive);watchdog.unref?.();};
        const welcomeTimer=setTimeout(()=>ws.terminate(),12000);welcomeTimer.unref?.();
        ws.on('error',()=>{});
        ws.on('close',()=>{clearTimeout(welcomeTimer);sockets.delete(ws);if(ws===candidate)candidate=null;if(ws===socket){clearTimeout(watchdog);if(candidate)candidate.terminate();retryLater();}});
        ws.on('message',async raw=>{
          if(stopped)return;
          let message;try{message=JSON.parse(raw);}catch{return;}
          arm();
          const type=message.metadata?.message_type,payload=message.payload;
          try {
            if(type==='session_welcome') {
              clearTimeout(welcomeTimer);
              keepalive=(payload.session.keepalive_timeout_seconds||10)*1000+5000;
              if(migrating){const previous=socket;socket=ws;candidate=null;previous?.close();}
              else {
                const subscribe=()=>request('https://api.twitch.tv/helix/eventsub/subscriptions',{
                  method:'POST',headers:{Authorization:'Bearer '+credentials.access_token,'Client-Id':clientId,'Content-Type':'application/json'},
                  body:JSON.stringify({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:identity.user.user_id,user_id:identity.user.user_id},transport:{method:'websocket',session_id:payload.session.id}})
                });
                try{await subscribe();}catch(error){if(error.status!==401)throw error;await refresh();await subscribe();}
              }
              if(stopped)return;backoff=1000;arm();onStatus('connected');
            } else if(type==='notification' && payload?.subscription?.type==='channel.chat.message') {
              const event=payload.event;
              if(event.broadcaster_user_id===identity.user.user_id && (!event.source_broadcaster_user_id || event.source_broadcaster_user_id===identity.user.user_id))
                onChat({id:event.message_id||message.metadata.message_id,user:event.chatter_user_id,text:event.message?.text});
            } else if(type==='session_reconnect' && !candidate) {
              const next=new URL(payload.session.reconnect_url);
              if(next.protocol!=='wss:'||next.hostname!=='eventsub.wss.twitch.tv'||next.port||next.username||next.password)throw Error('Invalid reconnect URL');
              open(next.href,true);
            } else if(type==='revocation') revoked();
          } catch(error){if([400,401,403].includes(error.status))revoked();else ws.terminate();}
        });
      }
      validation=setInterval(async()=>{
        if(stopped)return;
        try {if(expires-Date.now()<120000)await refresh();else {const user=await validate(credentials);if(user.user_id!==identity.user.user_id){revoked();return;}expires=Date.now()+user.expires_in*1000;}}
        catch(error){if(error.status===401){try{await refresh();}catch{revoked();}}else if(error.status===403)revoked();}
      },60000);validation.unref?.();open();
      return {close:stop};
    }
  };
}
