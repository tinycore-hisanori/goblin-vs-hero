import * as fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
export const PAYLOAD=['dist','server','deploy','package.json','package-lock.json','node_modules'];
export function validateArchive(names,listing){
 for(const name of names.split('\n').filter(Boolean)){const p=name.replace(/^\.\//,'');if(p.includes('\\')||p.startsWith('/')||p.split('/').includes('..')||!['dist','server','deploy','package.json','package-lock.json'].includes(p.split('/')[0]))throw Error('Unexpected archive entry: '+name);}
 for(const line of listing.split('\n').filter(Boolean))if(!['-','d'].includes(line[0]))throw Error('Links and special files are not accepted');
}
// The active directory stays stable, preserving runtime/, data/ and custom service settings.
export async function applyRelease({root,staged,backup,stop,start,probe,wasActive=true}){
 root=resolve(root);staged=resolve(staged);backup=resolve(backup);
 if(root===staged||root===backup||!backup.startsWith(root+'/backups/')&&!backup.startsWith(root+'\\backups\\'))throw Error('Invalid release directories');
 for(const name of PAYLOAD)if(!fs.existsSync(join(staged,name)))throw Error('Incomplete release: '+name);
 fs.mkdirSync(backup,{recursive:true,mode:0o700});const moved=[],installed=[];let stopped=false;
 try{await stop();stopped=true;
 if(fs.existsSync(join(root,'data')))fs.cpSync(join(root,'data'),join(backup,'data-snapshot'),{recursive:true});
 for(const name of PAYLOAD){if(fs.existsSync(join(root,name))){fs.renameSync(join(root,name),join(backup,name));moved.push(name);}fs.renameSync(join(staged,name),join(root,name));installed.push(name);}
 await start();await probe();
 }catch(error){if(stopped){try{await stop();const failed=join(backup,'failed-release');fs.mkdirSync(failed,{recursive:true});for(const name of installed.reverse())if(fs.existsSync(join(root,name)))fs.renameSync(join(root,name),join(failed,name));for(const name of moved.reverse())fs.renameSync(join(backup,name),join(root,name));if(wasActive)await start();if(wasActive)await probe();}catch(rollback){throw new AggregateError([error,rollback],'Update AND automatic rollback failed; inspect service logs. Backup: '+backup);}}
 throw error;
 }
}
function run(command,args,options={}){const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.error)throw r.error;if(r.status!==0)throw Error(command+' failed ('+r.status+')');return r.stdout?.toString().trim();}
async function health(port){let last;for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/healthz`,{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.text())==='ok')return;}catch(e){last=e;}await new Promise(r=>setTimeout(r,250));}throw Error('Health check failed: '+port+(last?' '+last.message:''));}
async function sparePort(){const s=createServer();await new Promise((ok,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',ok);});const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function stopCandidate(child){if(!child||child.exitCode!==null||child.signalCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>{const t=setTimeout(()=>{child.kill('SIGKILL');resolve();},7000);child.once('exit',()=>{clearTimeout(t);resolve();});});}
export async function main(archive){
 if(process.platform!=='linux'||process.getuid?.()!==0)throw Error('Run on the Linux server as root');
 const root='/opt/goblin-vs-hero',unit='goblin-vs-hero',runtime=join(root,'runtime/bin/node');
 if(!archive)throw Error('Usage: node update.mjs /opt/goblin-vs-hero-latest.tar.gz');archive=resolve(archive);
 if(!fs.statSync(archive).isFile()||!fs.existsSync(runtime))throw Error('Archive or dedicated Node runtime missing');
 if(run('systemctl',['show',unit,'-p','LoadState','--value'],{stdio:'pipe'})!=='loaded')throw Error('Initial installation is required first');
 if(run('systemctl',['show',unit,'-p','WorkingDirectory','--value'],{stdio:'pipe'})!==root||run('systemctl',['show',unit,'-p','User','--value'],{stdio:'pipe'})!=='goblin-game')throw Error('Service does not match this application');
 const lock=join(root,'.update-lock');try{fs.mkdirSync(lock);}catch{throw Error('Another update is running, or a previous update was interrupted. Inspect '+lock);}
 let child;try{
 fs.writeFileSync(join(lock,'pid'),String(process.pid));
 const digest=createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),marker=join(root,'.deployment-sha256');
 if(fs.existsSync(marker)&&fs.readFileSync(marker,'utf8').trim()===digest){console.log('This exact package is already installed. No restart.');return;}
 const names=run('tar',['-tzf',archive],{stdio:'pipe'}),listing=run('tar',['-tvzf',archive],{stdio:'pipe'});validateArchive(names,listing);
 const stage=fs.mkdtempSync('/opt/goblin-vs-hero-stage-');fs.chmodSync(stage,0o755);
 run('tar',['-xzf',archive,'--no-same-owner','--no-same-permissions','-C',stage]);
 for(const file of ['dist/party.html','dist/goblin.html','server/production.js','package.json','package-lock.json','deploy/smoke.mjs'])if(!fs.existsSync(join(stage,file)))throw Error('Package missing '+file);
 run('chown',['-R','goblin-game:goblin-game',stage]);
 const env={...process.env,PATH:dirname(runtime)+':'+process.env.PATH};
 console.log('Installing candidate dependencies; live game is still running.');
 run('runuser',['-u','goblin-game','--',join(root,'runtime/bin/npm'),'ci','--omit=dev','--ignore-scripts','--cache',join(root,'.npm-cache')],{cwd:stage,env});
 const port=await sparePort();console.log('Testing candidate on loopback port '+port);
 child=spawn('runuser',['-u','goblin-game','--',runtime,'server/production.js'],{cwd:stage,env:{...env,HOST:'127.0.0.1',PORT:String(port)},stdio:'inherit'});let spawnError;child.once('error',e=>spawnError=e);
 await health(port);if(spawnError)throw spawnError;run(runtime,[join(stage,'deploy/smoke.mjs'),`http://127.0.0.1:${port}`],{env});await stopCandidate(child);child=null;
 const wasActive=run('systemctl',['show',unit,'-p','ActiveState','--value'],{stdio:'pipe'})==='active';
 const backup=join(root,'backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+digest.slice(0,8));
 console.log('Candidate passed. Restarting the game; current rooms will end.');
 await applyRelease({root,staged:stage,backup,wasActive,stop:()=>run('systemctl',['stop',unit]),start:()=>run('systemctl',['start',unit]),probe:async()=>{await health(8788);run(runtime,[join(root,'deploy/smoke.mjs'),'http://127.0.0.1:8788'],{env});}});
 fs.writeFileSync(marker,digest+'\n');console.log('UPDATE OK. Backup: '+backup);console.log('data/, runtime/, nginx and systemd settings were preserved.');
 }finally{await stopCandidate(child);const checked=resolve(root,'.update-lock');if(lock!==checked)throw Error('Unexpected lock path');fs.rmSync(lock,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
