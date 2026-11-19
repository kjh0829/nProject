import {readScore} from './score-saves.mjs';
export function updateScoreChase(score,baseline,active) {
 const box=document.getElementById('score-chase');box.hidden=!active;
 if(!active)return;
 const copy=box.querySelector('span'),fill=box.querySelector('i');
 copy.textContent=baseline===0?'첫 최고 기록을 만드는 중':score>baseline?'시작 전 최고 기록보다 '+(score-baseline).toLocaleString('ko-KR')+'점 앞섰어요':score===baseline?'시작 전 최고 기록과 같아요!':'시작 전 최고 기록까지 '+(baseline-score).toLocaleString('ko-KR')+'점';
 fill.style.width=baseline?Math.min(100,score/baseline*100)+'%':'0%';
}
function render(){
 const saved=readScore();
 for(const box of document.querySelectorAll('[data-score-history]')){
  box.replaceChildren();
  const title=document.createElement('h3');title.textContent='최근 10판 점수';box.append(title);
  const note=document.createElement('p');note.className='score-history-note';note.textContent='같은 판의 재도전은 최고 점수를 표시해요. 오래된 기록부터 최근 순서입니다.';box.append(note);
  if(!saved.writable||!saved.value.history.length){const p=document.createElement('p');p.textContent=saved.writable?'20수를 마치면 점수 변화가 여기에 쌓여요.':'점수 기록을 읽지 못했어요.';box.append(p);continue;}
  const list=document.createElement('ol');list.className='score-history-bars';
  const history=[...saved.value.history].reverse(),max=Math.max(1,...history.map(h=>h.score));
  history.forEach((entry,index)=>{
   const item=document.createElement('li'),bar=document.createElement('i'),value=document.createElement('span'),label=document.createElement('small');
   bar.style.height=Math.max(3,entry.score/max*90)+'px';bar.setAttribute('aria-hidden','true');
   value.textContent=entry.score.toLocaleString('ko-KR');label.textContent=index===history.length-1?'최근':'이전 '+(history.length-index-1)+'판';
   item.append(value,bar,label);list.append(item);
  });box.append(list);
 }
}
window.addEventListener('hashchange',render);window.addEventListener('storage',render);window.addEventListener('teum-run-saved',render);render();
