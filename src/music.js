export const MUSIC_URLS={lobby:new URL('../assets/audio/bgm-lobby.mp3',import.meta.url).href,dungeon:new URL('../assets/audio/bgm-dungeon.mp3',import.meta.url).href,escape:new URL('../assets/audio/bgm-escape.mp3',import.meta.url).href};
export function musicScene({started=false,ended=false,collected=false}={}){return !started||ended?'lobby':collected?'escape':'dungeon';}
// One owner per page: the party parent owns music while game iframes report their scene.
export function createMusicPlayer({createTrack,schedule=setTimeout,cancel=clearTimeout}){
 let scene='lobby',enabled=true,visible=true,unlocked=false,current=null,disposed=false;
 const retiring=new Map();
 function remove(track){track.pause();track.dispose?.();}
 function clearRetiring(){for(const [track,timer]of retiring){cancel(timer);remove(track);}retiring.clear();}
 function play(track){Promise.resolve().then(()=>track.play()).then(()=>{if(disposed||(current!==track&&!retiring.has(track))||!enabled||!visible)track.pause();}).catch(()=>{});}
 function sync(){
  if(disposed)return;
  if(!unlocked||!enabled||!visible){current?.pause();clearRetiring();return;}
  if(current?.scene===scene){current.fade(.28,.35);play(current);return;}
  const old=current;current=createTrack(MUSIC_URLS[scene]);current.scene=scene;current.fade(0,0);play(current);current.fade(.28,.8);
  if(old){old.fade(0,.6);retiring.set(old,schedule(()=>{retiring.delete(old);remove(old);},650));}
 }
 return {setScene(value){if(!MUSIC_URLS[value]||scene===value)return;scene=value;sync();},setEnabled(value){if(enabled===value)return;enabled=value;sync();},setVisible(value){if(visible===value)return;visible=value;sync();},unlock(){unlocked=true;sync();},get scene(){return scene;},dispose(){disposed=true;clearRetiring();if(current)remove(current);current=null;}};
}
