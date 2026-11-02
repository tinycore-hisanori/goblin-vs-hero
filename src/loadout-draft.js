export const REROLL_WINDOW_MS=30000;
export function createLoadoutDraft(){
 let deadline=null,confirmed=false;
 return{
  start(now){if(confirmed)return false;if(deadline===null)deadline=now+REROLL_WINDOW_MS;return now<deadline;},
  canReroll(now){return !confirmed&&deadline!==null&&now<deadline;},
  secondsLeft(now){return deadline===null?30:Math.max(0,Math.ceil((deadline-now)/1000));},
  confirm(){confirmed=true;},
  isConfirmed(){return confirmed;},
  reset(){deadline=null;confirmed=false;}
 };
}
