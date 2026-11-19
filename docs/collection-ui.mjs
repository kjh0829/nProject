import {journeyCatalog} from './journey-data.mjs';
import {itemById} from './avatar-data.mjs';
import {avatarBalance} from './avatar-core.mjs';
import {readAvatar,setAvatarWish} from './avatar-store.mjs';
import {readJourney} from './journey-saves.mjs';
import {avatarArt} from './avatar-art.mjs';
import {collectionOf,regionPrizes,unlockedPrizes} from './collection-core.mjs';

function element(tag,className,text) {
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text)el.textContent=text;
 return el;
}
function prizeCopy(prize,unlocked) {
 const box=element('div','collection-prize-copy');
 box.append(element('span','collection-prize-symbol',prize.symbol),
  element('strong','',prize.badge),
  element('p','',prize.background+' 배경 · '+prize.prop+' 장식'));
 const link=element('a','',unlocked?'기념 배경 고르기 →':prize.name+' 여행하기 →');
 link.href=unlocked?'#avatar?reward='+prize.id:'#journey?region='+prize.id;
 box.append(link);
 return box;
}
function render() {
 const avatar=readAvatar(),progress=readJourney();
 const value=avatar.value,collection=collectionOf(value),prizes=unlockedPrizes(progress.value);
 const selected=prizes.find(prize=>prize.id===collection.background);
 const background=selected?.id||'studio';
 for(const room of document.querySelectorAll('.avatar-room,#home .avatar-entry')) {
  room.dataset.collectionBackground=background;
  let prop=room.querySelector('.collection-room-prop');
  if(!prop){prop=element('span','collection-room-prop');prop.setAttribute('aria-hidden','true');room.append(prop);}
  prop.textContent=selected?.symbol||'';
 }
 for(const el of document.querySelectorAll('[data-home-avatar]')) {
  el.innerHTML=avatarArt(value,{decorative:true});
 }
 const badge=document.getElementById('home-region-badge');
 badge.textContent=selected?selected.symbol+' '+selected.badge:prizes.length?prizes.at(-1).symbol+' '+prizes.at(-1).badge:'나만의 코디';
 const wish=itemById(collection.wish);
 for(const target of document.querySelectorAll('[data-wish-target]')) {
  target.replaceChildren();target.hidden=!wish;
  if(!wish)continue;
  const owned=value.owned.includes(wish.id),needed=Math.max(0,wish.price-avatarBalance(value));
  const copy=element('div','collection-wish-copy');
  copy.append(element('small','','내 목표 의상'),element('strong','',wish.name),
   element('p','',!avatar.writable?'저장 상태를 확인해 주세요.':owned?'구매 완료! 다음 코디를 골라보세요.':needed?needed+' P 더 모으면 구매할 수 있어요.':'지금 구매할 수 있어요!'));
  const link=element('a','',owned?'입어보기 →':needed?'포인트 모으기 →':'구매하고 입기 →');
  const next=(()=>{let id=1;while(id<journeyCatalog.levels.length&&progress.value.records[id])id++;return id;})();
  const journeyRewardAvailable=!Object.hasOwn(value.claims,'journey:'+next);
  if(needed&&!owned){
   link.href=journeyRewardAvailable?'#challenge?journey='+next:'#challenge?mode=score';
   if(!journeyRewardAvailable)link.textContent='20수로 포인트 모으기 →';
  }else link.href='#avatar?item='+wish.id;
  const inspect=element('a','collection-wish-inspect','의상 보기');inspect.href='#avatar?item='+wish.id;
  const remove=element('button','collection-wish-clear','찜 해제');remove.type='button';remove.disabled=!avatar.writable;
  remove.onclick=async()=>{const result=await setAvatarWish(null);if(!result.ok){remove.textContent='저장 실패 · 다시 시도';}};
  const actions=element('div','collection-wish-actions');actions.append(link,inspect,remove);
  target.append(copy,actions);
 }
 const query=new URLSearchParams(location.hash.split('?')[1]||'');
 const region=regionPrizes.find(prize=>prize.id===query.get('region'))||regionPrizes.find(prize=>!prizes.some(p=>p.id===prize.id))||regionPrizes.at(-1);
 const regionBox=document.getElementById('journey-region-prize');
 regionBox.replaceChildren(element('p','',prizes.some(p=>p.id===region.id)?'획득한 지역 기념품':region.name+' 완주 보상'),prizeCopy(region,prizes.some(p=>p.id===region.id)));
 const resultBox=document.getElementById('puzzle-region-prize');
 const level=Number(query.get('journey'));
 const prize=prizes.find(p=>progress.value.records[level]&&prizeLastLevel(p.id)===level);
 resultBox.hidden=!location.hash.startsWith('#challenge?')||!prize;
 resultBox.replaceChildren();
 if(prize)resultBox.append(element('h3','','지역 완주 기념품'),prizeCopy(prize,true));
 if(location.hash.startsWith('#avatar')&&query.has('reward')) {
  document.querySelector('.collection-prizes').open=true;
 }
}
// Catalog IDs provide the completion boundary when future region packs are appended.
function prizeLastLevel(id) {
 return journeyCatalog.chapters.find(chapter=>chapter.id===id)?.lastLevel;
}
window.addEventListener('hashchange',render);
window.addEventListener('teum-avatar-changed',render);
window.addEventListener('teum-journey-saved',render);
window.addEventListener('storage',render);
render();
