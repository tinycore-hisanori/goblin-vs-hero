import './round-end.css';

export function mountRoundEnd(parent,{choose,leave=()=>{},solo=false}){
 const panel=document.createElement('section');panel.className='round-end';panel.hidden=true;panel.setAttribute('aria-label','ラウンド終了');
 panel.innerHTML=`<div class="round-end-card"><small>ADVENTURE COMPLETE</small><h2 tabindex="-1"></h2><p class="round-end-info"></p><p class="round-end-reward"></p><div class="round-end-choices">${solo?'<button data-result-action="same"><b>もう一度探索する</b><span>装備を引き直して、新しい巣に挑戦できます。</span></button><button data-result-action="title"><b>タイトルに戻る</b><span>ソロプレイを終了します</span></button>':'<button data-result-action="same"><b>同じメンバーで遊ぶ</b><span>部屋とメンバーを維持して、次のラウンドへ</span></button><button data-result-action="new"><b>新たに部屋を作って待機</b><span>ゴブリンのメンバーを全員入れ替える場合はこちら</span></button><button data-result-action="title"><b>タイトルに戻る</b><span>この部屋を終了します</span></button>'}</div>${solo?'':'<div class="round-end-wait"><p>勇者が次の遊び方を選んでいます。</p><button class="round-end-leave">タイトルに戻る</button></div>'}<p class="round-end-status" role="status"></p></div>`;
 parent.append(panel);let key=null;
 const buttons=[...panel.querySelectorAll('[data-result-action]')];
 function busy(value,message=''){buttons.forEach(b=>b.disabled=value);panel.querySelector('.round-end-status').textContent=message;}
 buttons.forEach(b=>b.onclick=()=>{busy(true,'切り替えています…');choose(b.dataset.resultAction);});const leaveButton=panel.querySelector('.round-end-leave');if(leaveButton)leaveButton.onclick=leave;
 function render({visible=false,roundKey='',result='',info='',reward='',canChoose=false,closed=false}={}){
  const fresh=panel.hidden||key!==roundKey;panel.hidden=!visible;if(!visible){key=null;return;}key=roundKey;
  panel.querySelector('h2').textContent=result;panel.querySelector('.round-end-info').textContent=info;panel.querySelector('.round-end-reward').textContent=reward;
  panel.querySelector('.round-end-choices').hidden=!canChoose;const waiting=panel.querySelector('.round-end-wait');if(waiting)waiting.hidden=canChoose;
  if(waiting)waiting.querySelector('p').textContent=closed?'この部屋での冒険は終了しました。':'勇者が次の遊び方を選んでいます。同じメンバーで続ける場合は、このままお待ちください。';
  if(fresh){busy(false);panel.querySelector('h2').focus();}
 }
 return{render,busy};
}
