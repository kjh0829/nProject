import assert from 'node:assert/strict';
import {createPuzzle,matchGroups,applyMove,validSnapshot} from '../docs/puzzle-core.mjs';
import {validSlot,readRuns,saveRun,RUNS_KEY} from '../docs/puzzle-saves.mjs';
import {solvePuzzle} from './puzzle-solver.mjs';
function fixture(){const s=createPuzzle(1);s.board=Array.from({length:36},(_,i)=>({color:((i/6|0)*2+i%6)%5,special:null}));[0,0,1,0,2,3].forEach((color,i)=>s.board[i]={color,special:null});s.board[8]={color:0,special:null};return s;}
const distant=fixture();distant.board[14]={color:1,special:'row'};distant.board[20]={color:1,special:null};assert(validSnapshot(distant));assert.equal(matchGroups(distant.board).length,0);const distantTurn=applyMove(distant,2,8);assert(distantTurn.frames[0].fired>0);assert.equal(distantTurn.frames[0].created,1);assert.equal(distantTurn.frames[0].clear.includes(2),false);assert(validSnapshot(distantTurn.state));
const touching=fixture();touching.board[0].special='row';assert(validSnapshot(touching));const touchingTurn=applyMove(touching,2,8);assert(touchingTurn.frames[0].fired>0);assert.equal(touchingTurn.frames[0].created,0);assert.equal(touchingTurn.frames[0].clear.includes(2),true);
const original=createPuzzle(1),played=applyMove(original,...solvePuzzle(1).path[0]).state;const restarted={key:'stage-1',state:original,undo:null,restart:{state:played,undo:original}};assert(validSlot(restarted));
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};assert(saveRun(restarted,storage));const restored=readRuns(storage).vault.slots['stage-1'];assert.deepEqual(restored.restart.state,played);assert.deepEqual(restored.restart.undo,original);
assert.equal(validSlot({...restarted,restart:{state:createPuzzle(2)}}),false);assert.equal(validSlot({...restarted,restart:{state:original}}),false);assert.equal(validSlot({...restarted,state:played}),false);
assert(saveRun({key:'stage-1',state:restored.restart.state,undo:restored.restart.undo,restart:null},storage));assert.deepEqual(readRuns(storage).vault.slots['stage-1'].state,played);assert.equal(readRuns(storage).vault.slots['stage-1'].restart,null);assert(data.get(RUNS_KEY));
console.log('Passed: distant special keeps newly born tile, direct blast destroys it, legal board regression, persistent restart cancellation, backup validation and exact restored state');
