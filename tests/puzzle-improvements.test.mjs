import assert from 'node:assert/strict';
import {createPuzzle,applyMove,legalMoves,bestHint,hintValue,starsFor,recordStars} from '../docs/puzzle-core.mjs';
import {emptyRuns,withRun,normalizeRuns,validSlot,readRuns,saveRun,continueRun,RUNS_KEY,LEGACY_KEY} from '../docs/puzzle-saves.mjs';
import {endingIds,endingPath,resolveStory} from '../docs/story-data.mjs';
import {solvePuzzle} from './puzzle-solver.mjs';
const first=createPuzzle(1),firstTurn=applyMove(first,...solvePuzzle(1).path[0]).state;
const second=createPuzzle(2),secondTurn=applyMove(second,...solvePuzzle(2).path[0]).state;
let vault=withRun(emptyRuns(),{key:'stage-1',state:firstTurn,undo:first});
vault=withRun(vault,{key:'stage-2',state:second,undo:null});assert.equal(continueRun(vault).key,'stage-1');
vault=withRun(vault,{key:'stage-2',state:secondTurn,undo:second});assert.equal(continueRun(vault).key,'stage-2');assert.deepEqual(vault.slots['stage-1'].state,firstTurn);
assert.deepEqual(normalizeRuns(JSON.parse(JSON.stringify(vault))).slots['stage-1'].undo,first);
assert.equal(validSlot({key:'stage-2',state:firstTurn}),false);assert.equal(validSlot({key:'stage-1',state:firstTurn,undo:firstTurn}),false);
const data=new Map([[LEGACY_KEY,JSON.stringify({key:'stage-1',state:firstTurn})]]);const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
const migrated=readRuns(storage);assert.equal(migrated.vault.slots['stage-1'].state.moves,firstTurn.moves);const legacy=data.get(LEGACY_KEY);assert(saveRun({key:'stage-2',state:secondTurn,undo:second},storage));assert.equal(data.get(LEGACY_KEY),legacy);assert.equal(readRuns(storage).vault.order.length,2);
for(let i=1;i<=17;i++){const date=`2026-11-${String(i).padStart(2,'0')}`,slot={key:'daily-'+date,state:createPuzzle(3,'teum-daily-'+date+'-0'),undo:null};vault=withRun(vault,slot);}
assert.equal(vault.order.filter(k=>k.startsWith('daily-')).length,14);assert(vault.slots['stage-1']);assert(vault.slots['stage-2']);assert(!vault.slots['daily-2026-11-01']);
const before=data.get(RUNS_KEY);assert.equal(saveRun({key:'stage-1',state:firstTurn,undo:first},{getItem:storage.getItem,setItem(){throw Error('QuotaExceeded')}}),false);assert.equal(data.get(RUNS_KEY),before);
data.set(RUNS_KEY,'{broken');assert.equal(readRuns(storage).writable,false);assert.equal(saveRun({key:'stage-1',state:firstTurn},storage),false);assert.equal(data.get(RUNS_KEY),'{broken');
assert.equal(readRuns({getItem(){throw Error('Storage blocked')}}).writable,false);
for(const [moves,stars]of [[12,3],[6,3],[5,2],[3,2],[2,1],[0,1]])assert.equal(starsFor({stage:1,status:'won',moves}),stars);assert.equal(starsFor({stage:1,status:'lost',moves:0}),0);
for(const id of [1,3,5]){const s=createPuzzle(id),copy=JSON.stringify(s),hint=bestHint(s);assert(hint);assert.equal(hint.value,Math.max(...legalMoves(s.board).map(pair=>hintValue(s,applyMove(s,...pair)).value)));assert(applyMove(s,...hint.pair).valid);assert.equal(JSON.stringify(s),copy);}
assert.equal(bestHint({...first,status:'won'}),null);assert.equal(recordStars({moves:3},1),3);assert.equal(recordStars({moves:10},1),1);assert.equal(recordStars(null,1),0);
for(const id of endingIds){assert.deepEqual(resolveStory(endingPath(id)).node.ending,id);}assert.equal(endingPath('unknown'),null);
console.log('Passed: independent save slots, continue selection, legacy migration, undo persistence/validation, daily retention, corrupt/blocked/full storage, star thresholds, goal-aware hints and ending replay paths');
