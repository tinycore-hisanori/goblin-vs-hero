import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSession} from '../src/local-session.js';
import {foodItems} from '../src/food.js';

test('solo session never opens a transport or accepts guests, while food and AI defeat/reset still work',t=>{
 const oldWindow=globalThis.window,oldSocket=globalThis.WebSocket,oldBroadcast=globalThis.BroadcastChannel;
 globalThis.window={};globalThis.WebSocket=globalThis.BroadcastChannel=class{constructor(){throw Error('Solo must not open a transport');}};
 t.after(()=>{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;globalThis.WebSocket=oldSocket;globalThis.BroadcastChannel=oldBroadcast;});
 const goblin={hp:3,root:{visible:true},route:[]};
 const session=new LocalSession({goblins:()=>[goblin],ended:()=>false,spawn(){throw Error('Solo must not accept guests');}},{networked:false});
 assert.equal(session.room,'');assert.equal(session.active,false);
 session.receive({type:'join',id:'a'.repeat(24),name:'Guest'});assert.equal(session.members.size,0);
 const food=foodItems[0],result=session.food.eat({x:food.x,z:food.z},145,150,'hero',food.id);
 assert.equal(result.hp,150);assert.equal(session.food.snapshot().length,1);
 session.defeated(goblin);assert.equal(goblin.hp,0);assert.equal(goblin.respawn,22);assert.equal(goblin.root.visible,true);
 session.snapshot();session.finish();session.reset();assert.equal(session.food.snapshot().length,0);session.channel.close();
});
