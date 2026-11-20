import {pieces,applyMove,configFor} from './puzzle-core.mjs';

const missionTips={
 lightning:'같은 색 4개를 가로나 세로로 이어 번개를 만들어보세요.',
 bomb:'같은 색을 T자나 L자로 이어 폭탄을 만들어보세요.',
 rainbow:'같은 색 5개를 한 줄로 이어 무지개를 만들어보세요.',
 activate:'번개·폭탄·무지개를 옆 조각과 바꿔 발동해보세요.',
 combine:'특수 조각 두 개를 서로 이웃하게 만든 뒤 바꿔보세요.'
};

// Presentation only: read the same goals as the engine, without changing a run.
export function puzzleObjectives(state,config=configFor(state)) {
 if(state.mode==='score')return [];
 const goals=[{id:'collection',label:pieces[config.color].name+' 수집',count:state.collected,total:config.target,unit:'개'}];
 if(config.ice.length)goals.push({id:'ice',label:'얼음 깨기',count:state.cleared,total:config.ice.length,unit:'개'});
 if(config.mission)goals.push({id:'mission',label:config.mission.label,count:state.missionCount??0,total:config.mission.target,unit:'회'});
 return goals.map(goal=>({...goal,count:Math.min(goal.count,goal.total),remaining:Math.max(0,goal.total-goal.count),complete:goal.count>=goal.total}));
}

export function retryAdvice(state,config=configFor(state)) {
 const remaining=puzzleObjectives(state,config).filter(goal=>!goal.complete);
 if(!remaining.length)return '모든 목표를 달성했어요.';
 if(remaining.some(goal=>goal.id==='mission'))return missionTips[config.mission.kind];
 if(remaining.some(goal=>goal.id==='ice'))return '얼음이 남은 자리에서 매치하거나, 그 자리를 지나는 번개를 터뜨려보세요.';
 return pieces[config.color].name+' 조각을 직접 맞추거나 무지개와 바꿔 같은 색을 모아보세요.';
}

export function objectiveHint(state,suggestion) {
 if(!suggestion)return '새 판으로 다시 시작해 주세요.';
 if(state.mode==='score')return '힌트: 점선 두 조각을 바꾸면 점수를 얻을 수 있어요.';
 const config=configFor(state);
 if(config.mission&&state.missionCount<config.mission.target){
  const turn=applyMove(state,...suggestion.pair);
  if(turn.state.missionCount>state.missionCount)return '힌트: 점선 두 조각을 바꾸면 이 수의 연쇄에서 “'+config.mission.label+'” 목표를 늘릴 수 있어요.';
 }
 if(suggestion.ice)return '힌트: 점선 두 조각을 바꾸면 얼음을 깰 수 있어요.';
 if(suggestion.collected)return '힌트: 점선 두 조각을 바꾸면 목표 조각을 모을 수 있어요.';
 if(suggestion.specials)return '힌트: 이 수로 특수 조각을 만들어보세요.';
 return '힌트: 점선 두 조각을 바꿔 다음 배치를 열어봐요.';
}

export function createObjectiveFeedback(section) {
 const roots={collection:section.querySelector('#puzzle-collection-goal'),ice:section.querySelector('#puzzle-ice-wrap'),mission:section.querySelector('#puzzle-mission')};
 const moves=section.querySelector('#puzzle-moves').parentElement;
 const note=section.querySelector('#puzzle-turn-note');
 const summary=section.querySelector('#puzzle-result-objectives');
 const list=summary.querySelector('ul'),advice=summary.querySelector('p');
 let previous=new Map();
 for(const root of [...Object.values(roots),moves])root.addEventListener('animationend',()=>root.classList.remove('objective-arrived'));
 function reset(){previous.clear();for(const root of [...Object.values(roots),moves]){root.removeAttribute('data-complete');root.removeAttribute('data-low-moves');root.classList.remove('objective-arrived');}note.hidden=true;}
 function update(snapshot,config,{animate=false,mode,status,moves:remainingMoves}={}) {
  const goals=puzzleObjectives({...snapshot,mode},config);
  for(const [id,root]of Object.entries(roots)){
   const goal=goals.find(goal=>goal.id===id);
   root.toggleAttribute('data-complete',!!goal?.complete);
   if(!goal?.complete)root.classList.remove('objective-arrived');
   else if(animate&&previous.get(id)===false)root.classList.add('objective-arrived');
  }
  previous=new Map(goals.map(goal=>[goal.id,goal.complete]));
  const low=status==='playing'&&remainingMoves>=1&&remainingMoves<=3;
  moves.toggleAttribute('data-low-moves',low);
  note.hidden=!low;
  if(low)note.textContent='남은 '+remainingMoves+'수 · 시간 제한 없이 천천히 골라요';
 }
 function result(state,config) {
  const goals=puzzleObjectives(state,config);
  summary.hidden=state.status==='playing'||!goals.length;
  if(summary.hidden){list.replaceChildren();return;}
  list.replaceChildren(...goals.map(goal=>{
   const item=document.createElement('li');item.dataset.complete=String(goal.complete);
   const label=document.createElement('span');label.textContent=goal.label+' '+goal.count+' / '+goal.total;
   const detail=document.createElement('strong');detail.textContent=goal.complete?'✓ 완료':goal.remaining+goal.unit+' 더';
   item.append(label,detail);return item;
  }));
  advice.textContent=retryAdvice(state,config);
 }
 window.addEventListener('hashchange',reset);
 return {update,result,reset};
}
