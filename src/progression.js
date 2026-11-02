export const EVOLUTIONS=[
 {id:'goblin',name:'ゴブリン',xp:0,hp:6,damage:1,height:.8,speed:1.6,abilities:{burrows:true,climb:true},model:'/models/viewer-goblin.glb'},
 {id:'hob',name:'ホブゴブリン',xp:30,hp:10,damage:2,height:1.05,speed:1.5,abilities:{burrows:false,climb:true},model:'/models/hob-goblin.glb'},
 {id:'king',name:'ゴブリン・キング',xp:90,hp:16,damage:3,height:1.25,speed:1.3,abilities:{burrows:false,climb:false},model:'/models/goblin-king.glb'},
 {id:'lord',name:'ゴブリン・ロード',xp:180,hp:22,damage:5,height:1.55,speed:1.15,abilities:{burrows:false,climb:false},model:'/models/goblin-lord.glb'}
];
export const REWARDS=[
 {id:'rookie',name:'巣の新入り',test:()=>true,color:'#ed9b47'},
 {id:'training',name:'鍛錬好き',test:p=>p.training>=5,color:'#84b489'},
 {id:'hunter',name:'同族狩り',test:p=>p.kills>=3,color:'#cc8190'},
 {id:'worker',name:'穴掘り名人',test:p=>p.jobs>=3,color:'#78b7c4'},
 {id:'veteran',name:'巣の古参',test:p=>p.xp>=100,color:'#e0c16d'},
 {id:'lord',name:'暗黒騎士への道',test:p=>p.maxStage>=3,color:'#b59cda'}
];
export const newRoundProgress=()=>({xp:0,stage:0,careerEarned:0,trainingProgress:0,trainingRest:0,victims:{},creditedJobs:[],finished:false});
export const newCareer=name=>({version:1,name,xp:0,training:0,kills:0,jobs:0,maxStage:0,matches:0,decoration:'rookie'});
export function normalizeCareer(value,name){const p=newCareer(name);for(const k of ['xp','training','kills','jobs','maxStage','matches'])if(Number.isFinite(value?.[k]))p[k]=Math.max(0,Math.floor(value[k]));p.maxStage=Math.min(3,p.maxStage);if(REWARDS.some(r=>r.id===value?.decoration&&r.test(p)))p.decoration=value.decoration;return p;}
export const unlockedRewards=career=>REWARDS.filter(r=>r.test(career));
export function gainXP(round,career,amount,kind){
 if(!Number.isFinite(amount)||amount<=0)return 0;amount=Math.floor(amount);round.xp+=amount;
 const persistent=Math.min(amount,Math.max(0,60-round.careerEarned));career.xp+=persistent;round.careerEarned+=persistent;
 // Only credited active play advances permanent achievements, not capped farming.
 if(persistent>0&&['training','kills','jobs'].includes(kind))career[kind]++;
 return persistent;
}
export function evolve(round,career){const next=EVOLUTIONS[round.stage+1];if(!next||round.xp<next.xp)return false;round.stage++;career.maxStage=Math.max(career.maxStage,round.stage);return true;}
export function creditKill(round,career,victimId,time){if(time-(round.victims[victimId]??-Infinity)<60)return false;round.victims[victimId]=time;gainXP(round,career,18,'kills');return true;}
export function creditJob(round,career,jobId){if(round.creditedJobs.includes(jobId))return false;round.creditedJobs.push(jobId);gainXP(round,career,8,'jobs');return true;}
export function finishRound(round,career){if(round.finished)return false;round.finished=true;career.matches++;gainXP(round,career,10,'participation');return true;}
export function train(round,career,dt,active){if(!active){round.trainingProgress=0;round.trainingRest=Math.max(0,round.trainingRest-dt);return false;}if(round.trainingRest>0){round.trainingRest=Math.max(0,round.trainingRest-dt);return false;}round.trainingProgress+=dt;if(round.trainingProgress<4)return false;round.trainingProgress=0;round.trainingRest=2;gainXP(round,career,6,'training');return true;}
