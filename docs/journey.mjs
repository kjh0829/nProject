import {journeyCatalog} from './journey-data.mjs';
import {journeyMapState,MAP_PAGE_SIZE} from './journey-catalog.mjs';
import {readJourney} from './journey-saves.mjs';
import {pieces} from './puzzle-core.mjs';
import {navigateTo} from './navigation.mjs';
const $=id=>document.getElementById(id),{chapters,levels}=journeyCatalog;
const mapURL=(region,page,level)=>'#journey?'+new URLSearchParams({region,...(page!==undefined?{page:String(page+1)}:{}),...(level?{level:String(level)}:{})});
function setLink(el,url){if(url){el.href=url;el.removeAttribute('aria-disabled');el.removeAttribute('tabindex');}else{el.removeAttribute('href');el.setAttribute('aria-disabled','true');el.tabIndex=-1;}}
function element(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
function render(){
 const {value:v,writable}=readJourney(),query=location.hash.split('?')[1]||'',m=journeyMapState(journeyCatalog,v,query),{chapter,chapterIndex,selected,current}=m;
 const completed=Object.keys(v.records).length,stars=Object.values(v.records).reduce((n,r)=>n+r.stars,0),currentLevel=levels[current-1];
 $('journey-progress').textContent=`${completed} / ${levels.length} 배달 · ★ ${stars} / ${levels.length*3}`;
 $('journey-continue').href='#challenge?journey='+current;
 $('journey-current-label').textContent=m.complete?'현재 공개된 여정 완료':'이어서 배달하기 · '+chapters[currentLevel.chapter].name;
 $('journey-current-title').textContent=`${current}. ${currentLevel.name}`;
 const inProgress=v.slots[current]?.state.status==='playing'&&v.slots[current].state.turns.length;
 $('journey-current-copy').textContent=m.complete?'별을 더 모으며 다시 걸어보세요':inProgress?'진행 중인 판 계속하기':'다음 편지 전하기';
 $('journey-save-status').textContent=writable?'진행과 별은 이 브라우저에 자동 저장됩니다.':'저장 공간을 읽지 못했어요. 기존 데이터는 보존하며, 새 진행을 저장하지 못할 수 있습니다.';
 $('journey-catalog-note').textContent=`현재 ${chapters.length}개 지역 · ${levels.length}개 스테이지 · 재도전 무제한`;
 const select=$('journey-region-select');
 if(select.options.length!==chapters.length)select.replaceChildren(...chapters.map((c,i)=>{const option=document.createElement('option');option.value=c.id;return option;}));
 chapters.forEach((c,i)=>{const count=c.levelIds.filter(id=>v.records[id]).length;select.options[i].textContent=`${i+1}. ${c.name} · ${count}/${c.levelIds.length}${c.firstLevel>current?' · 잠김':''}`;});select.value=chapter.id;
 $('journey-region-position').textContent=`${chapterIndex+1} / ${chapters.length} 지역`;
 setLink($('journey-region-prev'),chapterIndex>0?mapURL(chapters[chapterIndex-1].id):null);
 setLink($('journey-region-next'),chapterIndex<chapters.length-1?mapURL(chapters[chapterIndex+1].id):null);
 $('journey-current').href=mapURL(chapters[currentLevel.chapter].id,Math.floor(chapters[currentLevel.chapter].levelIds.indexOf(current)/MAP_PAGE_SIZE),current);
 const region=element('section','journey-region');region.style.setProperty('--region',chapter.color);region.setAttribute('aria-labelledby','journey-region-title');
 const head=element('div','journey-region-head'),icon=element('span','journey-landmark',chapter.icon);icon.setAttribute('aria-hidden','true');
 const title=element('h2','',chapter.name);title.id='journey-region-title';const range=element('span','journey-region-range',`${chapter.firstLevel}–${chapter.lastLevel}`);head.append(icon,title,range);
 const chapterDone=chapter.levelIds.filter(id=>v.records[id]).length;
 const progress=element('p','journey-region-progress',`${chapterDone} / ${chapter.levelIds.length} 완료`);
 const path=element('div','journey-path');path.setAttribute('role','group');path.setAttribute('aria-label',chapter.name+' 스테이지 선택');
 for(const level of m.visibleLevels){
  const record=v.records[level.id],locked=level.id>current,el=element('button','journey-node'+(record?' completed':'')+(level.id===current?' current':'')+(level.id===selected.id?' is-selected':''));el.type='button';el.dataset.level=level.id;el.disabled=locked;
  el.setAttribute('aria-label',`${level.id}번 ${level.name}${locked?' 잠김, 이전 스테이지를 통과하세요':record?' 완료, 별 '+record.stars+'개':' 도전 가능'}`);el.setAttribute('aria-pressed',String(level.id===selected.id));if(level.id===current&&!m.complete)el.setAttribute('aria-current','step');
  el.append(element('b','',String(level.id)),element('span','',level.name),element('small','',record?'★'.repeat(record.stars)+'☆'.repeat(3-record.stars):locked?'잠김':'도전'));
  el.addEventListener('click',()=>{navigateTo(mapURL(chapter.id,m.page,level.id));requestAnimationFrame(()=>$('journey-map').querySelector(`[data-level="${level.id}"]`)?.focus({preventScroll:true}));});path.append(el);
 }
 region.append(head,progress,path);
 const story=element('details','journey-region-story'),summary=element('summary','',chapterDone===chapter.levelIds.length?'✉ 이 지역의 편지 다시 읽기':'✉ 이 지역의 이야기');story.append(summary,element('p','',chapterDone===chapter.levelIds.length?chapter.ending:chapter.intro));region.append(story);$('journey-map').replaceChildren(region);
 const paging=$('journey-page-nav');paging.hidden=m.pageCount<=1;$('journey-page-label').textContent=`${m.page+1} / ${m.pageCount} 구간`;setLink($('journey-page-prev'),m.page>0?mapURL(chapter.id,m.page-1):null);setLink($('journey-page-next'),m.page<m.pageCount-1?mapURL(chapter.id,m.page+1):null);
 const locked=selected.id>current,record=v.records[selected.id],preview=$('journey-level-preview');preview.replaceChildren();
 const info=element('div','journey-preview-info');info.append(element('small','',record?'배달 완료 · 다시 도전':locked?'아직 열리지 않은 길':'이번 배달의 목표'),element('h3','',`${selected.id}. ${selected.name}`),element('p','',`${pieces[selected.color].name} ${selected.target}개${selected.ice.length?' · 얼음 '+selected.ice.length+'칸':''} · ${selected.moves}수`));
 if(record)info.append(element('p','journey-preview-best',`★ ${record.stars} / 3 · 내 최고 ${record.score.toLocaleString('ko-KR')}점`));preview.append(info);
 if(locked)preview.append(element('p','journey-locked-note',`${selected.id-1}번 스테이지를 통과하면 열려요.`));else{const play=element('a','journey-play',record?'다시 도전 →':v.slots[selected.id]?.state.turns.length?'계속하기 →':'시작하기 →');play.href='#challenge?journey='+selected.id;preview.append(play);}
}
$('journey-region-select').addEventListener('change',e=>navigateTo(mapURL(e.target.value)));
window.addEventListener('teum-journey-saved',()=>{if(location.hash.slice(1).split('?')[0]==='journey')render();});
window.addEventListener('storage',()=>{if(location.hash.slice(1).split('?')[0]==='journey')render();});
window.addEventListener('hashchange',()=>{if(location.hash.slice(1).split('?')[0]==='journey')render();});render();
