export const specialNames={row:'가로 번개',col:'세로 번개',bomb:'주변 폭탄',rainbow:'무지개 구슬',rocket:'유도 로켓',link:'연결 폭탄',vortex:'회오리',growth:'성장 폭탄'};
export const specialMarks={row:'↔',col:'↕',bomb:'✦',rainbow:'◎',rocket:'➤',link:'⌁',vortex:'◉',growth:'✹'};
const line=t=>t==='row'||t==='col';
function stripe(at,vertical=false){return Array.from({length:6},(_,k)=>vertical?k*6+at%6:(at/6|0)*6+k);}
function area(at,radius){const result=[];for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){const r=(at/6|0)+dr,c=at%6+dc;if(r>=0&&r<6&&c>=0&&c<6)result.push(r*6+c);}return result;}
function cross(at,radius=0){const result=[];for(let d=-radius;d<=radius;d++){const r=(at/6|0)+d,c=at%6+d;if(r>=0&&r<6)result.push(...stripe(r*6));if(c>=0&&c<6)result.push(...stripe(c,true));}return [...new Set(result)];}
const colorHits=(board,color)=>board.flatMap((t,i)=>t?.color===color?[i]:[]);
function dominantColor(board){const counts=Array(5).fill(0);for(const t of board)if(t&&t.special!=='rainbow')counts[t.color]++;return counts.indexOf(Math.max(...counts));}
// Connected match groups make one special; intersections cannot make two competing births.
export function specialBirths(board,groups,a,b,first,lab=false,combo=1){const pending=groups.map(g=>[...g]),births=new Map();while(pending.length){const component=[pending.shift()],cells=new Set(component[0]);let changed=true;while(changed){changed=false;for(let i=pending.length-1;i>=0;i--)if(pending[i].some(n=>cells.has(n))){const g=pending.splice(i,1)[0];component.push(g);g.forEach(n=>cells.add(n));changed=true;}}
 const square=g=>g.length===4&&new Set(g.map(i=>i/6|0)).size===2&&new Set(g.map(i=>i%6)).size===2;const horizontal=g=>(g[0]/6|0)===(g[1]/6|0),intersect=component.some(g=>horizontal(g))&&component.some(g=>!horizontal(g));let special=lab&&component.some(g=>g.length>=6)?'link':component.some(g=>g.length>=5)?'rainbow':lab&&component.some(square)?'rocket':intersect?(lab&&cells.size>=6?'vortex':'bomb'):lab&&combo>1&&component.some(g=>g.length===4)?'growth':component.some(g=>g.length===4)?(horizontal(component[0])?'row':'col'):null;if(!special)continue;
 const ordered=[...(first?[b,a]:[]),...[...cells].filter(n=>component.filter(g=>g.includes(n)).length>1),...component[0].slice(Math.floor(component[0].length/2)),...cells];const at=ordered.find(n=>cells.has(n)&&!board[n]?.special);if(at!==undefined)births.set(at,special);
 }return births;}
// Mutates only the engine's copied board, so rainbow conversions are visible in the frame.
function combination(board,a,b,context={}){const x=board[a].special,y=board[b].special;if(!x&&!y)return null;const skip=new Set(),effects=[];let hits=[],name='';
 if(x==='rainbow'||y==='rainbow'){const orb=x==='rainbow'?a:b,other=orb===a?b:a,kind=board[other].special,color=board[other].color;skip.add(orb);
  if(kind==='rainbow'){skip.add(other);hits=Array.from({length:36},(_,i)=>i);name='무지개 × 무지개';effects.push({type:'nova',at:b,targets:hits});}
  else{hits=colorHits(board,color).filter(i=>!context.lab||!context.boxes?.[i]);if(line(kind)||kind==='bomb'||context.lab&&['rocket','link','vortex','growth'].includes(kind)){for(const i of hits)if(i!==orb)board[i].special=kind==='bomb'?'bomb':line(kind)?(((i/6|0)+i%6)%2?'row':'col'):kind;name=kind==='bomb'?'무지개 × 폭탄':'무지개 × 번개';}else name='같은 색 모두 제거';if(kind==='growth')for(const i of hits)if(board[i].special==='growth')board[i].power=board[other].power||1;effects.push({type:'color',at:orb,color,targets:[...hits]});}
 }else if(context.lab&&x&&y&&(['rocket','link','vortex','growth'].includes(x)||['rocket','link','vortex','growth'].includes(y))){return null;}else if(x&&y){skip.add(a);skip.add(b);if(line(x)&&line(y)){hits=cross(b);name='십자 번개';effects.push({type:'cross',at:b,targets:hits});}else if(x==='bomb'&&y==='bomb'){hits=area(b,2);name='대형 폭탄';effects.push({type:'mega',at:b,targets:hits});}else{hits=cross(b,1);name='번개 × 폭탄';effects.push({type:'wide-cross',at:b,targets:hits});}}
 else return null;
 return {hits:[...new Set([...hits,a,b])],skip,effects,name};
}
export function resolveSpecials(board,initial,swap,context={}){const plan=swap?combination(board,...swap,context):null,hits=new Set([...initial,...(plan?.hits||[])]),queue=[...hits],fired=new Set(plan?.skip||[]),blast=new Set(plan?.hits||[]),effects=[...(plan?.effects||[])];
 while(queue.length){const at=queue.shift(),kind=board[at]?.special;if(!kind||fired.has(at)||context.lab&&context.boxes?.[at])continue;fired.add(at);let targets;
  if(line(kind))targets=stripe(at,kind==='col');else if(kind==='bomb')targets=area(at,1);else if(kind==='growth')targets=area(at,Math.min(3,board[at].power||1));else if(kind==='rocket'){const choices=Array.from({length:36},(_,i)=>i).filter(i=>!hits.has(i)).sort((a,b)=>{const value=i=>(context.boxes?.[i]||0)*100+(context.chains?.[i]||0)*80+(context.ice?.[i]?60:0)+(board[i]?.special?40:0)+(board[i]?.color===context.goal?20:0);return value(b)-value(a)||a-b;});targets=choices.slice(0,1);}else if(kind==='link'){targets=context.linkTarget!==undefined?connectionPath(at,context.linkTarget):cross(at);}else if(kind==='vortex')targets=[];else targets=colorHits(board,dominantColor(board));
  effects.push({type:kind==='rainbow'?'color':kind,at,targets:[...targets]});
  for(const i of targets){blast.add(i);if(!hits.has(i)){hits.add(i);queue.push(i);}}
 }return {hits:[...hits],fired:fired.size,blast,effects,combination:plan?.name||''};
}

export function connectionPath(a,b){const result=[],x0=a%6,y0=a/6|0,x1=b%6,y1=b/6|0,steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let n=0;n<=steps;n++)result.push(Math.round(y0+(y1-y0)*n/(steps||1))*6+Math.round(x0+(x1-x0)*n/(steps||1)));return [...new Set(result)];}
