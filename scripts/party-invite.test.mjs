import test from 'node:test';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
import {invitationAddresses,invitationURL,invitationQR} from '../src/party-invite.js';
test('local invitations use LAN address and preserve six-digit code including leading zeros',()=>{const list=invitationAddresses({addresses:[{interface:'Ethernet',url:'http://192.168.1.15:5173/goblin.html'},{interface:'VPN',url:'http://10.0.0.2:5173/goblin.html'}]},'http://127.0.0.1:5173');assert.equal(invitationURL(list[0].url,'012345'),'http://192.168.1.15:5173/party.html?room=012345');assert.throws(()=>invitationURL(list[0].url,'12'));assert.equal(invitationAddresses(null,'http://localhost:5173').length,0);assert.equal(invitationAddresses(null,'http://192.168.1.15:5173')[0].url,'http://192.168.1.15:5173/party.html');assert.equal(invitationAddresses({addresses:list},'http://10.0.0.2:5173')[0].url,'http://10.0.0.2:5173/party.html');});
test('generated QR decodes to exact LAN URL and room parameter',async()=>{const url=invitationURL('http://192.168.1.15:5173','012345'),data=await invitationQR(url),png=PNG.sync.read(Buffer.from(data.split(',')[1],'base64')),decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);assert(decoded);assert.equal(decoded.data,url);});
