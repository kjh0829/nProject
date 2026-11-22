import {createObjectiveFeedback,objectiveHint} from './puzzle-objectives.mjs';
import {updateScoreChase} from './score-journal.mjs';
import {createPuzzleDrag} from './puzzle-drag.mjs';
import {createPuzzleGuide} from './puzzle-guide.mjs';
import {syncAvatarReward} from './avatar-rewards.mjs?canvas=20261122-detail1';
import {journeyLevels,chapters,nextJourneyLevel,isJourneyChapterEnd} from './journey-data.mjs';
import {readJourney,saveJourney,unlockedLevel} from './journey-saves.mjs';
import {specialNames,specialMarks} from './puzzle-specials.mjs';
import {readScore,saveScore} from './score-saves.mjs';
import {pieceArt} from './soft-graphics.mjs';
import {createPuzzleFX} from './puzzle-fx.mjs';
import {createPuzzleFinale} from './puzzle-finale.mjs';
import {stages,pieces,createPuzzle,createScorePuzzle,createJourneyPuzzle,applyMove,dailySeed,bestHint,starsFor,recordStars} from './puzzle-core.mjs';
import {dayKey} from './daily-core.mjs';
import {readRuns,saveRun} from './puzzle-saves.mjs';
import {shareResult} from './share-result.mjs';
const $=id=>document.getElementById(id),PROGRESS='teum-puzzle-progress-v1';
const fx=createPuzzleFX($('puzzle-board'));
const finale=createPuzzleFinale($('challenge'));
const guide=createPuzzleGuide($('puzzle-board'));
const objectives=createObjectiveFeedback($('challenge'));
let drag=null;
let state,config,key='',selected=-1,hints=[],busy=false,generation=0,focusIndex=0,mode='stage',dailyDate='',undoState=null,restartBackup=null,scoreBaseline=0;
function readProgress(){try{const p=JSON.parse(localStorage.getItem(PROGRESS)||'null');if(p&&p.version===1&&p.stages&&p.daily&&typeof p.stages==='object'&&typeof p.daily==='object')return p;}catch{}return {version:1,stages:{},daily:{}};}
function storeRun(){void syncAvatarReward({kind:mode,state,date:dailyDate},'puzzle-avatar-reward');if(mode==='journey'){const ok=saveJourney({state,undo:undoState,restart:restartBackup?.key===key?{state:restartBackup.state,undo:restartBackup.undo}:null});$('puzzle-save-status').textContent=ok?'여행 진행과 별을 이 브라우저에 저장해요.':'여행을 저장하지 못했어요. 기존 데이터는 덮어쓰지 않았습니다.';window.dispatchEvent(new Event('teum-journey-saved'));return;}if(mode==='score'){const ok=saveScore({state,undo:undoState,restart:restartBackup?.key===key?{state:restartBackup.state,undo:restartBackup.undo}:null,baseline:scoreBaseline});$('puzzle-save-status').textContent=ok?'랜덤 판 진행·이전 한 수·내 최고 기록을 이 브라우저에 저장해요.':'점수 모드를 저장하지 못했어요. 기존 데이터는 덮어쓰지 않았습니다.';window.dispatchEvent(new Event('teum-run-saved'));return;}if(saveRun({key,state,undo:undoState,restart:restartBackup?.key===key?{state:restartBackup.state,undo:restartBackup.undo}:null})){window.dispatchEvent(new Event('teum-run-saved'));$('puzzle-save-status').textContent='스테이지별 진행과 최근 14개 날짜 도전을 이 브라우저에 저장해요.';}else{$('puzzle-save-status').textContent='진행을 저장하지 못했어요. 기존 저장은 덮어쓰지 않았습니다. 브라우저 저장 공간과 설정을 확인해주세요.';}}
function recordResult(){if(state.status==='playing'||mode==='score'||mode==='journey')return;const p=readProgress(),record={score:state.score,moves:config.moves-state.moves,won:state.status==='won',stars:starsFor(state)};
 if(mode==='daily'){const old=p.daily[dailyDate];p.daily[dailyDate]={...record,score:Math.max(Number(old?.score)||0,record.score),won:!!old?.won||record.won,stars:Math.max(recordStars(old?.won?old:null,config.id),record.stars),moves:record.won?Math.min(old?.won?(Number(old.moves)||Infinity):Infinity,record.moves):old?.won?old.moves:record.moves};const keys=Object.keys(p.daily).sort().slice(-90);p.daily=Object.fromEntries(keys.map(k=>[k,p.daily[k]]));}
 else if(state.status==='won'){const old=p.stages[config.id];p.stages[config.id]={score:Math.max(Number(old?.score)||0,record.score),moves:Math.min(Number(old?.moves)||Infinity,record.moves),stars:Math.max(recordStars(old,config.id),record.stars)};}
 try{localStorage.setItem(PROGRESS,JSON.stringify(p));window.dispatchEvent(new Event('teum-progress'));}catch{$('puzzle-save-status').textContent='결과를 저장하지 못했어요. 현재 화면의 공유 버튼으로 결과를 복사할 수 있어요.';}
}
function routeConfig(){const [route,query='']=location.hash.slice(1).split('?');if(route!=='challenge')return null;const params=new URLSearchParams(query),date=params.get('daily');if(params.has('journey')){const request=Number(params.get('journey')),unlocked=unlockedLevel(readJourney().value);const id=Number.isInteger(request)&&request>=1&&request<=unlocked?request:unlocked;return {id,mode:'journey',date:'',key:'journey-'+id,seed:'score-journey-v1-'+id};}if(params.get('mode')==='score')return {id:1,mode:'score',date:'',key:'score',seed:null,fresh:params.get('round')==='new'};let validDate=false;if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){const parsed=new Date(date+'T00:00:00Z');validDate=Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;}
 if(validDate)return {id:3,mode:'daily',date,key:'daily-'+date,seed:dailySeed(date)};const requested=Number(params.get('stage'));const id=Number.isInteger(requested)&&requested>=1&&requested<=5?requested:1;return {id,mode:'stage',date:'',key:'stage-'+id,seed:'teum-stage-'+id};}
