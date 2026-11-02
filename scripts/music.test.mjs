import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicPlayer,musicScene} from '../src/music.js';
const settle=()=>new Promise(r=>setImmediate(r));
function fixture(){const tracks=[],timers=new Map();let serial=0;const player=createMusicPlayer({createTrack(url){const track={url,playing:false,plays:0,play(){this.plays++;this.playing=true;return Promise.resolve();},pause(){this.playing=false;},fade(value){this.volume=value;},dispose(){this.disposed=true;}};tracks.push(track);return track;},schedule(fn){timers.set(++serial,fn);return serial;},cancel(id){timers.delete(id);}});return{player,tracks,finishFade(){for(const fn of timers.values())fn();timers.clear();}};}
test('music follows preparation, exploration, treasure escape, finish and rematch',()=>{
 assert.equal(musicScene(),'lobby');assert.equal(musicScene({started:true}),'dungeon');assert.equal(musicScene({started:true,collected:true}),'escape');assert.equal(musicScene({started:true,collected:true,ended:true}),'lobby');
});
test('music waits for interaction, crossfades once per transition, and stops retired tracks',async()=>{
 const f=fixture();f.player.setScene('dungeon');assert.equal(f.tracks.length,0);f.player.unlock();await settle();assert(f.tracks[0].playing);
 f.player.unlock();f.player.setScene('escape');await settle();assert.equal(f.tracks.length,2);assert(f.tracks[0].playing,'pointerdown unlock must not cut off the fading track');assert.equal(f.tracks[0].volume,0);assert.equal(f.tracks[1].volume,.28);f.finishFade();assert(!f.tracks[0].playing);assert(f.tracks[0].disposed);
 f.player.setScene('escape');assert.equal(f.tracks.length,2);f.player.setScene('lobby');await settle();assert.equal(f.tracks.length,3);f.player.dispose();assert(f.tracks.every(t=>!t.playing));
});
test('mute and hidden tabs pause playback; changes while muted resume only the latest scene',async()=>{
 const f=fixture();f.player.unlock();await settle();f.player.setEnabled(false);assert(!f.tracks[0].playing);f.player.setScene('dungeon');f.player.setScene('escape');assert.equal(f.tracks.length,1);
 f.player.setEnabled(true);await settle();assert.equal(f.tracks.at(-1).scene,'escape');f.player.setVisible(false);assert(f.tracks.every(t=>!t.playing));f.player.setVisible(true);await settle();assert(f.tracks.at(-1).playing);f.player.dispose();
});
test('late play promises cannot restart a muted or replaced track',async()=>{
 let resolve;const tracks=[],player=createMusicPlayer({createTrack(){const t={playing:false,fade(){},pause(){this.playing=false;},play(){this.playing=true;return new Promise(r=>resolve=r);}};tracks.push(t);return t;}});
 player.unlock();await settle();player.setEnabled(false);resolve();await settle();assert(!tracks[0].playing);player.dispose();
});
