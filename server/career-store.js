import {readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../data/',import.meta.url)),file=directory+'goblin-careers.json';let entries={};try{entries=JSON.parse(readFileSync(file,'utf8'));}catch{}let pending=null;
export const getCareer=id=>entries[id];
export function putCareer(id,career){if(!/^[a-f0-9]{24}$/.test(id)||!career||typeof career!=='object'||JSON.stringify(entries[id])===JSON.stringify(career))return;entries[id]=career;if(!pending){pending=setTimeout(()=>{pending=null;try{mkdirSync(directory,{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(entries));renameSync(file+'.tmp',file);}catch(e){console.error('Failed to save goblin career:',e.message);}},400);pending.unref();}}