function stageLinks(){if(mode==='journey'){$('puzzle-stages').replaceChildren();const a=document.createElement('a');a.href='#journey';a.textContent='← 여행 지도';$('puzzle-stages').append(a);const label=document.createElement('span');label.className='journey-level-label';label.textContent=chapters[config.chapter].name+' · '+config.id+' / '+journeyLevels.length;$('puzzle-stages').append(label);return;}const p=readProgress();$('puzzle-stages').replaceChildren();const score=document.createElement('a');score.href='#challenge?mode=score';score.textContent='랜덤 한 판';if(mode==='score')score.setAttribute('aria-current','page');$('puzzle-stages').append(score);const daily=document.createElement('a');daily.href='#challenge?daily='+dayKey();daily.textContent='오늘의 도전';if(mode==='daily'&&dailyDate===dayKey())daily.setAttribute('aria-current','page');$('puzzle-stages').append(daily);for(const stage of stages){const a=document.createElement('a');a.href='#challenge?stage='+stage.id;a.textContent=(p.stages[stage.id]?'✓ ':'')+String(stage.id).padStart(2,'0');a.setAttribute('aria-label',`${stage.id}번 ${stage.name}${p.stages[stage.id]?' 완료':''}`);if(mode==='stage'&&stage.id===config.id)a.setAttribute('aria-current','page');$('puzzle-stages').append(a);}}
function paintBoard(board=state.board,ice=state.ice){const active=document.activeElement?.dataset?.puzzleIndex;if(active!==undefined)focusIndex=Number(active);$('puzzle-board').replaceChildren(...board.map((t,i)=>{const b=document.createElement('button');b.type='button';b.className='puzzle-tile'+(ice[i]?' frosted':'')+(i===selected?' selected':'')+(hints.includes(i)?' hinted':'');b.dataset.color=t.color;b.dataset.special=t.special||'';b.dataset.ice=String(ice[i]);b.dataset.puzzleIndex=i;b.innerHTML=pieceArt(t.color);b.disabled=busy||state.status!=='playing';b.tabIndex=i===focusIndex?0:-1;b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',`${(i/6|0)+1}행 ${i%6+1}열 ${pieces[t.color].name}${t.special?', '+specialNames[t.special]:''}${ice[i]?', 얼음':''}`);if(t.special){const mark=document.createElement('span');mark.className='special-mark';mark.textContent=specialMarks[t.special];mark.setAttribute('aria-hidden','true');b.append(mark);}b.addEventListener('click',()=>choose(i));b.addEventListener('keydown',e=>{const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6}[e.key];if(offset===undefined)return;e.preventDefault();const next=i+offset;if(next<0||next>=36||((e.key==='ArrowLeft'||e.key==='ArrowRight')&&(next/6|0)!==(i/6|0)))return;focusIndex=next;const target=$('puzzle-board').children[next];b.tabIndex=-1;target.tabIndex=0;target.focus();});return b;}));if(active!==undefined&&!busy&&state.status==='playing')$('puzzle-board').children[focusIndex]?.focus({preventScroll:true});}
function paintStats(snapshot=state,animate=false){objectives.update(snapshot,config,{animate,mode,status:state.status,moves:state.moves});updateScoreChase(snapshot.score,scoreBaseline,mode==='score');const mission=$('puzzle-mission');mission.hidden=!config.mission;if(config.mission)mission.textContent=config.mission.label+' '+Math.min(snapshot.missionCount??state.missionCount,config.mission.target)+' / '+config.mission.target;if(mode==='score'){$('puzzle-target-icon').textContent='이번 점수 · 시작 전 최고 '+scoreBaseline.toLocaleString('ko-KR');$('puzzle-collected').textContent=snapshot.score.toLocaleString('ko-KR')+'점';$('puzzle-ice-wrap').hidden=true;$('puzzle-goals').style.gridTemplateColumns='1fr auto';$('puzzle-moves').textContent=state.moves;$('puzzle-score').textContent=snapshot.score+'점';$('puzzle-goal-fill').style.width=(20-state.moves)*5+'%';return;}$('puzzle-collected').textContent=`${Math.min(snapshot.collected,config.target)} / ${config.target}`;$('puzzle-target-icon').innerHTML=pieceArt(config.color)+pieces[config.color].name;$('puzzle-ice').textContent=`${snapshot.cleared} / ${config.ice.length}`;$('puzzle-ice-wrap').hidden=!config.ice.length;$('puzzle-goals').style.gridTemplateColumns=config.ice.length?'1fr 1fr auto':'1fr auto';$('puzzle-moves').textContent=state.moves;$('puzzle-score').textContent=snapshot.score+'점';$('puzzle-goal-fill').style.width=Math.min(100,snapshot.collected/config.target*100)+'%';}
function result(){$('puzzle-score-history').hidden=mode!=='score';$('puzzle-reopen-result').hidden=state.status==='playing';if(mode==='journey'){const done=state.status!=='playing';$('puzzle-result').hidden=!done;if(!done)return;const won=state.status==='won',record=readJourney().value.records[config.id];$('puzzle-result-title').textContent=won?(!nextJourneyLevel(config.id)?'별빛 배달, 완주!':isJourneyChapterEnd(config.id)?'다음 지역으로!':'편지 배달 완료!'):'길을 다시 찾아볼까요?';$('puzzle-result-icon').textContent=won?'✉':'☁';finale.setStars(won?'★'.repeat(starsFor(state))+'☆'.repeat(3-starsFor(state)):'다시 도전할 수 있어요',won?'별 '+starsFor(state)+'개':'미완료');$('puzzle-best').textContent=record?'이 스테이지 최고 '+record.score+'점 · 별 '+record.stars+'개':'실패해도 횟수 제한 없이 다시 도전해요.';$('puzzle-result-copy').textContent=won?(isJourneyChapterEnd(config.id)?chapters[config.chapter].ending:'두리: “좋아! 다음 편지를 전하러 가자.”'):'아래에서 남은 목표를 확인하고, 같은 시작판에서 다른 수를 찾아보세요.';const next=$('puzzle-next');next.hidden=false;const canContinue=won&&nextJourneyLevel(config.id)&&unlockedLevel(readJourney().value)>config.id;next.href=canContinue?'#challenge?journey='+nextJourneyLevel(config.id):'#journey';next.textContent=canContinue?'다음 길로 →':'여행 지도 보기 →';return;}if(mode==='score'){const done=state.status!=='playing';$('puzzle-result').hidden=!done;if(!done)return;const best=readScore().value.best;$('puzzle-result-title').textContent=state.score>scoreBaseline?'내 최고 기록을 넘었어요!':'랜덤 한 판, 이번 기록';finale.setStars('','점수 모드는 별 평가 없음');$('puzzle-best').textContent='내 최고 '+Math.max(best,state.score).toLocaleString('ko-KR')+'점 · 다른 사람과 비교하지 않는 개인 기록';$('puzzle-result-icon').textContent='✦';$('puzzle-result-copy').textContent=state.score.toLocaleString('ko-KR')+'점 · 20번 이동 · 최고 '+Math.max(0,...state.turns)+'연쇄'+(scoreBaseline?' · 시작 전 최고 '+scoreBaseline.toLocaleString('ko-KR')+'점':' · 첫 점수 도전');$('puzzle-next').hidden=false;$('puzzle-next').href='#challenge?mode=score';$('puzzle-next').textContent='다음 랜덤 판 →';return;}const finished=state.status!=='playing';$('puzzle-result').hidden=!finished;if(!finished)return;const win=state.status==='won',stars=starsFor(state);finale.setStars(win?'★'.repeat(stars)+'☆'.repeat(3-stars):'다음 한 수를 찾아봐요',win?`이번 판 별 ${stars}개 / 3개`:'미완료');const p=readProgress(),best=mode==='daily'?p.daily[dailyDate]:p.stages[config.id];$('puzzle-best').textContent=best?(mode==='daily'?'이 날짜 내 기록':'이 스테이지 내 기록')+` · 최고 ${Number(best.score)||0}점`+(best.won||mode==='stage'?` · 최소 ${best.moves}번 이동`:''):'첫 기록에 도전 중이에요.';$('puzzle-result-title').textContent=win?'한 정거장, 가뿐하게 통과!':'이번엔 여기까지. 한 번 더?';$('puzzle-result-icon').textContent=win?'🎉':'🍊';$('puzzle-result-copy').textContent=`${state.score.toLocaleString('ko-KR')}점 · ${config.moves-state.moves}번 이동 · 최고 ${Math.max(0,...state.turns)}연쇄. ${win?'잘 맞는 한 수를 찾았어요.':'같은 시작 보드로 다른 수를 찾아보세요.'}`;const next=$('puzzle-next');next.hidden=!win;next.href=mode==='stage'?(config.id<5?'#challenge?stage='+nextJourneyLevel(config.id):'#challenge?daily='+dayKey()):'#challenge?stage=1';next.textContent=mode==='stage'?(config.id<5?'다음 정거장 →':'오늘의 도전으로 →'):'스테이지 도전하기 →';}
function restartNotice(){$('puzzle-restart-notice').hidden=!restartBackup||restartBackup.key!==key;}
function render(){drag?.cancel();objectives.result(state,config);$('puzzle-result-undo').hidden=busy||state.status!=='lost'||!undoState;const recoverable=state.status==='lost'&&!!undoState;$('puzzle-next').classList.toggle('primary',state.status==='won');$('puzzle-next').classList.toggle('secondary',state.status!=='won');$('puzzle-retry').classList.toggle('primary',state.status==='lost'&&!recoverable);$('puzzle-retry').classList.toggle('secondary',state.status!=='lost'||recoverable);$('puzzle-new-round').hidden=mode!=='score';restartNotice();paintBoard();paintStats();stageLinks();result();$('puzzle-hint').disabled=busy||state.status!=='playing';$('puzzle-undo').disabled=busy||state.status==='won'||!undoState;guide.update(state);}
function initialize(force=false,freshScore=false){drag?.cancel();guide.clear();const route=routeConfig();if(route?.fresh){history.replaceState(null,'','#challenge?mode=score');if(readScore().value.run?.state.status==='won'){force=true;freshScore=true;}}if(!route){if(busy){generation++;busy=false;fx.clear();}return;}if(!force&&route.key===key&&state){if(busy){generation++;busy=false;fx.clear();}render();void syncAvatarReward({kind:mode,state,date:dailyDate},'puzzle-avatar-reward');return;}if(route.key!==key)restartBackup=null;finale.dismiss();objectives.reset();fx.clear();generation++;busy=false;selected=-1;hints=[];focusIndex=0;key=route.key;mode=route.mode;dailyDate=route.date;config=mode==='journey'?journeyLevels[route.id-1]:mode==='score'?{...stages[0],name:'랜덤 한 판',moves:20}:stages[route.id-1];const scoreSaved=mode==='score'?readScore().value:null;const seed=mode==='score'?(!freshScore&&(state?.mode==='score'?state.seed:scoreSaved.run?.state.seed)||'score-'+crypto.randomUUID()):route.seed;scoreBaseline=mode==='score'?(force?scoreSaved.best:!freshScore&&scoreSaved.run?.state.seed===seed?scoreSaved.run.baseline:scoreSaved.best):0;const profile=!freshScore?(state?.mode==='score'&&state.seed===seed?state:scoreSaved?.run?.state.seed===seed?scoreSaved.run.state:null):null;state=mode==='journey'?createJourneyPuzzle(route.id):mode==='score'?createScorePuzzle(seed,profile?profile.feel==='burst-v1':true):createPuzzle(route.id,seed);undoState=null;let restored=false;if(!force){const slot=mode==='journey'?readJourney().value.slots[route.id]:mode==='score'?scoreSaved.run:readRuns().vault.slots[key];if(slot&&slot.state.seed===seed&&(mode==='journey'?slot.state.level===route.id:slot.state.stage===route.id)){state=slot.state;undoState=slot.undo||null;restartBackup=slot.restart?{key,state:slot.restart.state,undo:slot.restart.undo||null}:null;restored=true;}}
 $('puzzle-title').textContent=mode==='journey'?`${config.id}. ${config.name}`:mode==='score'?'랜덤 한 판':mode==='daily'?'오늘의 도전 · 얼음 정류장':`${String(config.id).padStart(2,'0')} / ${config.name}`;$('puzzle-subtitle').textContent=mode==='journey'?chapters[config.chapter].name+' · 스테이지 '+config.id:mode==='score'?(state.feel==='burst-v1'?'20번 교환 · 매번 다른 배치 · 시간 제한 없음':'20번 교환 · 저장된 이전 규칙의 판 · 시간 제한 없음'):mode==='daily'?`${dailyDate} · 같은 시작 보드와 채움 순서 · 재도전 가능`:config.subtitle+' · 시간 제한 없이 천천히';$('journey-scene').hidden=mode!=='journey';if(mode==='journey'){$('journey-scene').textContent=(config.id===chapters[config.chapter].firstLevel?chapters[config.chapter].intro+' ':'')+config.subtitle;}$('puzzle-share-copy').hidden=true;$('puzzle-share-status').textContent='';$('puzzle-live').textContent=restored?(state.status==='playing'?'이전에 하던 판을 이어서 열었어요.':'저장된 결과를 다시 열었어요.'):config.ice.length?'목표 조각을 모으고, 얼음이 있는 자리에서 매치해 주세요.':'같은 조각 3개를 이어봐요. 매치가 안 되면 이동은 그대로!';render();storeRun();if(state.status!=='playing'){recordResult();result();}}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function requestRestart(){if(state?.turns.length)restartBackup={key,state,undo:undoState};initialize(true);if(restartBackup)$('puzzle-live').textContent='새 판을 열었어요. 위의 다시 시작 취소 버튼으로 이전 판을 복원할 수 있어요.';}
$('puzzle-cancel-restart').addEventListener('click',()=>{if(!restartBackup||restartBackup.key!==key)return;fx.clear();generation++;busy=false;state=restartBackup.state;undoState=restartBackup.undo||null;restartBackup=null;selected=-1;hints=[];storeRun();render();if(state.status!=='playing'){recordResult();result();}else $('puzzle-board').children[focusIndex]?.focus({preventScroll:true});$('puzzle-live').textContent='다시 시작을 취소하고 방금 전 판으로 돌아왔어요.';});
function describeSelection(i){const descriptions={row:'가로 번개: 옆 조각과 바꾸면 한 행을 지워요.',col:'세로 번개: 옆 조각과 바꾸면 한 열을 지워요.',bomb:'주변 폭탄: 3×3 범위를 지워요. 다른 특수 조각과 합쳐보세요.',rainbow:'무지개 구슬: 옆 일반 조각의 색을 모두 지워요. 특수 조각과 바꾸면 더 강해져요.'};const type=state.board[i]?.special;if(type)$('puzzle-live').textContent=descriptions[type];}
async function choose(i) {
 if (busy || state.status !== 'playing') return;
 hints = [];
 if (selected < 0 || selected === i) {
  selected = selected === i ? -1 : i;
  if (selected >= 0) describeSelection(i);
  render();
  return;
 }
 const first = selected;
 const adjacent = Math.abs((first / 6 | 0) - (i / 6 | 0)) + Math.abs(first % 6 - i % 6) === 1;
 if (!adjacent) {
  selected = i;
  describeSelection(i);
  render();
  return;
 }
 selected = -1;
 const turn = applyMove(state, first, i);
 guide.clear();
 fx.clear();
 const restoreFocus = document.activeElement?.dataset?.puzzleIndex !== undefined;
 focusIndex = i;
 const token = generation;
 busy = true;
 for (const tile of $('puzzle-board').children) tile.disabled = true;
 $('puzzle-hint').disabled = true;
 $('puzzle-undo').disabled = true;
 if (!turn.valid) {
  $('puzzle-live').textContent = '매치가 없어요. 남은 이동은 그대로!';
  await fx.swap(first, i, false);
  if (token !== generation) return;
  busy = false;
  render();
  if (restoreFocus && document.activeElement === document.body) {
   $('puzzle-board').children[focusIndex]?.focus({preventScroll: true});
  }
  return;
 }

 guide.used(state,first,i);
 guide.moved();
 undoState = state;
 restartBackup = null;
 state = turn.state;
 storeRun();
 if (state.status !== 'playing') recordResult();
 restartNotice();
 await fx.swap(first, i);
 let previous = undoState;
 for (const frame of turn.frames) {
  if (token !== generation) return;
  paintBoard(frame.board, frame.ice);
  if (previous.clear) {
   await fx.drop(previous);
   if (token !== generation) return;
  }
  await fx.anticipate(frame);
  if (token !== generation) return;
  paintStats(frame,true);
  for (const index of frame.clear) $('puzzle-board').children[index].classList.add('clearing');
  fx.frame(frame, previous);
  previous = frame;
  $('puzzle-live').textContent = frame.combo > 1 ? `${frame.combo}연쇄!` :
   frame.combination || (frame.created ? '특수 조각이 생겼어요!' : frame.fired ? '특수 조각 발동!' : '매치 성공!');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  await pause(reduced ? 0 : Math.max(76, (frame.fired ? 172 : 125) - Math.min(5, frame.combo - 1) * 9));
 }
 if (token !== generation) return;
 paintBoard();
 await fx.drop(previous);
 if (token !== generation) return;

 busy = false;
 render();
 if (state.status === 'playing') {
  if (restoreFocus && document.body.dataset.view === 'challenge' &&
      [document.body, document.documentElement].includes(document.activeElement)) {
   $('puzzle-board').children[focusIndex]?.focus({preventScroll: true});
  }
  $('puzzle-live').textContent = turn.reshuffled ? '가능한 매치가 없어 새 배치로 바꿨어요. 남은 이동은 그대로!' :
   turn.frames.length > 1 ? `${turn.frames.length}연쇄! 다음 한 수를 골라보세요.` : '다음 조각을 골라보세요.';
  return;
 }

 const won = state.status === 'won';
 if (won) fx.win(mode === 'score' ? '20번 교환 완료' : '클리어!');
 $('puzzle-live').textContent = mode === 'score' ? '랜덤 한 판을 마쳤어요.' : won ? '목표 달성!' : '이동을 모두 썼어요.';
 finale.open(won);
 window.dispatchEvent(new CustomEvent('teum-game-finished', {detail: {score: state.score}}));
}
drag=createPuzzleDrag($('puzzle-board'),{canPlay:()=>document.body.dataset.view==='challenge'&&!document.hidden&&!busy&&state?.status==='playing',onSwap:(first,second)=>{selected=first;void choose(second);}});
function undoLastMove(fromResult=false){if(busy||state.status==='won'||!undoState)return;finale.dismiss();objectives.reset();generation++;state=undoState;undoState=null;selected=-1;hints=[];storeRun();render();if(document.body.dataset.view==='challenge'){if(fromResult)$('puzzle-board').scrollIntoView({block:'center',behavior:'instant'});$('puzzle-board').children[focusIndex]?.focus({preventScroll:true});}$('puzzle-live').textContent='한 수 전으로 돌아왔어요. 조각·얼음·점수·이동이 함께 복원됩니다.';}
$('puzzle-undo').addEventListener('click',()=>undoLastMove());
$('puzzle-result-undo').addEventListener('click',()=>undoLastMove(true));
$('puzzle-restart').addEventListener('click',requestRestart);$('puzzle-retry').addEventListener('click',()=>{requestRestart();$('puzzle-board').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});$('puzzle-hint').addEventListener('click',()=>{if(busy||state.status!=='playing')return;const suggestion=bestHint(state);hints=suggestion?.pair||[];selected=-1;render();$('puzzle-live').textContent=objectiveHint(state,suggestion);});
function newScoreRound(){if(mode!=='score')return;if(state.status==='playing'&&state.turns.length&&!confirm('진행 중인 판 대신 새 랜덤 판을 시작할까요?'))return;restartBackup=null;initialize(true,true);$('puzzle-board').scrollIntoView({block:'center',behavior:'instant'});}
$('puzzle-new-round').addEventListener('click',newScoreRound);
$('puzzle-next').addEventListener('click',e=>{if(mode==='score'){e.preventDefault();newScoreRound();}});
$('puzzle-share').addEventListener('click',()=>{if(mode==='score'){const url=new URL(location.href);url.hash='challenge?mode=score';shareResult({title:'알찬끼 랜덤 한 판',text:'알찬끼 · 랜덤 한 판\n'+state.score+'점 · '+(20-state.moves)+'번 이동 · 최고 '+Math.max(0,...state.turns)+'연쇄\n나만의 새로운 판으로 도전해보세요.',url:url.href,container:$('puzzle-share-copy'),status:$('puzzle-share-status')});return;}const url=new URL(location.href);url.hash=mode==='journey'?'challenge?journey='+config.id:mode==='daily'?'challenge?daily='+dailyDate:'challenge?stage='+config.id;const text=`알찬끼 · ${mode==='daily'?dailyDate+' 오늘의 도전':config.name}\n${state.status==='won'?'🎉 통과':'🍊 다시 도전'} · ${state.score}점 · ${config.moves-state.moves}번 이동${state.status==='won'?' · '+'★'.repeat(starsFor(state)):''}\n${state.turns.map(n=>n>1?'🟧':'🟩').join('')}\n같은 퍼즐에 도전해볼래요?`;shareResult({title:'알찬끼 퍼즐',text,url:url.href,container:$('puzzle-share-copy'),status:$('puzzle-share-status')});});
window.addEventListener('hashchange',()=>initialize());initialize();
