import assert from 'node:assert/strict';
import {createScorePuzzle,applyMove,legalMoves,validSnapshot,bestHint,starsFor,matchGroups} from '../docs/puzzle-core.mjs';
import {validSlot} from '../docs/puzzle-saves.mjs';
import {emptyScore,readScore,saveScore,SCORE_KEY,validScore} from '../docs/score-saves.mjs';
let completed;
for(let n=0;n<40;n++){
 let state=createScorePuzzle('test-'+n);assert(validSnapshot(state));assert.equal(state.moves,20);assert.equal(matchGroups(state.board).length,0);assert(legalMoves(state.board).length);assert.deepEqual(state,createScorePuzzle('test-'+n));
 assert.equal(applyMove(state,0,35).valid,false);
 for(let i=0;i<20;i++){const before=state;const pair=bestHint(state).pair;const turn=applyMove(state,...pair);assert(turn.valid);assert.deepEqual(turn,applyMove(before,...pair));state=turn.state;assert.equal(state.moves,19-i);assert.equal(state.turns.length,i+1);assert(state.score>before.score);assert(validSnapshot(state));assert.equal(state.status,i===19?'won':'playing');}
 assert.equal(starsFor(state),0);assert.equal(applyMove(state,0,1).valid,false);completed=state;
}
assert.notDeepEqual(createScorePuzzle('a').board,createScorePuzzle('b').board);
assert(!validSnapshot({...completed,moves:1}));assert(!validSnapshot({...completed,mode:'unknown'}));assert(!validSnapshot({...completed,seed:'teum-stage-1'}));assert(!validSlot({key:'stage-1',state:completed,undo:null}));
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
assert.deepEqual(readScore(storage).value,emptyScore());
const initial=createScorePuzzle('saved'),one=applyMove(initial,...bestHint(initial).pair).state;
assert(saveScore({state:one,undo:initial,restart:null,baseline:0},storage));assert.deepEqual(readScore(storage).value.run.state,one);
assert(saveScore({state:initial,undo:null,restart:{state:one,undo:initial},baseline:0},storage));assert(readScore(storage).value.run.restart);
assert(saveScore({state:completed,undo:null,restart:null,baseline:0},storage));let saved=readScore(storage).value;assert.equal(saved.best,completed.score);assert.equal(saved.history.length,1);assert(saveScore(saved.run,storage));assert.equal(readScore(storage).value.history.length,1);
assert(!saveScore({state:one,undo:{...initial,seed:'score-other'},restart:null,baseline:0},storage));
assert(!validScore({...saved,history:[...saved.history,...saved.history]}));
const before=memory.get(SCORE_KEY);assert.equal(saveScore(saved.run,{getItem:storage.getItem,setItem:()=>{throw Error('quota');}}),false);assert.equal(memory.get(SCORE_KEY),before);
memory.set(SCORE_KEY,'{broken');assert.equal(readScore(storage).writable,false);assert(!saveScore(saved.run,storage));assert.equal(memory.get(SCORE_KEY),'{broken');
console.log('Score mode: 40 deterministic full 20-move rounds, legal boards, no early finish, hint, invalid/finished moves, separate vault, undo/restart, best/history idempotence and corrupt/quota safety passed');
