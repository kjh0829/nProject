import {collectionOf,outfitPrice,regionPrizes,unlockedPrizes} from './collection-core.mjs';
import {readJourney} from './journey-saves.mjs';
import {avatarItems,avatarSlots,itemById,skins,faces,avatarThemes} from './avatar-data.mjs';
import {avatarBalance} from './avatar-core.mjs';
import {readAvatar,ensureAvatar,purchaseAndWearAvatar,equipAvatar,setAvatarLook,setAvatarWish,saveLook,loadLook,setAvatarBackground} from './avatar-store.mjs';
import {avatarArt,isAvatarArtReady} from './avatar-runtime.mjs';
import {refreshAvatarBadges} from './avatar-rewards.mjs?recovery=20261121';
const $=id=>document.getElementById(id);let tab='shop',slot='top',selected=null,busy=false,ready=false,pose='idle',theme='all',draft={},search='',availability='all',sort='catalog';
const matchesTheme=item=>theme==='all'||theme==='classic'&&!item.theme||item.theme===theme;
const say=text=>{$('avatar-status').textContent=text;};
function clearPreview(){for(const id of ['avatar-stage','avatar-zoom-stage','avatar-items'])$(id).replaceChildren();}
function render(){
 if(document.body.dataset.view!=='avatar'||new URLSearchParams(location.hash.split('?')[1]||'').get('view')==='reference'){clearPreview();return;}
 $('avatar').classList.toggle('avatar-themed',theme!=='all');
 const {value:v,writable,exists}=readAvatar(),item=itemById(selected),outfit={...v.equipped,...draft},preview=Object.keys(draft).some(slot=>draft[slot]!==v.equipped[slot]);
 const focus=document.activeElement?.dataset.avatarItem;for(const b of document.querySelectorAll('[data-avatar-pose]'))b.setAttribute('aria-pressed',String(b.dataset.avatarPose===pose));
 $('avatar-stage').innerHTML=avatarArt(v,{outfit,pose});if($('avatar-zoom-dialog').open)$('avatar-zoom-stage').innerHTML=avatarArt(v,{outfit,pose});$('avatar-preview-label').textContent=preview?'미리 입어보는 중':'저장된 내 모습';$('avatar-preview-label').classList.toggle('is-preview',preview);
 $('avatar-points').textContent=writable&&exists?avatarBalance(v).toLocaleString('ko-KR'):'—';$('avatar-owned-count').textContent=v.owned.length+' / '+avatarItems.length+'개';
 $('avatar-save-note').textContent=writable?'포인트·구매한 옷·착장은 이 브라우저에 저장됩니다.':'저장 공간을 읽지 못했어요. 기존 데이터는 보존하며 구매와 착장을 저장할 수 없습니다.';
 for(const b of document.querySelectorAll('[data-avatar-tab]'))b.setAttribute('aria-pressed',String(tab===b.dataset.avatarTab));for(const b of document.querySelectorAll('[data-avatar-slot]'))b.setAttribute('aria-pressed',String(slot===b.dataset.avatarSlot));
 $('avatar-list-title').textContent=(tab==='shop'?'꾸미기 상점 · ':'내 옷장 · ')+avatarSlots.find(s=>s.id===slot).name+(theme==='all'?'':' · '+(avatarThemes.find(t=>t.id===theme)?.name||'기본 컬렉션'));
 let items=avatarItems.filter(i=>i.slot===slot&&matchesTheme(i)&&(tab==='shop'||v.owned.includes(i.id))&&i.name.toLowerCase().includes(search.trim().toLowerCase()));
 if(tab==='shop'&&availability!=='all')items=items.filter(i=>!v.owned.includes(i.id)&&(availability!=='affordable'||i.price<=avatarBalance(v)));
 const comparators={'price-up':(a,b)=>a.price-b.price,'price-down':(a,b)=>b.price-a.price,name:(a,b)=>a.name.localeCompare(b.name,'ko')};
 if(comparators[sort])items.sort(comparators[sort]);
 $('avatar-availability').disabled=tab!=='shop';$('avatar-availability').closest('label').hidden=tab!=='shop';
 const grid=$('avatar-items');grid.replaceChildren();
 for(const it of items){const owned=v.owned.includes(it.id),b=document.createElement('button');b.type='button';b.className='avatar-item'+(selected===it.id?' selected':'');b.dataset.avatarItem=it.id;b.setAttribute('aria-pressed',String(selected===it.id));b.setAttribute('aria-label',it.name+' · '+(v.equipped[it.slot]===it.id?'착용 중':owned?'보유 중':it.price+' 포인트')+' · 미리보기');b.disabled=busy||!isAvatarArtReady();const art=document.createElement('span');art.className='avatar-item-art';art.innerHTML=avatarArt(v,{outfit:{...outfit,[it.slot]:it.id},decorative:true,framing:'slot',focusSlot:it.slot});const name=document.createElement('strong');name.textContent=it.name;const label=document.createElement('small');label.textContent=v.equipped[it.slot]===it.id?'착용 중':owned?'보유 중':it.price+' P';b.append(art,name,label);b.onclick=()=>{selected=it.id;draft[it.slot]=it.id;render();};grid.append(b);}
 $('avatar-empty').hidden=items.length!==0;
 const action=$('avatar-item-action');action.hidden=!item;
 const cost=outfitPrice(v,draft) ?? 0;
 if(item){
  const owned=v.owned.includes(item.id);
  $('avatar-item-name').textContent=item.name;
  const changed=Object.keys(draft).filter(slot=>draft[slot]!==v.equipped[slot]).length;
  $('avatar-item-description').textContent=preview?'바꿀 의상 '+changed+'개 · 구매 '+cost+' P'+(cost>avatarBalance(v)?' · '+(cost-avatarBalance(v))+' P 더 필요해요.':'. 다른 부위도 함께 골라보세요.'):'현재 저장된 코디입니다.';
  action.textContent=!preview?'착용 중':cost>0?cost+' P로 코디 구매하고 입기':'이 코디 입기';
  action.disabled=!isAvatarArtReady()||!ready||busy||!writable||!exists||!preview||avatarBalance(v)<cost;
  const wish=$('avatar-wish');
  wish.textContent=collectionOf(v).wish===item.id?'♥ 목표 의상 찜 해제':owned?'보유한 의상':'♡ 목표 의상으로 찜';
  wish.disabled=busy||!ready||!writable||!exists||(owned&&collectionOf(v).wish!==item.id);
  wish.setAttribute('aria-pressed',String(collectionOf(v).wish===item.id));
  $('avatar-item-detail').hidden=false;
 }else $('avatar-item-detail').hidden=true;
 renderLooks(v,writable&&exists&&ready&&!busy&&isAvatarArtReady());
 renderBackgrounds(v,writable&&exists&&ready&&!busy&&isAvatarArtReady());
 $('avatar-preview-cancel').hidden=!preview;$('avatar-remove').hidden=!['hat','accessory'].includes(slot)||!v.equipped[slot];$('avatar-remove').textContent=slot==='hat'?'모자 벗기':'소품 빼기';$('avatar-remove').disabled=busy||!ready||!writable||!exists;
 for(const b of document.querySelectorAll('[data-avatar-look]')){const [key,id]=b.dataset.avatarLook.split(':');b.setAttribute('aria-pressed',String(v[key]===id));b.disabled=busy||!ready||!writable||!exists;}
 if(focus)grid.querySelector(`[data-avatar-item="${focus}"]`)?.focus({preventScroll:true});refreshAvatarBadges();
}
async function mutate(action,success,resetDraft=false){if(busy)return;if(!isAvatarArtReady()){say('미리보기를 불러온 뒤 다시 시도해 주세요.');return;}busy=true;render();const result=await action();busy=false;if(result.ok){if(resetDraft)draft={};say(success);}else say(({funds:'포인트가 부족해요. 게임을 완료하고 다시 골라주세요.',owned:'이미 보유한 아이템이에요. 추가 포인트는 쓰지 않았어요.','not-owned':'미리 입은 옷을 구매한 뒤 코디를 저장해 주세요.',locked:'이 지역을 완주하면 사용할 수 있어요.',storage:'저장하지 못했어요. 포인트를 차감하거나 착장을 바꾸지 않았습니다.'})[result.reason]||'이 아이템을 적용할 수 없어요. 보유한 옷을 확인해 주세요.');render();return result;}
function chooseSlot(next){
 slot=next;
 const value=readAvatar().value;
 const current=itemById(draft[slot]||value.equipped[slot]);
 selected=current&&matchesTheme(current)?current.id:avatarItems.find(item=>item.slot===slot&&matchesTheme(item)&&(tab==='shop'||value.owned.includes(item.id)))?.id||null;
 if(selected)draft[slot]=selected;
 render();
}
for(const {id,name}of avatarSlots){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.avatarSlot=id;b.onclick=()=>chooseSlot(id);$('avatar-slots').append(b);}
for(const [key,values]of [['skin',skins],['face',faces]])for(const value of values){const b=document.createElement('button');b.type='button';b.dataset.avatarLook=key+':'+value.id;b.textContent=value.name;if(value.color)b.style.setProperty('--swatch',value.color);b.onclick=()=>mutate(()=>setAvatarLook(key,value.id),'기본 모습을 저장했어요.');$(key==='skin'?'avatar-skins':'avatar-faces').append(b);}
for(const b of document.querySelectorAll('[data-avatar-tab]'))b.onclick=()=>{tab=b.dataset.avatarTab;chooseSlot(slot);};
$('avatar-empty-shop').onclick=()=>{tab='shop';search='';availability='all';$('avatar-search').value='';$('avatar-availability').value='all';chooseSlot(slot);};
$('avatar-item-action').onclick=()=>{
 void mutate(()=>purchaseAndWearAvatar({...draft}),'코디 구매·착용을 저장했어요.',true);
};
$('avatar-wish').onclick=()=>{
 const item=itemById(selected);if(!item)return;
 const next=collectionOf(readAvatar().value).wish===item.id?null:item.id;
 void mutate(()=>setAvatarWish(next),next?'목표 의상을 찜했어요. 홈과 게임 결과에서 확인해 보세요.':'목표 의상 찜을 해제했어요.');
};
$('avatar-preview-cancel').onclick=()=>{selected=null;draft={};render();say('저장된 코디를 보여드려요.');};
$('avatar-remove').onclick=()=>{delete draft[slot];void mutate(()=>equipAvatar(slot,null),'아이템을 벗고 저장했어요.');};
function renderLooks(value,enabled){
 const container=$('collection-looks');container.replaceChildren();
 collectionOf(value).looks.forEach((look,index)=>{
  const row=document.createElement('div');row.className='collection-look';
  const name=document.createElement('strong');name.textContent=look?.name||'코디 '+(index+1);
  const save=document.createElement('button');save.type='button';save.textContent=look?'덮어 저장':'이 칸에 저장';save.disabled=!enabled;
  save.dataset.saveLook=index;
  save.onclick=()=>{
   if(look&&!confirm('“'+look.name+'” 코디를 현재 미리보기로 덮어 저장할까요?'))return;
   const name=$('collection-look-name').value.trim()||'코디 '+(index+1);
   void mutate(()=>saveLook(index,name,{...draft}),'코디를 저장했어요.');
  };
  const load=document.createElement('button');load.type='button';load.textContent='입기';load.disabled=!enabled||!look;load.dataset.loadLook=index;
  load.onclick=()=>{selected=null;void mutate(()=>loadLook(index),'저장한 코디로 갈아입었어요.',true);};
  row.append(name,save,load);container.append(row);
 });
}
function renderBackgrounds(value,enabled){
 const container=$('collection-backgrounds');container.replaceChildren();
 const unlocked=unlockedPrizes(readJourney().value);
 for(const prize of [{id:'studio',background:'기본 피팅룸',name:'기본',symbol:'○'},...regionPrizes]){
  const available=prize.id==='studio'||unlocked.some(p=>p.id===prize.id);
  const button=document.createElement('button');button.type='button';button.dataset.background=prize.id;
  button.textContent=prize.symbol+' '+prize.background+(available?(prize.badge?' · '+prize.badge+' 배지 · '+prize.prop:''):' · '+prize.name+' 완주로 해금');
  button.disabled=!enabled||!available;
  const selectedBackground=unlocked.some(p=>p.id===collectionOf(value).background)?collectionOf(value).background:'studio';
  button.setAttribute('aria-pressed',String(selectedBackground===prize.id));
  button.onclick=()=>void mutate(()=>setAvatarBackground(prize.id),'기념 배경과 장식을 적용했어요.');
  container.append(button);
 }
}
window.addEventListener('teum-avatar-art-ready',render);
window.addEventListener('teum-avatar-changed',()=>{if(!busy)render();});window.addEventListener('storage',e=>{if(e.key==='teum-avatar-v1')render();});window.addEventListener('hashchange',()=>{if(location.hash.slice(1).split('?')[0]==='avatar'){selected=null;draft={};const id=new URLSearchParams(location.hash.split('?')[1]||'').get('item');const item=itemById(id);if(item){selected=id;slot=item.slot;theme='all';themeSelect.value='all';search='';availability='all';$('avatar-search').value='';$('avatar-availability').value='all';draft[slot]=id;}render();}else clearPreview();});
const themeLabel=document.createElement('label');themeLabel.className='avatar-theme-filter';themeLabel.textContent='테마 ';const themeSelect=document.createElement('select');themeSelect.id='avatar-theme';themeSelect.setAttribute('aria-label','코디 테마');themeSelect.append(new Option('전체 컬렉션','all'),new Option('기본 컬렉션','classic'));for(const t of avatarThemes)themeSelect.append(new Option(t.name,t.id));themeSelect.onchange=()=>{theme=themeSelect.value;chooseSlot(slot);say('선택한 테마의 아이템을 보여드려요. 착장은 아직 바꾸지 않았습니다.');};themeLabel.append(themeSelect);$('avatar-slots').before(themeLabel);
$('avatar-search').addEventListener('input',event=>{search=event.target.value;render();});
$('avatar-availability').addEventListener('change',event=>{availability=event.target.value;render();});
$('avatar-sort').addEventListener('change',event=>{sort=event.target.value;render();});
const initialItem=itemById(new URLSearchParams(location.hash.split('?')[1]||'').get('item'));if(initialItem){selected=initialItem.id;slot=initialItem.slot;draft[slot]=initialItem.id;}
render();ensureAvatar().then(r=>{ready=true;render();if(!r.ok)say('저장 기능을 사용할 수 없어 구매와 착장 변경을 저장하지 못할 수 있어요.');});

for(const button of document.querySelectorAll('[data-avatar-pose]'))button.onclick=()=>{pose=button.dataset.avatarPose;render();};
$('avatar-zoom').onclick=()=>{$('avatar-zoom-dialog').showModal();render();};$('avatar-zoom-close').onclick=()=>$('avatar-zoom-dialog').close();
window.addEventListener('hashchange',()=>{if(location.hash.slice(1).split('?')[0]!=='avatar'&&$('avatar-zoom-dialog').open)$('avatar-zoom-dialog').close();});

const compactObserver=new IntersectionObserver(entries=>{const entry=entries[0];$('avatar').classList.toggle('avatar-compact',document.body.dataset.view==='avatar'&&!entry.isIntersecting&&entry.boundingClientRect.top<72);},{rootMargin:'-72px 0px 0px',threshold:0});compactObserver.observe($('avatar-layout-anchor'));
