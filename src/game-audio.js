import {createMusicPlayer} from './music.js';
import {t,onLanguageChange} from './locale.js';
import {createCombatSoundObserver} from './combat-sound.js';
import './game-audio.css';

export function mountGameAudio(parent,{hero=false,lobby=false}={}){
 const key='gg-sound-enabled';let enabled=true,context=null,master=null,noise=null,lastSound={};
 const managed=window.parent!==window&&(new URLSearchParams(location.search).has('partyHero')||new URLSearchParams(location.search).has('partyGuest'));
 let reportedScene=null;
 const music=managed?null:createMusicPlayer({createTrack:url=>{const media=new Audio(url);media.loop=true;media.preload='none';const source=context.createMediaElementSource(media),gain=context.createGain();source.connect(gain);gain.connect(master);return{play:()=>media.play(),pause:()=>media.pause(),fade(value,seconds){const now=context.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(value,now+seconds);},dispose(){media.pause();media.removeAttribute('src');media.load();source.disconnect();gain.disconnect();}};}});
 try{enabled=localStorage.getItem(key)!=='false';}catch{}
 const button=document.createElement('button');button.type='button';button.className='sound-toggle'+(hero?' hero-sound':lobby?' lobby-sound':'');button.setAttribute('aria-keyshortcuts','N');parent.append(button);
 function render(){button.textContent=t(enabled?'音 ON':'音 OFF');button.setAttribute('aria-label',t(enabled?'音をOFFにする（N）':'音をONにする（N）'));button.setAttribute('aria-pressed',String(enabled));button.title=t('N：音のON／OFF');if(master)master.gain.value=enabled&&!document.hidden?.38:0;music?.setEnabled(enabled);music?.setVisible(!document.hidden);}
 function unlock(){if(managed)window.parent.postMessage({type:'party-audio-unlock'},location.origin);if(!enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!context){context=new Audio();master=context.createGain();master.connect(context.destination);noise=context.createBuffer(1,Math.ceil(context.sampleRate*.2),context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;render();}if(context.state!=='running')context.resume().catch(()=>{});music?.unlock();}catch{}}
 function play(kind,volume=1){
  if(!enabled||document.hidden||context?.state!=='running')return;
  const now=context.currentTime;if(now-(lastSound[kind]??-Infinity)<.06)return;lastSound[kind]=now;
  const duration=kind==='hit'?.14:.1,gain=context.createGain(),filter=context.createBiquadFilter(),source=context.createBufferSource();
  source.buffer=noise;filter.type=kind==='hit'?'lowpass':'bandpass';filter.frequency.setValueAtTime(kind==='hit'?1100:1600,now);filter.frequency.exponentialRampToValueAtTime(kind==='hit'?180:400,now+duration);filter.Q.value=.7;
  gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(volume*(kind==='hit'?.8:.35),now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(master);source.start(now);source.stop(now+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  if(kind==='hit'){const thud=context.createOscillator(),body=context.createGain();thud.frequency.setValueAtTime(130,now);thud.frequency.exponentialRampToValueAtTime(45,now+.12);body.gain.setValueAtTime(volume*.45,now);body.gain.exponentialRampToValueAtTime(.001,now+.13);thud.connect(body);body.connect(master);thud.start(now);thud.stop(now+.14);thud.onended=()=>{thud.disconnect();body.disconnect();};}
 }
 function toggle(){enabled=!enabled;try{localStorage.setItem(key,String(enabled));}catch{}render();unlock();}
 button.addEventListener('click',toggle);
 function keydown(event){if(event.code==='KeyN'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();toggle();}else unlock();}
 function storage(event){if(event.key===key){enabled=event.newValue!=='false';render();}}
 document.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',keydown);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',render);onLanguageChange(render);render();
 window.addEventListener('pagehide',()=>music?.setVisible(false));window.addEventListener('pageshow',render);
 return {observe:createCombatSoundObserver(play),button,unlock,setMusic(scene){if(managed){if(scene!==reportedScene){reportedScene=scene;window.parent.postMessage({type:'party-music',scene},location.origin);}}else music.setScene(scene);}};
}
