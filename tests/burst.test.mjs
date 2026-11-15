import assert from 'node:assert/strict';
import {createScorePuzzle,applyMove,legalMoves,validSnapshot,matchGroups,createPuzzle} from '../docs/puzzle-core.mjs';
const metrics=[];
for(const burst of [false,true]){
 let waves=0,multi=0;
 for(let n=0;n<100;n++){
  let state=createScorePuzzle('burst-bench-'+n,burst);
  assert.equal(state.feel,burst?'burst-v1':undefined);
  assert.equal(matchGroups(state.board).length,0);
  if(burst)assert(state.board.every(t=>t.color<4));
  for(let i=0;i<20;i++){
   const moves=legalMoves(state.board),pair=moves[(n*7+i*11)%moves.length];
   const turn=applyMove(state,...pair);assert(turn.valid);
   assert.deepEqual(turn,applyMove(state,...pair));
   assert(turn.frames.length<=40);assert(validSnapshot(turn.state));
   assert.equal(turn.state.moves,state.moves-1);
   assert.equal(turn.state.score,turn.frames.at(-1).score);
   waves+=turn.frames.length;multi+=turn.frames.length>1;state=turn.state;
  }
  assert.equal(state.status,'won');
 }
 metrics.push({burst,meanWaves:waves/2000,multiRate:multi/2000});
}
assert(metrics[1].meanWaves>metrics[0].meanWaves);
assert(metrics[1].multiRate>metrics[0].multiRate);
assert.equal(createPuzzle(1,'stage-profile').feel,undefined);
assert(!validSnapshot({...createScorePuzzle('invalid-profile'),feel:'unknown'}));
console.log('Burst: deterministic 4,000 turns; legacy/new profiles, stable boards, score conservation and finite cascades passed',metrics);
