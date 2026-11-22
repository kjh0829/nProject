import {readAvatar} from './avatar-store.mjs';
import {createAvatarImage} from './avatar-runtime.mjs?canvas=20261122-shoes1';
import {collectionOf,unlockedPrizes} from './collection-core.mjs';
import {readJourney} from './journey-saves.mjs';

export async function createOutfitCard(value,name,prize) {
 const character=await createAvatarImage(value,{width:600,height:960});
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
 const context=canvas.getContext('2d');
 if(!context)throw Error('이미지 저장을 지원하지 않는 브라우저입니다.');
 const palettes={studio:['#f6ecf8','#d2bddc'],'citrus-lane':['#fff2bd','#d9ac82'],'glass-garden':['#ecfff3','#97bdb0'],'starlight-station':['#403852','#9d8daf'],'prism-workshop':['#e9f8ff','#9cb2d1']};
 const colors=palettes[prize?.id||'studio']||palettes.studio;
 const background=context.createLinearGradient(0,0,900,1200);background.addColorStop(0,colors[0]);background.addColorStop(1,colors[1]);
 context.fillStyle=background;context.fillRect(0,0,900,1200);
 context.fillStyle='#fff9f1';context.globalAlpha=.28;context.beginPath();context.ellipse(450,560,330,445,0,0,Math.PI*2);context.fill();context.globalAlpha=1;
 context.strokeStyle='#fff9f177';context.lineWidth=2;context.stroke();
 const dark=prize?.id==='starlight-station';context.fillStyle=dark?'#fff4dc':'#4d3b5b';
 context.font='bold 28px sans-serif';context.fillText('알찬끼',62,64);
 context.font='18px sans-serif';context.fillText('별빛 배달 여행 · 내 코디',62,100);
 context.fillStyle='#52465c30';context.beginPath();context.ellipse(450,1023,180,28,0,0,Math.PI*2);context.fill();
 context.drawImage(character,450-character.width/2,110);character.width=character.height=0;
 if(prize){
  context.fillStyle='#fff5cfbb';context.beginPath();context.roundRect(696,871,135,140,26);context.fill();
  context.fillStyle='#9f743b';context.font='70px sans-serif';context.textAlign='center';context.fillText(prize.symbol,764,970);
 }
 context.textAlign='center';context.fillStyle=dark?'#fff4dc':'#4d3b5b';
 context.font='bold 32px sans-serif';context.fillText(name.trim().slice(0,20)||'나의 별빛 코디',450,1100,760);
 context.font='20px sans-serif';context.fillText(prize?prize.badge:'나만의 코디 컬렉션',450,1142,760);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG를 저장하지 못했어요.')),'image/png'));
}

const button=document.getElementById('outfit-export-button');
const status=document.getElementById('outfit-export-status');
const preview=document.getElementById('outfit-export-preview');
let imageURL=null;
button.addEventListener('click',async()=>{
 if(button.disabled)return;
 button.disabled=true;status.textContent='저장된 코디로 카드를 만들고 있어요…';
 try {
  const avatar=readAvatar();
  if(!avatar.writable)throw Error('저장된 코디를 읽지 못했어요.');
  const prize=unlockedPrizes(readJourney().value).find(p=>p.id===collectionOf(avatar.value).background);
  const name=document.getElementById('outfit-card-name').value;
  const blob=await createOutfitCard(avatar.value,name,prize);
  if(imageURL)URL.revokeObjectURL(imageURL);
  imageURL=URL.createObjectURL(blob);
  const image=new Image();image.src=imageURL;image.alt=(name.trim()||'나의 별빛 코디')+' · 저장할 코디 카드';
  const save=document.createElement('a');save.href=imageURL;save.download='alchankki-outfit.png';save.textContent='PNG 이미지 저장';
  preview.replaceChildren(image,save);preview.hidden=false;
  const file=new File([blob],'alchankki-outfit.png',{type:'image/png'});
  let shareable=false;
  try{shareable=!!navigator.canShare?.({files:[file]});}catch{}
  if(shareable){
   const share=document.createElement('button');share.type='button';share.textContent='코디 카드 공유';
   share.onclick=async()=>{try{await navigator.share({files:[file],title:'알찬끼 · 내 코디'});}catch(error){status.textContent=error.name==='AbortError'?'공유를 취소했어요.':'PNG 이미지 저장을 이용해 주세요.';}};
   preview.append(share);
  }
  status.textContent='카드를 만들었어요. 휴대폰에서는 이미지를 길게 눌러 저장할 수도 있어요.';
 }catch(error){status.textContent=error.message||'카드를 만들지 못했어요. 다시 시도해 주세요.';}
 finally{button.disabled=false;}
});
