// A DOM boundary around optional, bounded Canvas artwork. No SVG mesh enters UI.
let renderer=null,pending=null,failed=false,notified=false;
const records=new Map();
const signal=target=>window.dispatchEvent(new CustomEvent('teum-avatar-art-ready',{detail:{target}}));
function notice(){
 if(notified)return;notified=true;
 const box=document.createElement('div');box.id='avatar-render-notice';box.className='avatar-render-notice';box.setAttribute('role','status');
 const copy=document.createElement('span');copy.textContent='캐릭터 미리보기를 불러오지 못했어요. 게임과 기록은 계속 이용할 수 있습니다.';
 const retry=document.createElement('button');retry.type='button';retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();
 box.append(copy,retry);document.querySelector('header')?.after(box);
}
const fallback=(target,state)=>{const el=document.createElement('span');el.className='avatar-render-fallback';el.dataset.avatarRenderState=state;el.textContent=state==='failed'?'미리보기를 불러오지 못했어요.':'캐릭터를 불러오는 중…';target.replaceChildren(el);};
function release(record){
 if(records.get(record.target)!==record)return;
 records.delete(record.target);if(record.canvas)record.canvas.width=record.canvas.height=0;record.target.replaceChildren();
}
export function releaseAvatar(container){for(const record of records.values())if(record.target===container||container.contains(record.target))release(record);container.replaceChildren();}
export const isAvatarArtReady=()=>!!renderer&&!failed;
export const hasAvatarPreview=target=>records.get(target)?.canvas?.width>0;
export function ensureAvatarArt(){
 if(failed)return Promise.reject(Error('캐릭터 미리보기를 다시 불러온 뒤 시도해 주세요.'));
 if(!pending)pending=import('./avatar-canvas.mjs?renderer=20261122-shoes1').then(module=>{if(typeof module.renderAvatarCanvas!=='function')throw Error('Missing avatar renderer');renderer=module;queueMicrotask(()=>signal(null));return module;}).catch(error=>{failed=true;notice();signal(null);throw Error('캐릭터 미리보기를 다시 불러온 뒤 시도해 주세요.',{cause:error});});
 return pending;
}
export async function createAvatarImage(value,options={}){try{const module=await ensureAvatarArt();return await module.renderAvatarCanvas(value,options);}catch(error){throw Error('캐릭터 미리보기를 다시 불러온 뒤 시도해 주세요.',{cause:error});}}
export const avatarPreviewStats=()=>({activePreviews:records.size,canvasPixels:[...records.values()].reduce((n,r)=>n+(r.canvas?.width||0)*(r.canvas?.height||0),0)});
export function renderAvatar(target,value={},options={}){
 const framing=options.framing||'full';
 const size=framing==='slot'?{width:420,height:420}:framing==='portrait'?{width:400,height:650}:options.zoom?{width:656,height:1536}:{width:560,height:1312};
 const key=JSON.stringify([value.skin,value.face,value.equipped,options.outfit,framing,options.focusSlot,!!options.zoom]);
 const previous=records.get(target);if(previous?.key===key){if(previous.canvas)options.onReady?.();return;}
 if(previous)release(previous);
 const record={target,key,canvas:null};records.set(target,record);fallback(target,'loading');
 const isCurrent=()=>records.get(target)===record&&target.isConnected&&!target.closest('[hidden]');
 void (async()=>{
  const module=await ensureAvatarArt();if(!isCurrent())return;
  const image=await module.renderAvatarCanvas(value,{...options,...size,isCurrent});
  if(!isCurrent()){image.width=image.height=0;return;}
  image.className='avatar-sprite avatar-raster';image.dataset.avatarRenderState='ready';
  if(options.decorative)image.setAttribute('aria-hidden','true');else{image.setAttribute('role','img');image.setAttribute('aria-label','내 캐릭터 · '+[...image.children].map(el=>el.dataset.item).join(', '));}
  record.canvas=image;target.replaceChildren(image);options.onReady?.();signal(target);
 })().catch(error=>{if(error.name==='AbortError'||!isCurrent())return;fallback(target,'failed');notice();signal(target);});
}
function releaseHidden(){for(const record of records.values())if(!record.target.isConnected||record.target.closest('[hidden]'))release(record);}
new MutationObserver(releaseHidden).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
function suspend(){for(const record of records.values())release(record);renderer?.clearAvatarTextureCache();}
window.addEventListener('pagehide',suspend);
window.addEventListener('pageshow',event=>{if(event.persisted)signal(null);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else signal(null);});
