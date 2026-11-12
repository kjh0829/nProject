export const dayKey=(date=new Date())=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
export function offsetDay(key,offset){return new Date(Date.parse(key+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10)}
export const recentDays=key=>Array.from({length:7},(_,i)=>offsetDay(key,i-6));
export const contentIndex=(key,length)=>((Math.floor(Date.parse(key+'T00:00:00Z')/86400000)%length)+length)%length;
export const completedCount=entry=>Number(!!entry?.read)+Number(Number.isInteger(entry?.quizChoice))+Number(!!entry?.done);
export function normalizeState(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!raw.days||typeof raw.days!=='object'||Array.isArray(raw.days))throw new Error('Invalid daily data');
  const days={};
  for(const key of Object.keys(raw.days).sort().slice(-90)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!Number.isFinite(Date.parse(key+'T00:00:00Z')))continue;
    const e=raw.days[key];if(!e||typeof e!=='object')continue;
    days[key]={read:e.read===true,done:e.done===true,note:typeof e.note==='string'?e.note.slice(0,300):'',gameBest:Number.isFinite(e.gameBest)&&e.gameBest>=0?Math.floor(e.gameBest):0};
    if(Number.isInteger(e.quizChoice)&&e.quizChoice>=0&&e.quizChoice<=2)days[key].quizChoice=e.quizChoice;
  }
  return {version:1,days};
}
