import {views,viewNames,routeFor,navView,rememberPosition} from './navigation-core.mjs';
const positions=new Map();let current=null,transitioning=true,generation=0;
try{history.scrollRestoration='manual';}catch{}
function remember(){if(current&&!transitioning)rememberPosition(positions,current.key,window.scrollY);}
function display(){
 const route=routeFor(location.hash);if(current?.key===route.key){transitioning=false;return;}
 remember();transitioning=true;const token=++generation;current=route;
 document.body.dataset.view=route.view;
 for(const id of views)document.getElementById(id).hidden=id!==route.view;
 for(const selector of ['.hero','.strip']){const el=document.querySelector(selector);if(el)el.hidden=true;}
 for(const a of document.querySelectorAll('nav a')){if(a.getAttribute('href')==='#'+navView(route.view))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
 document.title=viewNames[route.view]+' · 틈';
 const announcement=document.getElementById('view-announcement');if(announcement)announcement.textContent=viewNames[route.view]+' 화면';
 const y=positions.get(route.key)||0;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(token!==generation)return;window.scrollTo({top:y,behavior:'instant'});transitioning=false;remember();}));
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const a=event.target.closest?.('a[href^="#"]');if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return;
 const hash=a.getAttribute('href'),name=hash.slice(1).split('?')[0];if(!views.includes(name))return;
 event.preventDefault();if(hash===location.hash||(!location.hash&&hash==='#home'))return;
 remember();transitioning=true;const oldURL=location.href;history.pushState(null,'',hash);window.dispatchEvent(new HashChangeEvent('hashchange',{oldURL,newURL:location.href}));
});
window.addEventListener('scroll',remember,{passive:true});
window.addEventListener('popstate',()=>{remember();transitioning=true;});
window.addEventListener('hashchange',display);
display();
