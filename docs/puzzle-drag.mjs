export function createPuzzleDrag(board,{canPlay,onSwap}) {
 let gesture=null;
 let suppressUntil=0;
 function targetFor(start,dx,dy) {
  const horizontal=Math.abs(dx)>=Math.abs(dy);
  const target=start+(horizontal?(dx>0?1:-1):(dy>0?6:-6));
  if(target<0||target>=36||horizontal&&(start/6|0)!==(target/6|0))return null;
  return target;
 }
 function cancel() {
  if(!gesture)return;
  const {tile,id}=gesture;
  tile.style.removeProperty('transform');
  tile.classList.remove('is-dragging');
  board.querySelector('.drag-target')?.classList.remove('drag-target');
  gesture=null;
  if(board.hasPointerCapture(id))board.releasePointerCapture(id);
 }
 board.addEventListener('pointerdown',event=>{
  if(gesture&&event.pointerId!==gesture.id){cancel();return;}
  if(!canPlay()||!event.isPrimary||event.button!==0)return;
  const tile=event.target.closest('[data-puzzle-index]');
  if(!tile)return;
  cancel();suppressUntil=0;
  gesture={id:event.pointerId,tile,index:Number(tile.dataset.puzzleIndex),x:event.clientX,y:event.clientY,dragging:false};
 });
 board.addEventListener('pointermove',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  if(!canPlay()){cancel();return;}
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.dragging&&Math.max(Math.abs(dx),Math.abs(dy))<8)return;
  gesture.dragging=true;
  if(!board.hasPointerCapture(event.pointerId))board.setPointerCapture(event.pointerId);
  const cell=gesture.tile.getBoundingClientRect();
  const horizontal=Math.abs(dx)>=Math.abs(dy);
  const distance=horizontal?Math.min(cell.width+6,Math.max(-cell.width-6,dx)):Math.min(cell.height+6,Math.max(-cell.height-6,dy));
  const scale=matchMedia('(prefers-reduced-motion: reduce)').matches?1:1.05;
  gesture.tile.style.transform=`translate(${horizontal?distance:0}px,${horizontal?0:distance}px) scale(${scale})`;
  gesture.tile.classList.add('is-dragging');
  board.querySelector('.drag-target')?.classList.remove('drag-target');
  const target=targetFor(gesture.index,dx,dy);
  if(target!==null)board.children[target].classList.add('drag-target');
 });
 board.addEventListener('pointerup',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const start=gesture,dx=event.clientX-start.x,dy=event.clientY-start.y;
  const wasDragging=start.dragging;
  cancel();
  if(!wasDragging)return;
  suppressUntil=performance.now()+450;
  const target=targetFor(start.index,dx,dy);
  if(canPlay()&&target!==null&&Math.max(Math.abs(dx),Math.abs(dy))>=22)onSwap(start.index,target);
 });
 board.addEventListener('click',event=>{
  if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();suppressUntil=0;}
 },true);
 board.addEventListener('pointercancel',()=>{suppressUntil=performance.now()+450;cancel();});
 board.addEventListener('lostpointercapture',event=>{if(event.target===board)cancel();});
 window.addEventListener('hashchange',cancel);
 window.addEventListener('blur',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 return {cancel};
}
