export function mountTwitchPanel({getState,id,send,frame}) {
  const panel=document.createElement('details');panel.className='twitch-panel';panel.hidden=true;
  panel.innerHTML='<summary>Twitch観客参加</summary><div class="twitch-body"><p class="twitch-description"></p><div class="twitch-choices"></div><p class="twitch-feedback" role="status"></p><div class="twitch-actions"><button class="twitch-connect">自分のTwitchと連携</button><button class="twitch-vote">20秒のチャット投票を開始</button><button class="twitch-disconnect secondary">連携解除</button></div><small>チャットで 1 / 2 / 3。1人1票・変更OK。同票は抽選。参加費・サブスク不要。</small></div>';
  const $=s=>panel.querySelector(s),summary=$('summary'),description=$('.twitch-description'),choices=$('.twitch-choices'),feedback=$('.twitch-feedback'),connect=$('.twitch-connect'),vote=$('.twitch-vote'),disconnect=$('.twitch-disconnect');
  let popup,lastRoom='',phase='',busy=false,data=null;const delivered=new Set();
  async function post(path,body){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'通信に失敗しました');return result;}
  connect.onclick=()=>{
    popup=window.open('about:blank','gg-twitch-authorization','popup,width=650,height=780');
    if(!popup){feedback.textContent='Twitch連携用のポップアップを許可してください';return;}
    popup.document.title='Twitch連携';popup.document.body.textContent='Twitchの認可画面を開いています…';
    feedback.textContent='開いた画面で、自分の配信アカウントを認可してください';send({type:'twitch-ticket'});
  };
  async function onMessage(message){
    if(message.type!=='twitch-ticket')return;
    try{if(!message.ticket)throw Error('公開サーバーの固定部屋で、管理役が連携できます');const result=await post('/auth/twitch/start',{ticket:message.ticket});if(popup&&!popup.closed)popup.location.href=result.url;}
    catch(error){popup?.close();feedback.textContent=error.message;}
  }
  vote.onclick=async()=>{vote.disabled=true;try{await post('/api/twitch/vote',{room:getState().code});feedback.textContent='投票開始！ 配信画面で選択肢を観客に見せてください';}catch(error){feedback.textContent=error.message;}finally{poll();}};
  disconnect.onclick=async()=>{try{await post('/api/twitch/disconnect',{room:getState().code});feedback.textContent='この部屋のTwitch連携を解除しました';}catch(error){feedback.textContent=error.message;}poll();};
  function render(){
    const state=getState();if(!state||state.kind!=='private'){panel.hidden=true;return;}
    const active=state.phase!=='waiting',owner=state.owner===id;
    if(lastRoom!==state.code){lastRoom=state.code;data=null;feedback.textContent='';}
    if(phase!==state.phase){phase=state.phase;panel.open=!active;}
    const host=active?document.getElementById('match'):document.getElementById('room');if(panel.parentNode!==host)host.prepend(panel);
    panel.classList.toggle('twitch-in-match',active);panel.hidden=!owner&&!data?.linked;
    const names={connecting:'接続中',connected:'接続済み',reconnecting:'再接続中',reauthorize:'再認可が必要'};
    const recentResult=data?.result&&Date.now()-data.result.at<10000?data.result:null;
    summary.textContent=data?.poll?`Twitch投票 あと${data.poll.remaining}秒 · ${data.poll.counts.map((n,i)=>`${i+1}: ${n}票`).join(' / ')}`:recentResult?`Twitch観客：${recentResult.label}`:data?.linked?`Twitch · ${data.channel} · ${names[data.connection]||'確認中'}`:'Twitch観客参加';
    description.textContent=data?.linked?`${data.channel} のチャットで投票。冒険中に配信者が投票を開始できます。`:data?.enabled?'どの配信者でも、自分のTwitchアカウントでこの部屋に観客を招けます。':'Twitch連携は公開サーバーで管理者がアプリ設定をすると利用できます。';
    choices.replaceChildren(...(data?.choices||[]).map((choice,i)=>{const line=document.createElement('p');line.textContent=`${i+1}  ${choice.label}${data.poll?' — '+data.poll.counts[i]+'票':''}`;return line;}));
    connect.hidden=!owner||active||!data?.enabled||(data.linked&&data.connection!=='reauthorize');
    vote.hidden=!data?.canControl;vote.disabled=state.phase!=='playing'||data?.connection!=='connected'||!!data?.poll||data?.cooldown>0;vote.textContent=data?.cooldown>0&&!data?.poll?`次の投票まで ${data.cooldown} 秒`:'20秒のチャット投票を開始';
    disconnect.hidden=!data?.canControl;
    const effect=data?.result;
    if(state.hero===id&&state.phase==='playing'&&effect?.kind&&effect.round===state.round&&!delivered.has(effect.id)&&Date.now()-effect.at<10000){
      frame.contentWindow?.postMessage({type:'twitch-effect',effect},location.origin);delivered.add(effect.id);if(delivered.size>100)delivered.delete(delivered.values().next().value);
    }
  }
  async function poll(){if(busy)return;const state=getState();if(!state||state.kind!=='private'){render();return;}busy=true;const room=state.code;try{const response=await fetch('/api/twitch/status?room='+encodeURIComponent(room));if(response.ok){const result=await response.json();if(getState()?.code===room){if(lastRoom!==room){lastRoom=room;feedback.textContent='';}data=result;}}}catch{}finally{busy=false;render();}}
  setInterval(poll,1000);return {render,onMessage};
}
