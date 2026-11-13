export async function shareResult({title,text,url,container,status}){
 const message=text+'\n'+url;
 if(navigator.share){try{await navigator.share({title,text,url});status.textContent='공유 창을 열었어요.';return;}catch(error){if(error.name==='AbortError'){status.textContent='공유를 취소했어요.';return;}}}
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);status.textContent='결과와 링크를 복사했어요.';return;}catch{}
 container.replaceChildren();container.hidden=false;const label=document.createElement('label');label.textContent='결과를 선택해서 직접 복사해 주세요.';const area=document.createElement('textarea');area.readOnly=true;area.value=message;area.setAttribute('aria-label','공유할 결과와 링크');label.append(area);container.append(label);area.focus();area.select();status.textContent='자동 복사를 사용할 수 없어 직접 복사할 내용을 열었어요.';
}
