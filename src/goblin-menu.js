import {createLanguageControl} from './i18n.js';
// Secondary actions live in one drawer, leaving the play surface unobstructed.
export function mountGoblinMenu({clearInput,focusGame,resumeDirect,onAttackTarget}) {
 const $=id=>document.getElementById(id),drawer=document.querySelector('aside'),surface=document.querySelector('.map-panel');
 drawer.id='goblin-menu';drawer.setAttribute('role','dialog');drawer.setAttribute('aria-label','ゴブリンのメニュー');drawer.setAttribute('aria-modal','true');
 const heading=document.createElement('div');heading.className='menu-heading';heading.innerHTML='<b>ゴブリンのメニュー</b><button id="menu-close">閉じる ×</button>';drawer.prepend(heading);
 const toggle=document.createElement('button');toggle.id='menu-toggle';toggle.textContent='メニュー';toggle.setAttribute('aria-controls','goblin-menu');toggle.setAttribute('aria-expanded','false');$('goblin-world').append(toggle);
 const nav=$('goblin-nav');heading.after(nav);nav.querySelector('[data-mobile-panel="map"]').textContent='戻る';
 const settingsTab=document.createElement('button');settingsTab.dataset.mobilePanel='settings';settingsTab.textContent='設定';settingsTab.setAttribute('aria-pressed','false');nav.append(settingsTab);settingsTab.onclick=()=>show('settings');
 const settings=document.createElement('section');settings.dataset.panel='settings';settings.innerHTML='<h2>操作と視点</h2><p>画面をドラッグすると視点を回せます。PC：WASD／矢印で移動、左クリックで攻撃、Spaceでジャンプ、Shiftでスニーク、移動キー2回でダッシュ。Eで食べる、2で投石、Fで同族殺しON／OFF、Vで視点変更、Mで地図、Tabでメニュー、Gで進化画面。クリックでカーソル固定、Escで解除。固定できない場合は右ドラッグで視点変更。</p>';
 // Keep one camera button on the field; detailed controls belong in settings.
 $('goblin-world').append($('camera-preset'));
 settings.prepend(createLanguageControl());settings.append($('control-mode'),$('camera-controls'),$('connection'));drawer.append(settings);
 const tactics=drawer.querySelector('[data-panel="tactics"]');tactics.querySelector('.section-title').after($('rest-button'));
 const target=document.createElement('button');target.id='friendly-fire-toggle';target.type='button';target.setAttribute('aria-pressed','false');target.title='F：同族への攻撃を許可／禁止（勇者への攻撃は常に有効）';$('goblin-world').append(target);
 target.onclick=()=>setTarget(target.getAttribute('aria-pressed')!=='true');
 const resume=document.createElement('button');resume.id='resume-direct';resume.textContent='直接操作に戻る';$('goblin-world').append(resume);resume.onclick=()=>{resumeDirect();show('map');};
 $('world-map-toggle').textContent='地図';
 toggle.onclick=()=>show(toggle.classList.contains('evolution-ready')?'growth':'tactics');$('menu-close').onclick=()=>show('map');
 function setTarget(friendly,notify=true){target.textContent=`同族殺し ${friendly?'ON':'OFF'} · F`;target.setAttribute('aria-pressed',String(friendly));document.querySelector('.touch-hero').setAttribute('aria-label',friendly?'攻撃（同族殺しON）':'攻撃（同族殺しOFF）');if(notify)onAttackTarget(friendly);}
 setTarget(false,false);
 function show(panel){
  const opened=panel!=='map';clearInput();document.body.dataset.mobilePanel=panel;toggle.setAttribute('aria-expanded',String(opened));
  surface.inert=opened;document.getElementById('touch-hud').inert=opened;
  nav.querySelectorAll('[data-mobile-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mobilePanel===panel)));
  if(opened)$('menu-close').focus();else focusGame();
 }
 document.addEventListener('keydown',e=>{
  if(document.body.dataset.mobilePanel==='map')return;
  if(e.code==='Escape'){e.preventDefault();show('map');}
  if(e.code==='Tab'){
   const all=[...drawer.querySelectorAll('button,input,select,[tabindex]')].filter(el=>!el.disabled&&el.getClientRects().length),first=all[0],last=all.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 });
 return{show,setTarget};
}
