export function createTwitchEffects({active,noise,goblins,maxHp,notice,darken,now=Date.now}) {
  const seen=new Set();let darkUntil=0,noticeUntil=0,noticeText='',lastSeconds=0;
  function announce(text,duration){noticeText=text;noticeUntil=now()+duration;lastSeconds=Math.ceil(duration/1000);notice(text,lastSeconds);}
  function clearNotice(){if(noticeText){noticeText='';noticeUntil=0;lastSeconds=0;notice('',0);}}
  return {
    apply(effect){
      if(!active()||!effect?.id||seen.has(effect.id)||!['darkness','alarm','supplies'].includes(effect.kind))return false;
      seen.add(effect.id);if(seen.size>100)seen.delete(seen.values().next().value);
      if(effect.kind==='darkness'){darkUntil=now()+8000;darken(true);announce('Twitch観客のいたずら！ 暗闇',8000);}
      if(effect.kind==='alarm'){noise(24);announce('Twitch観客が鳴子を鳴らした！ 周囲のゴブリンに注意',4000);}
      if(effect.kind==='supplies'){for(const g of goblins())if(g.hp>0)g.hp=Math.min(maxHp(g),g.hp+2);announce('Twitch観客から差し入れ！ ゴブリンのHPが2回復',4000);}
      return true;
    },
    tick(){
      const playing=active(),time=now();
      if(darkUntil&&(!playing||time>=darkUntil)){darkUntil=0;darken(false);}
      if(noticeText){if(!playing||time>=noticeUntil)clearNotice();else{const seconds=Math.ceil((noticeUntil-time)/1000);if(seconds!==lastSeconds){lastSeconds=seconds;notice(noticeText,seconds);}}}
    },
    reset(){if(darkUntil){darkUntil=0;darken(false);}clearNotice();}
  };
}

// The filter affects the rendered world, including its center. HUD and menus stay readable.
// A dedicated toast cannot overwrite or later clear combat/objective notifications.
export function mountTwitchPresentation(canvas,doc=globalThis.document){
  const toast=doc.createElement('div');toast.id='twitch-event-toast';toast.hidden=true;toast.setAttribute('role','status');
  const message=doc.createElement('span'),countdown=doc.createElement('strong');countdown.setAttribute('aria-hidden','true');toast.append(message,countdown);doc.body.append(toast);
  return {
    darken(value){canvas.classList.toggle('twitch-darkened',value);},
    notice(text,seconds){toast.hidden=!text;if(message.textContent!==text)message.textContent=text;countdown.textContent=text?`残り ${seconds} 秒`:'';}
  };
}
