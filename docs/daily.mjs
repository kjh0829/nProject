import {dayKey,offsetDay,recentDays,contentIndex,completedCount,normalizeState} from './daily-core.mjs';
import {dailyContent} from './daily-content.mjs';
const $=id=>document.getElementById(id),KEY='teum-daily-v1';
let state={version:1,days:{}},invalid=false,shownDay=dayKey(),mode=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'numeric',hourCycle:'h23'}).format(new Date()))<15?'morning':'evening';
try{const raw=localStorage.getItem(KEY);if(raw!==null)state=normalizeState(JSON.parse(raw));}catch{invalid=true;}
const entry=()=>state.days[shownDay]||{};
const content=()=>dailyContent[contentIndex(shownDay,dailyContent.length)];
function update(patch,key=shownDay){
  if(invalid){$('daily-status').textContent='기존 기록을 읽지 못해 저장을 멈췄어요. 브라우저 저장소 설정을 확인해주세요. 입력은 유지됩니다.';return false;}
  const next=normalizeState({version:1,days:{...state.days,[key]:{...(state.days[key]||{}),...patch}}});
  try{localStorage.setItem(KEY,JSON.stringify(next));state=next;$('daily-status').textContent='이 브라우저에 저장했어요. 다른 기기와 공유되지 않습니다.';return true;}catch{$('daily-status').textContent='브라우저 저장을 사용할 수 없어요. 저장 공간과 설정을 확인해주세요. 입력은 유지됩니다.';return false;}
}
function renderGarden(){
  const days=recentDays(shownDay),active=days.filter(k=>completedCount(state.days[k])>0||state.days[k]?.note||state.days[k]?.gameBest>0).length;
  $('garden-summary').textContent=`최근 7일 중 ${active}일, 나를 위한 틈을 냈어요.`;
  $('garden-days').replaceChildren(...days.map(k=>{const e=state.days[k]||{},count=completedCount(e);const box=document.createElement('div');box.className='garden-day'+(k===shownDay?' today':'');box.dataset.count=count;box.setAttribute('aria-label',`${k}: ${count}가지 완료${e.note?', 기록 있음':''}`);const dot=document.createElement('span');dot.className='garden-dot';dot.textContent=count===3?'🌳':count>0||e.note||e.gameBest>0?'🌱':'·';const label=document.createElement('span');label.textContent=k===shownDay?'오늘':`${Number(k.slice(5,7))}/${Number(k.slice(8))}`;box.append(dot,label);return box}));
  const tasks=[['읽기',entry().read],['퀴즈',Number.isInteger(entry().quizChoice)],['실천',entry().done]];
  $('daily-progress').replaceChildren(...tasks.map(([name,done])=>{const el=document.createElement('span');el.className=done?'done':'';el.textContent=(done?'✓ ':'○ ')+name;return el}));
  $('daily-complete').textContent=completedCount(entry())===3?'오늘의 세 가지 틈을 모두 채웠어요. 편안히 쉬어가세요.':`${completedCount(entry())}/3 완료 · 쉬었다 돌아와도 괜찮아요.`;
}
function renderQuiz(){
  const c=content(),choice=entry().quizChoice,answered=Number.isInteger(choice);
  $('daily-question').textContent=c.question;
  $('quiz-options').replaceChildren(...c.choices.map((text,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(answered&&i===c.answer?'✓ ':'')+text;b.setAttribute('aria-pressed',String(choice===i));if(answered){b.disabled=true;if(i===c.answer)b.className='correct';}b.addEventListener('click',()=>{if(Number.isInteger(entry().quizChoice))return;if(update({quizChoice:i})){renderQuiz();renderGarden();}});return b}));
  $('quiz-feedback').textContent=answered?(choice===c.answer?'맞았어요! ':'괜찮아요, 같이 알아봐요. ')+c.explanation:'정답보다 중요한 건 오늘 하나 알아가는 것. 하루 한 문제예요.';
}
function renderHistory(){
  const keys=Object.keys(state.days).filter(k=>state.days[k].note).sort().reverse().slice(0,7);
  $('journal-history').replaceChildren();
  if(!keys.length){const p=document.createElement('p');p.className='small';p.textContent='아직 기록이 없어요. 오늘 한 줄부터 시작해볼까요?';$('journal-history').append(p);return;}
  for(const k of keys){const block=document.createElement('div');block.className='journal-entry';const date=document.createElement('span');date.className='small';date.textContent=k+' · 내 기록';const p=document.createElement('p');p.textContent=state.days[k].note;const remove=document.createElement('button');remove.type='button';remove.className='delete-small';remove.textContent='이 기록 삭제';remove.addEventListener('click',()=>{if(!confirm('이 날짜의 한 줄 기록을 삭제할까요?'))return;if(invalid)return;const next=normalizeState({version:1,days:{...state.days,[k]:{...state.days[k],note:''}}});try{localStorage.setItem(KEY,JSON.stringify(next));state=next;if(k===shownDay)$('daily-note').value='';renderHistory();renderGarden();$('journal-feedback').textContent='기록을 삭제했어요.';}catch{$('daily-status').textContent='기록을 삭제하지 못했어요. 브라우저 저장소 설정을 확인해주세요.';}});block.append(date,p,remove);$('journal-history').append(block);}
}
function renderGameGoal(){
  const target=[300,450,600][contentIndex(dayKey(),3)];const best=state.days[dayKey()]?.gameBest||0;
  $('daily-game-goal').textContent=`오늘의 가벼운 도전 · ${target}점 모으기\n오늘 최고 ${best}점${best>=target?' · 목표를 채웠어요!':' · 한 판을 끝내면 기록돼요.'}`;
  $('daily-game-goal').style.whiteSpace='pre-line';
}
function renderMode(){
  $('daily-greeting').textContent=mode==='morning'?'출근길 3분, 오늘의 자유.':'퇴근길 3분, 나를 돌아볼 시간.';
  $('daily-description').textContent=mode==='morning'?'하나 읽고, 하나 배우고, 작은 실천을 골라보세요.':'오늘의 생각을 한 줄 남기고, 게임 한 판으로 쉬어가세요.';
  $('mode-morning').setAttribute('aria-pressed',String(mode==='morning'));$('mode-evening').setAttribute('aria-pressed',String(mode==='evening'));
  const grid=$('daily-subgrid');grid.prepend($(mode==='evening'?'daily-journal-card':'daily-quiz-card'));
  $('daily-next-title').textContent=mode==='morning'?'퇴근길에는 오늘의 한 줄을 남겨봐요.':'내일은 이런 이야기를 준비했어요.';
  $('daily-next-copy').textContent=mode==='morning'?'아침에 고른 작은 실천, 저녁의 나에게는 어떤 경험이 됐을까요?':dailyContent[contentIndex(offsetDay(shownDay,1),dailyContent.length)].title;
  $('daily-next-link').textContent=mode==='morning'?'퇴근길로 전환 ↗':'게임으로 쉬기 ↗';$('daily-next-link').href=mode==='morning'?'#daily-evening':'#play';
}
function render(){
  const c=content(),e=entry();$('daily-date').textContent=shownDay.replaceAll('-','.')+' · 한국 시간 기준';
  $('daily-topic').textContent=c.topic+' / 1분';$('daily-title').textContent=c.title;$('daily-body').textContent=c.body;$('daily-mission-text').textContent=c.mission;$('daily-prompt').textContent=c.prompt;
  $('read-done').textContent=e.read?'✓ 오늘 읽었어요':'읽었어요 ✓';$('read-done').disabled=!!e.read;
  $('mission-done').textContent=e.done?'✓ 실천 완료 · 취소하기':'오늘 실천했어요 ✓';$('mission-done').setAttribute('aria-pressed',String(!!e.done));
  $('daily-note').value=e.note||'';$('note-length').textContent=`${(e.note||'').length}/300`;
  renderMode();renderGarden();renderQuiz();renderHistory();renderGameGoal();
}
$('read-done').addEventListener('click',()=>{if(update({read:true})){$('read-done').textContent='✓ 오늘 읽었어요';$('read-done').disabled=true;renderGarden();}});
$('mission-done').addEventListener('click',()=>{if(update({done:!entry().done})){$('mission-done').textContent=entry().done?'✓ 실천 완료 · 취소하기':'오늘 실천했어요 ✓';$('mission-done').setAttribute('aria-pressed',String(!!entry().done));renderGarden();}});
$('daily-note').addEventListener('input',()=>{$('note-length').textContent=`${$('daily-note').value.length}/300`;$('journal-feedback').textContent='아직 저장하지 않은 내용이에요.';});
$('journal-form').addEventListener('submit',ev=>{ev.preventDefault();const note=$('daily-note').value.trim();if(!note){$('journal-feedback').textContent='오늘의 생각을 한 글자 이상 적어주세요.';return;}if(note.length>300)return;if(update({note})){$('journal-feedback').textContent=shownDay+' 기록을 저장했어요.';$('daily-note').value=note;renderHistory();renderGarden();}});
for(const name of ['morning','evening'])$('mode-'+name).addEventListener('click',()=>{mode=name;renderMode();});
$('daily-next-link').addEventListener('click',ev=>{if(mode==='morning'){ev.preventDefault();mode='evening';renderMode();$('journal-form').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$('daily-note').focus({preventScroll:true});}});
window.addEventListener('teum-game-finished',ev=>{const score=ev.detail?.score;if(!Number.isFinite(score)||score<0)return;const k=dayKey();update({gameBest:Math.max(state.days[k]?.gameBest||0,score)},k);renderGarden();renderGameGoal();});
function checkDate(){
  if(dayKey()===shownDay)return;
  if($('daily-note').value.trim()!==(entry().note||'')){$('daily-status').textContent='한국 시간으로 날짜가 바뀌었어요. 작성 중인 기록을 저장한 뒤 새로고침하면 오늘 콘텐츠가 열립니다.';return;}
  shownDay=dayKey();$('journal-feedback').textContent='';render();$('daily-status').textContent='새로운 날짜의 콘텐츠를 열었어요.';
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate();});setInterval(checkDate,60000);
if(invalid)$('daily-status').textContent='저장된 기록을 읽지 못했어요. 기존 데이터를 보호하기 위해 저장을 중단했습니다.';
render();
