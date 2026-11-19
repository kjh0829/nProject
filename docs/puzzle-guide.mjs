import {bestHint} from './puzzle-core.mjs';
const key='teum-puzzle-guide-v1';
const explanations={row:'가로 번개는 한 줄을 지워요. 옆 조각과 바꿔보세요.',col:'세로 번개는 한 열을 지워요. 옆 조각과 바꿔보세요.',bomb:'폭탄은 주변 3×3을 지워요. 번개와 합치면 더 넓게 터져요.',rainbow:'무지개는 옆 조각과 같은 색을 모두 지워요.'};
export function createPuzzleGuide(board) {
 let learned={move:false,specials:[],off:false};
 try {
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(saved&&typeof saved.move==='boolean'&&typeof saved.off==='boolean'&&Array.isArray(saved.specials)&&saved.specials.every(s=>Object.hasOwn(explanations,s)))learned=saved;
 }catch{}
 const box=document.createElement('div');box.className='puzzle-guide';box.hidden=true;
 const copy=document.createElement('span');
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='안내 건너뛰기';
 box.append(copy,dismiss);board.closest('.puzzle-stage').before(box);
 let currentSpecial=null;
 function save(){try{localStorage.setItem(key,JSON.stringify(learned));}catch{}}
 function clear(){box.hidden=true;board.querySelectorAll('.guide-tile').forEach(el=>el.classList.remove('guide-tile'));}
 function update(state) {
  clear();currentSpecial=null;
  if(learned.off||state.status!=='playing'||document.body.dataset.view!=='challenge')return;
  if(state.turns.length>0&&!learned.move){learned.move=true;save();}
  let cells=[];
  if(!learned.move){
   cells=bestHint(state)?.pair||[];
   copy.textContent='빛나는 두 조각을 서로 바꿔보세요. 누르거나 옆으로 밀 수 있어요.';
   dismiss.textContent='안내 건너뛰기';
  }else {
   const index=state.board.findIndex(tile=>tile.special&&!learned.specials.includes(tile.special));
   if(index<0)return;
   currentSpecial=state.board[index].special;cells=[index];
   copy.textContent=explanations[currentSpecial];dismiss.textContent='알겠어요';
  }
  box.hidden=false;
  for(const index of cells)board.children[index]?.classList.add('guide-tile');
 }
 dismiss.addEventListener('click',()=>{
  if(currentSpecial)learned.specials.push(currentSpecial);
  else learned.off=true;
  save();clear();
 });
 function moved(){learned.move=true;save();clear();}
 function used(state,first,second){
  for(const index of [first,second]){
   const special=state.board[index]?.special;
   if(special&&!learned.specials.includes(special))learned.specials.push(special);
  }
  save();
 }
 window.addEventListener('hashchange',clear);
 return {update,moved,used,clear};
}
