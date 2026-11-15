import assert from 'node:assert/strict';
import {createJourneyPuzzle,applyMove,bestHint,validSnapshot,starsFor} from '../docs/puzzle-core.mjs';
import {journeyLevels} from '../docs/journey-data.mjs';
import {JOURNEY_KEY,readJourney,saveJourney,unlockedLevel} from '../docs/journey-saves.mjs';
import {validSlot} from '../docs/puzzle-saves.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
assert.equal(saveJourney({state:createJourneyPuzzle(2)},storage),false);
for(const config of journeyLevels){let state=createJourneyPuzzle(config.id);assert(validSnapshot(state));assert.deepEqual(state,createJourneyPuzzle(config.id));assert(!validSlot({key:'stage-1',state}));assert.equal(unlockedLevel(readJourney(storage).value),config.id);let undo=null;while(state.status==='playing'){const pair=bestHint(state).pair,turn=applyMove(state,...pair);assert.deepEqual(turn,applyMove(state,...pair));undo=state;state=turn.state;assert(validSnapshot(state));assert(saveJourney({state,undo,restart:null},storage));assert.equal(unlockedLevel(readJourney(storage).value),Math.min(15,config.id+(state.status==='won'?1:0)));}assert.equal(state.status,'won','solvable level '+config.id);assert(starsFor(state)>=1);assert(saveJourney({state,undo},storage));assert.equal(readJourney(storage).value.records[config.id].stars,starsFor(state));}
assert.equal(Object.keys(readJourney(storage).value.records).length,15);
const complete=memory.get(JOURNEY_KEY);assert(!validSnapshot({...createJourneyPuzzle(1),level:99}));
memory.set(JOURNEY_KEY,'{broken');assert(!readJourney(storage).writable);assert(!saveJourney({state:createJourneyPuzzle(1)},storage));assert.equal(memory.get(JOURNEY_KEY),'{broken');memory.set(JOURNEY_KEY,complete);
assert(!saveJourney({state:createJourneyPuzzle(1)}, {...storage,setItem(){throw Error('quota');}}));assert.equal(memory.get(JOURNEY_KEY),complete);
assert(!readJourney({getItem(){throw Error('blocked')}}).writable);
console.log('Journey: all 15 deterministic levels solvable, goals, sequential unlocks, isolated snapshots, stars, replay and corrupt/quota/blocked storage PASS');
