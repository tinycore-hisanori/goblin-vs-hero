function socketURL(){return `${location.protocol==='https:'?'wss':'ws'}://${location.host}/party`;}
export function hostChannel(onRoom,onStatus){
 const ws=new WebSocket(socketURL()),channel={onmessage:null,postMessage(data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));},close(){ws.close();}};
 ws.onopen=()=>ws.send(JSON.stringify({type:'create-room'}));ws.onmessage=e=>{let data;try{data=JSON.parse(e.data);}catch{return;}if(data.type==='room-created')onRoom(data.room);else if(data.type==='connection-error')onStatus?.(data.message);else channel.onmessage?.({data});};ws.onerror=()=>onStatus?.('LAN接続サーバーに接続できません。npm run devで起動してください');ws.onclose=()=>onStatus?.('部屋の接続が終了しました。勇者画面を再読み込みしてください');return channel;
}
export function guestChannel(room,onStatus){
 let ws=null,join=null,stopped=false,timer=null,retry=500;const channel={onmessage:null,isOpen:()=>ws?.readyState===WebSocket.OPEN,postMessage(data){if(data.type==='join')join={...data,room};if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({...data,room}));},close(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);ws?.close();}};
 function connect(){if(stopped)return;clearTimeout(timer);const previous=ws,socket=new WebSocket(socketURL());ws=socket;previous?.close();socket.onopen=()=>{if(ws!==socket)return;retry=500;onStatus?.('接続を復元しました。参加状態を確認中…');if(join)socket.send(JSON.stringify(join));};socket.onmessage=e=>{if(ws!==socket)return;let data;try{data=JSON.parse(e.data);}catch{return;}if(['connection-error','room-closed'].includes(data.type)){stopped=true;onStatus?.(data.message);socket.close();}if(data.type==='room-joined')onStatus?.(`部屋 ${data.room} に接続しました`);channel.onmessage?.({data});};socket.onerror=()=>{};socket.onclose=event=>{if(event.code===1000&&['left lobby','reconnected'].includes(event.reason))stopped=true;if(ws!==socket||stopped)return;onStatus?.('一時切断。参加状態を保ったまま自動再接続しています…');timer=setTimeout(connect,retry);retry=Math.min(5000,retry*2);};}
 function resume(){if(!document.hidden&&!stopped)connect();}
 document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);connect();return channel;
}
export {localDeviceId} from './device-identity.js';
