import {readScore,SCORE_KEY} from './score-saves.mjs';
import {journeyCatalog} from './journey-data.mjs';
import {journeyMapState} from './journey-catalog.mjs';
import {readJourney,JOURNEY_KEY} from './journey-saves.mjs';
import {readAvatar,AVATAR_KEY} from './avatar-store.mjs';
import {avatarBalance} from './avatar-core.mjs';

// Navigation summaries only read validated saves. No initialization or migration.
function refresh(){
 const journey=readJourney(),avatar=readAvatar(),progress=journey.value;
 const map=journeyMapState(journeyCatalog,progress),id=map.current;
 const slot=progress.slots[id],active=slot?.state.status==='playing'&&slot.state.turns.length>0;
 const completed=Object.keys(progress.records).length;
 const stars=Object.values(progress.records).reduce((sum,r)=>sum+r.stars,0);
 const label=map.complete?'마지막 스테이지 다시 즐기기':active?`스테이지 ${id} 이어하기`:`스테이지 ${id} 시작`;
 const summary=journey.writable?`${map.chapter.name} · ${completed}/${journeyCatalog.levels.length} 스테이지 클리어`:'저장 기록을 읽지 못했어요. 기존 데이터는 그대로 두고 새 판을 열어요.';
 for(const a of document.querySelectorAll('[data-menu-journey-action]')){
  a.href='#challenge?journey='+id;
  const nested=a.querySelector('[data-menu-journey-label]');
  if(nested)nested.textContent=label;else a.textContent=label+' →';
 }
 for(const el of document.querySelectorAll('[data-menu-journey-summary]'))el.textContent=summary;
 for(const el of document.querySelectorAll('[data-menu-progress]'))el.textContent=journey.writable?`${completed}개 클리어 · 별 ${stars}개 · 현재 스테이지 ${id}`:'저장 기록을 확인해 주세요.';
 for(const el of document.querySelectorAll('[data-menu-outfit-summary]'))el.textContent=avatar.writable?`보유 의상 ${avatar.value.owned.length}개 · ${avatarBalance(avatar.value).toLocaleString('ko-KR')} P`:'저장 기록을 확인해 주세요.';
 const score=readScore(),run=score.value.run?.state;
 const playing=run?.status==='playing'&&run.turns.length>0,finished=run?.status==='won';
 for(const a of document.querySelectorAll('[data-menu-score-action]'))a.href='#challenge?mode=score'+(finished?'&round=new':'');
 for(const el of document.querySelectorAll('[data-menu-score-label]'))el.textContent=!score.writable?'랜덤 한 판 열기 →':playing?'랜덤 판 이어하기 →':finished?'새 랜덤 판 시작 →':'랜덤 한 판 시작 →';
 const scoreSummary=!score.writable?'저장 기록을 읽지 못했어요. 저장 상태를 확인해 주세요.':playing?'남은 '+run.moves+'수 · 내 최고 '+score.value.best.toLocaleString('ko-KR')+'점':finished?'지난 판 '+run.score.toLocaleString('ko-KR')+'점 · 내 최고 '+score.value.best.toLocaleString('ko-KR')+'점':score.value.best?'내 최고 '+score.value.best.toLocaleString('ko-KR')+'점':'끝나면 다음 랜덤 판으로 계속';
 for(const el of document.querySelectorAll('[data-menu-score-summary]'))el.textContent=scoreSummary;
 const rewarded=Object.hasOwn(avatar.value.claims,'journey:'+id);
 const reward=document.querySelector('[data-menu-reward]'),copy=document.querySelector('[data-menu-reward-copy]');
 if(!avatar.writable||!journey.writable){reward.textContent='꾸미기 포인트';copy.textContent='저장 상태는 꾸미기 화면에서 확인해 주세요.';}
 else if(rewarded){reward.textContent=`지금 쓸 수 있는 ${avatarBalance(avatar.value).toLocaleString('ko-KR')} P`;copy.textContent='받은 보상으로 다음 코디를 골라보세요. 같은 스테이지 보상은 한 번만 받아요.';}
 else{reward.textContent=`스테이지 ${id} 첫 클리어 +80 P`;copy.textContent='게임을 깨고, 모은 포인트로 새 옷을 골라요. 같은 스테이지 보상은 한 번만 받아요.';}
 if(location.hash.startsWith('#avatar?')&&new URLSearchParams(location.hash.split('?')[1]).get('view')==='reference')document.getElementById('avatar-reference-menu').open=true;
}
window.addEventListener('hashchange',refresh);
window.addEventListener('teum-avatar-changed',refresh);
window.addEventListener('teum-run-saved',refresh);
window.addEventListener('storage',e=>{if(e.key===null||e.key===JOURNEY_KEY||e.key===AVATAR_KEY||e.key===SCORE_KEY)refresh();});
refresh();
