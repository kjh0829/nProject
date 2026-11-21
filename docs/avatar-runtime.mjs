// Optional artwork must never stop navigation, games, or saved-record handling.
// A new URL also recovers clients that cached the previous renderer.
let renderer=null,pending=null,failed=false,notified=false;
function signal(){queueMicrotask(()=>window.dispatchEvent(new Event('teum-avatar-art-ready')));}
function notice(){
 if(notified||typeof document==='undefined')return;notified=true;
 const box=document.createElement('div');box.id='avatar-render-notice';box.className='avatar-render-notice';box.setAttribute('role','status');
 const copy=document.createElement('span');copy.textContent='캐릭터 미리보기를 불러오지 못했어요. 게임과 기록은 계속 이용할 수 있습니다.';
 const retry=document.createElement('button');retry.type='button';retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();
 box.append(copy,retry);document.querySelector('header')?.after(box);
}
export function ensureAvatarArt(){
 if(renderer&&!failed)return Promise.resolve();
 if(failed)return Promise.reject(Error('캐릭터 미리보기를 다시 불러온 뒤 시도해 주세요.'));
 if(!pending)pending=import('./avatar-art.mjs?recovery=20261121').then(module=>{if(typeof module.avatarArt!=='function')throw Error('Missing avatar renderer');renderer=module.avatarArt;signal();}).catch(error=>{failed=true;notice();signal();throw Error('캐릭터 미리보기를 다시 불러온 뒤 시도해 주세요.',{cause:error});});
 return pending;
}
export const isAvatarArtReady=()=>typeof renderer==='function'&&!failed;
export function avatarArt(value={},options={}){
 if(isAvatarArtReady()){
  try{return renderer(value,options);}catch{renderer=null;failed=true;notice();signal();}
 }
 if(!failed)void ensureAvatarArt().catch(()=>{});
 return `<span class="avatar-render-fallback" data-avatar-render-state="${failed?'failed':'loading'}" ${options.decorative?'aria-hidden="true"':'role="status"'}>${failed?'미리보기를 불러오지 못했어요.':'캐릭터를 불러오는 중…'}</span>`;
}
