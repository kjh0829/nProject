export const SIZE=6;
export const pieces=[{name:'오렌지',icon:'🍊'},{name:'새싹',icon:'🌱'},{name:'포도',icon:'🍇'},{name:'물방울',icon:'💧'},{name:'별',icon:'⭐'}];
export const stages=[
{id:1,name:'오렌지 급행',subtitle:'가볍게 한 판',color:0,target:9,moves:12,ice:[]},
{id:2,name:'파란 환승역',subtitle:'번개를 만들어봐요',color:3,target:14,moves:14,ice:[]},
{id:3,name:'얼음 정류장',subtitle:'수집도, 얼음도',color:2,target:14,moves:18,ice:[8,9,26,27]},
{id:4,name:'초록빛 우회로',subtitle:'한 번의 선택, 긴 연쇄',color:1,target:18,moves:20,ice:[7,10,14,21,25,28]},
{id:5,name:'별빛 종착역',subtitle:'마지막 얼음까지',color:4,target:20,moves:22,ice:[7,8,9,10,25,26,27,28]}
];
export function hashSeed(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||1;}
function random(s){let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0||1;return s.rng/4294967296;}
const tile=s=>({color:Math.floor(random(s)*5),special:null});
const copyBoard=b=>b.map(x=>x?{...x}:null);
export function adjacent(a,b){return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<36&&b<36&&Math.abs((a/6|0)-(b/6|0))+Math.abs(a%6-b%6)===1;}
export function matchGroups(b){const groups=[];for(let r=0;r<6;r++){let c=0;while(c<6){let end=c+1;while(end<6&&b[r*6+c]&&b[r*6+end]?.color===b[r*6+c].color)end++;if(end-c>=3)groups.push(Array.from({length:end-c},(_,k)=>r*6+c+k));c=end;}}for(let c=0;c<6;c++){let r=0;while(r<6){let end=r+1;while(end<6&&b[r*6+c]&&b[end*6+c]?.color===b[r*6+c].color)end++;if(end-r>=3)groups.push(Array.from({length:end-r},(_,k)=>(r+k)*6+c));r=end;}}return groups;}
export function legalMoves(b){const result=[];for(let i=0;i<36;i++)for(const j of [i+1,i+6]){if(!adjacent(i,j))continue;if(b[i]?.special||b[j]?.special){result.push([i,j]);continue;}[b[i],b[j]]=[b[j],b[i]];const hit=matchGroups(b).length>0;[b[i],b[j]]=[b[j],b[i]];if(hit)result.push([i,j]);}return result;}
function freshBoard(s){for(let attempt=0;attempt<200;attempt++){const b=[];for(let i=0;i<36;i++){let t;do{t=tile(s);}while((i%6>=2&&t.color===b[i-1].color&&t.color===b[i-2].color)||(i>=12&&t.color===b[i-6].color&&t.color===b[i-12].color));b.push(t);}if(legalMoves(b).length)return b;}throw Error('No playable board');}
export function createPuzzle(stageId=1,seed){const config=stages.find(x=>x.id===stageId)||stages[0];const s={version:1,stage:config.id,seed:String(seed??`teum-stage-${config.id}`),rng:hashSeed(seed??`teum-stage-${config.id}`),moves:config.moves,score:0,collected:0,cleared:0,status:'playing',turns:[],ice:Array.from({length:36},(_,i)=>config.ice.includes(i))};s.board=freshBoard(s);return s;}
function expandHits(b,initial){const hits=new Set(initial),queue=[...hits],fired=new Set();while(queue.length){const i=queue.shift();const special=b[i]?.special;if(!special||fired.has(i))continue;fired.add(i);const area=[];if(special==='row')for(let c=0;c<6;c++)area.push((i/6|0)*6+c);else for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r=(i/6|0)+dr,c=i%6+dc;if(r>=0&&r<6&&c>=0&&c<6)area.push(r*6+c);}for(const j of area)if(!hits.has(j)){hits.add(j);queue.push(j);}}return {hits:[...hits],fired:fired.size};}
function collapse(s){for(let c=0;c<6;c++){const column=[];for(let r=5;r>=0;r--)if(s.board[r*6+c])column.push(s.board[r*6+c]);for(let r=5;r>=0;r--)s.board[r*6+c]=column[5-r]||tile(s);}}
export function applyMove(original,a,b){
 if(original.status!=='playing'||!adjacent(a,b))return {valid:false,state:original,frames:[]};
 const s={...original,board:copyBoard(original.board),ice:[...original.ice],turns:[...original.turns]};
 const specialSwap=!!(s.board[a].special||s.board[b].special);[s.board[a],s.board[b]]=[s.board[b],s.board[a]];
 let groups=matchGroups(s.board);if(!specialSwap&&!groups.length)return {valid:false,state:original,frames:[]};
 s.moves--;let forced=specialSwap?[a,b]:[],combo=0;const frames=[];
 while(groups.length||forced.length){
  combo++;const births=new Map();
  for(const g of groups){if(g.length<4)continue;let at=g.includes(b)&&combo===1?b:g.includes(a)&&combo===1?a:g[Math.floor(g.length/2)];if(s.board[at]?.special)at=g.find(i=>!s.board[i]?.special);if(at!==undefined)births.set(at,g.length>=5?'bomb':'row');}
  const expanded=expandHits(s.board,[...groups.flat(),...forced]);
  // A newly created special survives its creation turn unless another existing special hits it.
  for(const i of births.keys())if(expanded.fired&&expanded.hits.includes(i))births.delete(i);
  const clear=expanded.hits.filter(i=>!births.has(i));
  for(const i of clear){if(s.board[i]?.color===stages[s.stage-1].color)s.collected++;if(s.ice[i]){s.ice[i]=false;s.cleared++;}}
  s.score+=clear.length*10*combo+expanded.fired*30;
  frames.push({board:copyBoard(s.board),ice:[...s.ice],clear,combo,fired:expanded.fired,created:births.size,score:s.score,collected:s.collected,cleared:s.cleared});
  for(const i of clear)s.board[i]=null;for(const [i,special]of births)s.board[i]={...s.board[i],special};
  collapse(s);forced=[];groups=matchGroups(s.board);
  if(combo>=40&&groups.length){s.board=freshBoard(s);groups=[];}
 }
 const config=stages[s.stage-1];s.turns.push(combo);if(s.collected>=config.target&&s.cleared>=config.ice.length)s.status='won';else if(s.moves===0)s.status='lost';
 let reshuffled=false;if(s.status==='playing'&&!legalMoves(s.board).length){s.board=freshBoard(s);reshuffled=true;}
 return {valid:true,state:s,frames,reshuffled};
}
export function validSnapshot(s){
 if(!s||s.version!==1||!Number.isInteger(s.stage)||s.stage<1||s.stage>5||typeof s.seed!=='string'||s.seed.length>100)return false;
 const config=stages[s.stage-1];if(!Number.isInteger(s.rng)||s.rng<1||s.rng>4294967295||!Number.isInteger(s.moves)||s.moves<0||s.moves>config.moves||!['playing','won','lost'].includes(s.status))return false;
 if(!['score','collected','cleared'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<10000000))return false;
 if(!Array.isArray(s.board)||s.board.length!==36||!s.board.every(t=>t&&Number.isInteger(t.color)&&t.color>=0&&t.color<5&&[null,'row','bomb'].includes(t.special)))return false;
 if(!Array.isArray(s.ice)||s.ice.length!==36||!s.ice.every((x,i)=>typeof x==='boolean'&&(!x||config.ice.includes(i)))||s.cleared!==config.ice.length-s.ice.filter(Boolean).length)return false;
 if(!Array.isArray(s.turns)||s.turns.length!==config.moves-s.moves||!s.turns.every(x=>Number.isInteger(x)&&x>=1&&x<=40)||matchGroups(s.board).length)return false;
 const won=s.collected>=config.target&&s.cleared>=config.ice.length;
 return s.status==='won'?won:s.status==='lost'?s.moves===0&&!won:s.moves>0&&!won&&legalMoves(s.board).length>0;
}
const dailySeeds=new Map();
// Pick a deterministic daily seed only after a simulated winning route is found.
export function dailySeed(date){
 if(dailySeeds.has(date))return dailySeeds.get(date);
 const config=stages[2];
 for(let variation=0;variation<40;variation++){
  const seed=`teum-daily-${date}-${variation}`;
  for(let attempt=0;attempt<4;attempt++){
   let s=createPuzzle(3,seed),chooser=hashSeed(seed+'-'+attempt);
   while(s.status==='playing'){
    const choices=legalMoves(s.board).map(pair=>{const turn=applyMove(s,...pair),next=turn.state;const value=(Math.min(config.target,next.collected)-Math.min(config.target,s.collected))*3+(next.cleared-s.cleared)*10+turn.frames.reduce((n,f)=>n+f.created*1.5,0)+Math.min(2,(next.score-s.score)/100);return {next,value};}).sort((a,b)=>b.value-a.value);
    if(!choices.length)break;chooser=(Math.imul(chooser,1664525)+1013904223)>>>0;s=choices[attempt===0?0:chooser%Math.min(choices.length,3)].next;
   }
   if(s.status==='won'){dailySeeds.set(date,seed);return seed;}
  }
 }
 // A known-solvable fallback still gives everyone the same board for that date.
 const fallback='teum-stage-3';dailySeeds.set(date,fallback);return fallback;
}
export function starsFor(state){if(state.status!=='won')return 0;const total=stages[state.stage-1].moves;return state.moves>=Math.ceil(total/2)?3:state.moves>=Math.ceil(total/4)?2:1;}
export function hintValue(state,turn){const first=turn.frames[0];if(!first)return {value:-Infinity,collected:0,ice:0,specials:0};const config=stages[state.stage-1],collected=Math.min(config.target,first.collected)-Math.min(config.target,state.collected),ice=first.cleared-state.cleared,specials=first.created;return {value:collected*3+ice*8+specials*2+(first.fired?1:0),collected,ice,specials};}
export function bestHint(state){if(state.status!=='playing')return null;let best=null;for(const pair of legalMoves(state.board)){const turn=applyMove(state,...pair),benefit=hintValue(state,turn);if(!best||benefit.value>best.value)best={pair,...benefit};}return best;}
export function recordStars(record,stage){if(!record)return 0;if(Number.isInteger(record.stars)&&record.stars>=1&&record.stars<=3)return record.stars;const total=stages[stage-1]?.moves,used=Number(record.moves);return Number.isFinite(total)&&Number.isFinite(used)&&used>=0&&used<=total?starsFor({stage,status:'won',moves:total-used}):1;}
