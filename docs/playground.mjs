import {readScore} from './score-saves.mjs';
import {dayKey} from './daily-core.mjs';
import {stages,recordStars} from './puzzle-core.mjs';
import {readRuns,continueRun} from './puzzle-saves.mjs';
import {challengeHistory,dailyAction} from './challenge-history.mjs';
const $=id=>document.getElementById(id);let renderedDay='';
function render(){const score=readScore();$('score-hub-record').textContent=!score.writable?'점수 기록을 읽지 못했어요.':score.value.run?.state.status==='playing'&&score.value.run.state.turns.length?'진행 중인 20수 판 · 남은 '+score.value.run.state.moves+'수 · 내 최고 '+score.value.best.toLocaleString('ko-KR')+'점':score.value.best?'내 최고 '+score.value.best.toLocaleString('ko-KR')+'점 · 새로운 판으로 다시 도전':'첫 점수 도전을 시작해 보세요.';let progress={stages:{}};try{const raw=JSON.parse(localStorage.getItem('teum-puzzle-progress-v1')||'null');if(raw?.version===1&&raw.stages&&typeof raw.stages==='object')progress=raw;}catch{}
 $('home-daily-start').href='#challenge?daily='+dayKey();$('home-continue').hidden=true;const vault=readRuns().vault,run=continueRun(vault),days=challengeHistory(dayKey(),progress,vault),today=days[0];renderedDay=dayKey();$('home-daily-start').textContent=dailyAction(today);$('home-daily-status').textContent=today.status==='active'?`오늘 진행 중 · ${today.moves}번 이동 남음`:today.completed?`오늘 통과 기록 · ${'★'.repeat(today.stars)}${'☆'.repeat(3-today.stars)} · 최고 ${today.score??0}점`:'한국 날짜별 공통 도전 · 내 속도로, 언제든 재도전';renderHistory(days);if(run){$('home-continue').hidden=false;$('home-continue').href=run.key.startsWith('daily-')?'#challenge?daily='+encodeURIComponent(run.key.slice(6)):'#challenge?stage='+run.state.stage;$('home-continue').textContent='진행 중인 판 이어하기 · 남은 '+run.state.moves+'회 →';}$('home-stage-list').replaceChildren(...stages.map(stage=>{const a=document.createElement('a');a.className='home-stage';a.href='#challenge?stage='+stage.id;const name=document.createElement('span');name.textContent=String(stage.id).padStart(2,'0')+' / '+stage.name;const marker=document.createElement('span');const record=progress.stages[stage.id],slot=vault.slots['stage-'+stage.id];const stars=record?recordStars(record,stage.id):0;marker.textContent=record?'★'.repeat(stars)+'☆'.repeat(3-stars):slot?.state.status==='playing'&&slot.state.turns.length?'이어하기 →':'시작 →';a.append(name,marker);return a;}));$('home-puzzle-progress').textContent=`내가 통과한 정거장 ${stages.filter(s=>progress.stages[s.id]).length} / 5 · 순서대로 하지 않아도 괜찮아요.`;
}
function renderHistory(days){
 $('challenge-history').replaceChildren(...days.map(entry=>{
  const a=document.createElement('a');a.className='history-day'+(entry.date===dayKey()?' today':'');a.href=entry.href;a.dataset.date=entry.date;a.dataset.status=entry.status;
  const date=document.createElement('strong');date.textContent=entry.date===dayKey()?'오늘':`${Number(entry.date.slice(5,7))}/${Number(entry.date.slice(8))}`;
  const weekday=document.createElement('span');weekday.textContent=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(entry.date+'T03:00:00Z'));
  const state=document.createElement('span');state.className=entry.completed?'history-stars':'history-state';state.textContent=entry.status==='active'?`이어하기 · ${entry.moves}회`:entry.completed?'★'.repeat(entry.stars)+'☆'.repeat(3-entry.stars):entry.status==='retry'?'다시 도전':'시작 →';
  a.setAttribute('aria-label',entry.date+' 퍼즐 · '+state.textContent);a.append(date,weekday,state);return a;
 }));
 $('challenge-history-summary').textContent=`최근 7일 도전 중 내 통과 기록 ${days.filter(d=>d.completed).length} / 7 · 진행과 기록은 이 기기에 저장돼요.`;
}
window.addEventListener('teum-progress',render);window.addEventListener('teum-run-saved',render);window.addEventListener('storage',render);window.addEventListener('hashchange',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});setInterval(()=>{if(dayKey()!==renderedDay)render();},60000);render();
