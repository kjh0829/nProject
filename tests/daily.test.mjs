import assert from 'node:assert/strict';
import {dayKey,offsetDay,recentDays,contentIndex,completedCount,normalizeState} from '../docs/daily-core.mjs';
import {dailyContent} from '../docs/daily-content.mjs';
assert.equal(dayKey(new Date('2026-11-12T14:59:59Z')),'2026-11-12');
assert.equal(dayKey(new Date('2026-11-12T15:00:00Z')),'2026-11-13');
assert.equal(offsetDay('2026-12-31',1),'2027-01-01');
assert.equal(offsetDay('2024-03-01',-1),'2024-02-29');
assert.equal(recentDays('2026-11-12').length,7);
assert.notEqual(contentIndex('2026-11-12',14),contentIndex('2026-11-13',14));
assert.equal(contentIndex('2026-11-12',14),contentIndex('2026-11-26',14));
assert.equal(dailyContent.length,14);
for(const c of dailyContent){assert.equal(c.choices.length,3);assert(c.answer>=0&&c.answer<=2);for(const k of ['title','body','mission','question','explanation','prompt'])assert(c[k].length>0);}
assert.equal(completedCount({read:true,quizChoice:0,done:true}),3);
assert.equal(completedCount({note:'기록'}),0);
assert.throws(()=>normalizeState({version:3,days:{}}));
const raw={version:1,days:{}};for(let n=0;n<100;n++)raw.days[offsetDay('2026-01-01',n)]={read:true,note:'x'.repeat(400),quizChoice:-1};
const trimmed=normalizeState(raw);assert.equal(Object.keys(trimmed.days).length,90);assert.equal(Object.values(trimmed.days)[0].note.length,300);assert.equal(Object.values(trimmed.days)[0].quizChoice,undefined);
// DOM interaction smoke test, separate from real browser verification.
const elements=new Map(),saved=new Map(),listeners={};
function element(){return {value:'',textContent:'',children:[],style:{},dataset:{},attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},replaceChildren(...x){this.children=x},append(...x){this.children.push(...x)},prepend(x){this.children=this.children.filter(y=>y!==x);this.children.unshift(x)},addEventListener(k,f){this.handlers[k]=f},focus(){},scrollIntoView(){}}}
const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
globalThis.document={getElementById:get,createElement:element,addEventListener(k,f){listeners[k]=f},hidden:false};
globalThis.window={addEventListener(k,f){listeners[k]=f}};
globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
globalThis.matchMedia=()=>({matches:true});globalThis.confirm=()=>true;
const realInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
await import('../docs/daily.mjs');globalThis.setInterval=realInterval;
const event={preventDefault(){}};const today=dayKey();const state=()=>JSON.parse(saved.get('teum-daily-v1'));
get('daily-note').value='저장 전 메모 <img src=x>';
get('read-done').handlers.click();assert.equal(state().days[today].read,true);assert.equal(get('daily-note').value,'저장 전 메모 <img src=x>');
get('mission-done').handlers.click();assert.equal(state().days[today].done,true);get('mission-done').handlers.click();assert.equal(state().days[today].done,false);
get('quiz-options').children[0].handlers.click();assert.equal(state().days[today].quizChoice,0);get('quiz-options').children[1].handlers.click();assert.equal(state().days[today].quizChoice,0);
get('daily-note').value='  오늘의 기록 <script>alert(1)</script>  ';get('journal-form').handlers.submit(event);assert.equal(state().days[today].note,'오늘의 기록 <script>alert(1)</script>');assert.equal(get('journal-history').children[0].children[1].textContent,'오늘의 기록 <script>alert(1)</script>');
get('mode-evening').handlers.click();assert.equal(get('daily-subgrid').children[0],get('daily-journal-card'));
listeners['teum-game-finished']({detail:{score:600}});listeners['teum-game-finished']({detail:{score:300}});assert.equal(state().days[today].gameBest,600);
const before=saved.get('teum-daily-v1');localStorage.setItem=()=>{throw Error('QuotaExceeded')};get('mission-done').handlers.click();assert.equal(saved.get('teum-daily-v1'),before);assert(get('daily-status').textContent.includes('저장')||get('daily-status').textContent.includes('저장'));
console.log('Passed: KST midnight, date rotation, content, 90-entry retention, task toggles, daily quiz lock, note preservation and literal rendering, commute order, daily game best and storage failure');
