import assert from 'node:assert/strict';
import {specialBirths,resolveSpecials} from '../docs/puzzle-specials.mjs';
import {createScorePuzzle,applyMove,validSnapshot,legalMoves,matchGroups} from '../docs/puzzle-core.mjs';
const board=()=>Array.from({length:36},(_,i)=>({color:((i/6|0)*2+i%6)%5,special:null}));
const sorted=a=>[...a].sort((a,b)=>a-b),cells=(r,c,radius)=>Array.from({length:36},(_,i)=>i).filter(i=>Math.abs((i/6|0)-r)<=radius&&Math.abs(i%6-c)<=radius);
for(const [groups,expected] of [[[[0,1,2,3]],'row'],[[[0,6,12,18]],'col'],[[[6,7,8],[1,7,13]],'bomb'],[[[6,7,8],[8,14,20]],'bomb'],[[[0,1,2,3,4]],'rainbow'],[[[0,6,12,18,24]],'rainbow'],[[[6,7,8,9],[1,7,13,19]],'bomb'],[[[0,1,2,3,4],[2,8,14]],'rainbow']]){const births=specialBirths(board(),groups,0,2,true);assert.equal(births.size,1);assert.equal([...births.values()][0],expected);}
assert.equal(specialBirths(board(),[[0,1,2]],0,1,true).size,0);
function fire(x,y,at=14,to=15){const b=board();b[at].special=x;b[to].special=y;return {b,fx:resolveSpecials(b,[at,to],[at,to])};}
assert.deepEqual(sorted(fire('row',null).fx.hits),[12,13,14,15,16,17]);
assert.deepEqual(sorted(fire('col',null).fx.hits),[2,8,14,15,20,26,32]);
assert.deepEqual(sorted(fire('bomb',null).fx.hits),cells(2,2,1));
for(const x of ['row','col'])for(const y of ['row','col']){const{fx}=fire(x,y);assert.equal(fx.combination,'십자 번개');assert.equal(fx.hits.length,11);assert.equal(fx.fired,2);}
for(const [x,y]of [['bomb','row'],['col','bomb']]){const{fx}=fire(x,y);assert.equal(fx.hits.length,27);assert.equal(fx.combination,'번개 × 폭탄');}
assert.deepEqual(sorted(fire('bomb','bomb').fx.hits),cells(2,3,2));assert.deepEqual(sorted(fire('bomb','bomb',0,1).fx.hits),cells(0,1,2));
const color=fire('rainbow',null);assert.deepEqual(sorted(color.fx.hits),sorted(new Set([14,15,...color.b.flatMap((t,i)=>t.color===color.b[15].color?[i]:[])])));assert.equal(color.fx.effects[0].type,'color');
for(const kind of ['row','col','bomb']){const{b,fx}=fire('rainbow',kind);const chosen=b[15].color;for(const[t,i]of b.map((t,i)=>[t,i]))if(t.color===chosen&&i!==14)assert(kind==='bomb'?t.special==='bomb':['row','col'].includes(t.special));assert(fx.fired>=2);assert(fx.effects.some(e=>e.type===kind||kind!=='bomb'&&['row','col'].includes(e.type)));}
const nova=fire('rainbow','rainbow');assert.equal(nova.fx.hits.length,36);assert.equal(nova.fx.fired,2);assert.equal(nova.fx.effects[0].type,'nova');
const chain=board();chain[14].special='row';chain[16].special='col';chain[28].special='bomb';const cf=resolveSpecials(chain,[14]);assert.equal(cf.fired,3);assert.equal(new Set(cf.hits).size,cf.hits.length);assert(cf.hits.includes(35));
for(const special of ['row','col','bomb','rainbow']){const s=createScorePuzzle('fixture-'+special);s.board=board();s.board[14].special=special;s.board[15].special='rainbow';assert(validSnapshot(s));const raw=JSON.stringify(s),t=applyMove(s,14,15);assert(t.valid);assert.equal(JSON.stringify(s),raw);assert(validSnapshot(t.state));assert.equal(t.state.moves,19);let score=0;for(const f of t.frames){assert.equal(f.score-score,f.clear.length*10*f.combo+f.fired*30);score=f.score;assert.equal(new Set(f.clear).size,f.clear.length);assert(f.clear.every(i=>i>=0&&i<36));}assert.deepEqual(t,applyMove(s,14,15));}
for(let seed=0;seed<30;seed++){let s=createScorePuzzle('special-fuzz-'+seed);for(let turn=0;turn<20;turn++){const choices=legalMoves(s.board),pair=choices[(seed+turn)%choices.length],next=applyMove(s,...pair);assert(next.valid);assert(validSnapshot(next.state));assert.equal(matchGroups(next.state.board).length,0);s=next.state;}assert.equal(s.status,'won');}
console.log('Specials: directional 4s, T/L bomb, 5s rainbow, every family combination, clipped edges, color conversions, recursive unique clears, deterministic replay, scoring and 30 full rounds passed');
