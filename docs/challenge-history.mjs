import {recentDays} from './daily-core.mjs';
import {recordStars} from './puzzle-core.mjs';
export function challengeHistory(today,progress={},vault={slots:{}}){
 return recentDays(today).reverse().map(date=>{
  const record=progress?.daily?.[date],slot=vault?.slots?.['daily-'+date],run=slot?.state;
  const completed=record?.won===true,active=run?.status==='playing'&&run.turns?.length>0;
  const status=active?'active':completed?'complete':run?.status==='lost'||record?.won===false?'retry':'new';
  return {date,href:'#challenge?daily='+date,status,completed,stars:completed?recordStars(record,3):0,moves:active?run.moves:null,score:Number.isFinite(record?.score)&&record.score>=0?Math.floor(record.score):null,savedWin:run?.status==='won'};
 });
}
export function dailyAction(entry){if(entry.status==='active')return '오늘 도전 이어하기 →';if(entry.savedWin)return '오늘 통과 결과 보기 →';return entry.completed?'오늘 도전 다시 즐기기 →':'오늘의 퍼즐 바로 하기 →';}
