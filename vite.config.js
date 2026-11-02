import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {partyRelayPlugin} from './server/party-relay.js';
const {version}=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
// Build identifier is fixed into each release, so a stale page shows its actual loaded build.
const buildId=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,19).replace(/[-:]/g,'').replace('T','-');
export default defineConfig({define:{__GAME_VERSION__:JSON.stringify(version),__GAME_BUILD__:JSON.stringify(buildId)},plugins:[partyRelayPlugin()],server:{host:'0.0.0.0',port:5173,strictPort:true},preview:{host:'0.0.0.0',port:4173,strictPort:true},build:{rollupOptions:{input:{party:fileURLToPath(new URL('./party.html',import.meta.url)),game:fileURLToPath(new URL('./index.html',import.meta.url)),goblin:fileURLToPath(new URL('./goblin.html',import.meta.url)),character:fileURLToPath(new URL('./character-preview.html',import.meta.url)),nest:fileURLToPath(new URL('./nest-preview.html',import.meta.url))}}}});
