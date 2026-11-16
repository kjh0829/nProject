import {avatarItems,avatarSlots,itemById,skins,faces,avatarThemes} from './avatar-data.mjs';
import {avatarBalance} from './avatar-core.mjs';
import {readAvatar,ensureAvatar,purchaseAvatar,equipAvatar,setAvatarLook} from './avatar-store.mjs';
import {avatarArt} from './avatar-art.mjs';
import {refreshAvatarBadges} from './avatar-rewards.mjs';
const $=id=>document.getElementById(id);let tab='shop',slot='top',selected=null,busy=false,ready=false,pose='idle',theme='all';
const matchesTheme=item=>theme==='all'||theme==='classic'&&!item.theme||item.theme===theme;
const say=text=>{$('avatar-status').textContent=text;};
function render(){
 $('avatar').classList.toggle('avatar-themed',theme!=='all');
 const {value:v,writable,exists}=readAvatar(),item=itemById(selected),preview=!!item&&v.equipped[item.slot]!==item.id,outfit=preview?{...v.equipped,[item.slot]:item.id}:v.equipped;
 const focus=document.activeElement?.dataset.avatarItem;for(const b of document.querySelectorAll('[data-avatar-pose]'))b.setAttribute('aria-pressed',String(b.dataset.avatarPose===pose));
 $('avatar-stage').innerHTML=avatarArt(v,{outfit,pose});if($('avatar-zoom-dialog').open)$('avatar-zoom-stage').innerHTML=avatarArt(v,{outfit,pose});$('avatar-preview-label').textContent=preview?'미리 입어보는 중':'저장된 내 모습';$('avatar-preview-label').classList.toggle('is-preview',preview);
 $('avatar-points').textContent=writable&&exists?avatarBalance(v).toLocaleString('ko-KR'):'—';$('avatar-owned-count').textContent=v.owned.length+' / '+avatarItems.length+'개';
 $('avatar-save-note').textContent=writable?'포인트·구매한 옷·착장은 이 브라우저에 저장됩니다.':'저장 공간을 읽지 못했어요. 기존 데이터는 보존하며 구매와 착장을 저장할 수 없습니다.';
 for(const b of document.querySelectorAll('[data-avatar-tab]'))b.setAttribute('aria-pressed',String(tab===b.dataset.avatarTab));for(const b of document.querySelectorAll('[data-avatar-slot]'))b.setAttribute('aria-pressed',String(slot===b.dataset.avatarSlot));
 $('avatar-list-title').textContent=(tab==='shop'?'꾸미기 상점 · ':'내 옷장 · ')+avatarSlots.find(s=>s.id===slot).name+(theme==='all'?'':' · '+(avatarThemes.find(t=>t.id===theme)?.name||'기본 컬렉션'));
 const items=avatarItems.filter(i=>i.slot===slot&&matchesTheme(i)&&(tab==='shop'||v.owned.includes(i.id))),grid=$('avatar-items');grid.replaceChildren();
 for(const it of items){const owned=v.owned.includes(it.id),b=document.createElement('button');b.type='button';b.className='avatar-item'+(selected===it.id?' selected':'');b.dataset.avatarItem=it.id;b.setAttribute('aria-pressed',String(selected===it.id));b.setAttribute('aria-label',it.name+' · '+(v.equipped[it.slot]===it.id?'착용 중':owned?'보유 중':it.price+' 포인트')+' · 미리보기');b.disabled=busy;const art=document.createElement('span');art.className='avatar-item-art';art.innerHTML=avatarArt(v,{outfit:{...v.equipped,[it.slot]:it.id},decorative:true,framing:'slot',focusSlot:it.slot});const name=document.createElement('strong');name.textContent=it.name;const label=document.createElement('small');label.textContent=v.equipped[it.slot]===it.id?'착용 중':owned?'보유 중':it.price+' P';b.append(art,name,label);b.onclick=()=>{selected=it.id;render();};grid.append(b);}
 $('avatar-empty').hidden=items.length!==0;
 const action=$('avatar-item-action');action.hidden=!item;if(item){const owned=v.owned.includes(item.id),equipped=v.equipped[item.slot]===item.id;$('avatar-item-name').textContent=item.name;$('avatar-item-description').textContent=owned?(equipped?'지금 입고 있는 아이템이에요.':'보유한 아이템입니다. 포인트 없이 갈아입을 수 있어요.'):'미리보기에는 포인트가 들지 않아요. 구매한 뒤 입을 수 있어요.';action.textContent=equipped?'착용 중':owned?'이 옷 입기':avatarBalance(v)<item.price?`${item.price-avatarBalance(v)} P 더 모으면 구매 가능`:`${item.price} P로 구매하기`;action.disabled=!ready||busy||!writable||!exists||equipped||!owned&&avatarBalance(v)<item.price;$('avatar-item-detail').hidden=false;}else $('avatar-item-detail').hidden=true;
 $('avatar-preview-cancel').hidden=!preview;$('avatar-remove').hidden=!['hat','accessory'].includes(slot)||!v.equipped[slot];$('avatar-remove').textContent=slot==='hat'?'모자 벗기':'소품 빼기';$('avatar-remove').disabled=busy||!ready||!writable||!exists;
 for(const b of document.querySelectorAll('[data-avatar-look]')){const [key,id]=b.dataset.avatarLook.split(':');b.setAttribute('aria-pressed',String(v[key]===id));b.disabled=busy||!ready||!writable||!exists;}
 if(focus)grid.querySelector(`[data-avatar-item="${focus}"]`)?.focus({preventScroll:true});refreshAvatarBadges();
}
async function mutate(action,success){if(busy)return;busy=true;render();const result=await action();busy=false;if(result.ok)say(success);else say(({funds:'포인트가 부족해요. 게임을 완료하고 다시 골라주세요.',owned:'이미 보유한 아이템이에요. 추가 포인트는 쓰지 않았어요.',storage:'저장하지 못했어요. 포인트를 차감하거나 착장을 바꾸지 않았습니다.'})[result.reason]||'이 아이템을 적용할 수 없어요. 보유한 옷을 확인해 주세요.');render();return result;}
function chooseSlot(next){slot=next;const v=readAvatar().value;selected=(itemById(v.equipped[slot])&&matchesTheme(itemById(v.equipped[slot]))?v.equipped[slot]:null)||avatarItems.find(i=>i.slot===slot&&matchesTheme(i)&&(tab==='shop'||v.owned.includes(i.id)))?.id||null;render();}
for(const {id,name}of avatarSlots){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.avatarSlot=id;b.onclick=()=>chooseSlot(id);$('avatar-slots').append(b);}
for(const [key,values]of [['skin',skins],['face',faces]])for(const value of values){const b=document.createElement('button');b.type='button';b.dataset.avatarLook=key+':'+value.id;b.textContent=value.name;if(value.color)b.style.setProperty('--swatch',value.color);b.onclick=()=>mutate(()=>setAvatarLook(key,value.id),'기본 모습을 저장했어요.');$(key==='skin'?'avatar-skins':'avatar-faces').append(b);}
for(const b of document.querySelectorAll('[data-avatar-tab]'))b.onclick=()=>{tab=b.dataset.avatarTab;chooseSlot(slot);};
$('avatar-empty-shop').onclick=()=>{tab='shop';chooseSlot(slot);};
$('avatar-item-action').onclick=()=>{const item=itemById(selected);if(!item)return;const owned=readAvatar().value.owned.includes(item.id);void mutate(()=>owned?equipAvatar(item.slot,item.id):purchaseAvatar(item.id),owned?item.name+' 착용을 저장했어요.':item.name+' 구매 완료! 이 옷 입기를 눌러 갈아입어보세요.');};
$('avatar-preview-cancel').onclick=()=>{selected=null;render();say('미리보기를 닫고 저장된 모습으로 돌아왔어요.');};
$('avatar-remove').onclick=()=>mutate(()=>equipAvatar(slot,null),'저장된 착장에서 아이템을 뺐어요.');
window.addEventListener('teum-avatar-changed',()=>{if(!busy)render();});window.addEventListener('storage',e=>{if(e.key==='teum-avatar-v1')render();});window.addEventListener('hashchange',()=>{if(location.hash.slice(1).split('?')[0]==='avatar'){selected=null;render();}});
const themeLabel=document.createElement('label');themeLabel.className='avatar-theme-filter';themeLabel.textContent='테마 ';const themeSelect=document.createElement('select');themeSelect.id='avatar-theme';themeSelect.setAttribute('aria-label','코디 테마');themeSelect.append(new Option('전체 컬렉션','all'),new Option('기본 컬렉션','classic'));for(const t of avatarThemes)themeSelect.append(new Option(t.name,t.id));themeSelect.onchange=()=>{theme=themeSelect.value;chooseSlot(slot);say('선택한 테마의 아이템을 보여드려요. 착장은 아직 바꾸지 않았습니다.');};themeLabel.append(themeSelect);$('avatar-slots').before(themeLabel);
render();ensureAvatar().then(r=>{ready=true;render();if(!r.ok)say('저장 기능을 사용할 수 없어 구매와 착장 변경을 저장하지 못할 수 있어요.');});

for(const button of document.querySelectorAll('[data-avatar-pose]'))button.onclick=()=>{pose=button.dataset.avatarPose;render();};
$('avatar-zoom').onclick=()=>{$('avatar-zoom-dialog').showModal();render();};$('avatar-zoom-close').onclick=()=>$('avatar-zoom-dialog').close();
window.addEventListener('hashchange',()=>{if(location.hash.slice(1).split('?')[0]!=='avatar'&&$('avatar-zoom-dialog').open)$('avatar-zoom-dialog').close();});

const compactObserver=new IntersectionObserver(entries=>{const entry=entries[0];$('avatar').classList.toggle('avatar-compact',document.body.dataset.view==='avatar'&&!entry.isIntersecting&&entry.boundingClientRect.top<72);},{rootMargin:'-72px 0px 0px',threshold:0});compactObserver.observe($('avatar-layout-anchor'));
