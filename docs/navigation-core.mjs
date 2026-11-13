export const views=['home','meal-lab','saved-meals','meal-compose','meal','arcade','challenge','story','read','fire','play','community'];
export const viewNames={home:'알찬 한끼 구경','meal-lab':'내 재료로 한끼 고르기', 'saved-meals':'내 식탁', 'meal-compose':'한끼 기록',meal:'한끼 상세',arcade:'쉬는 틈',challenge:'한 정거장 퍼즐',story:'1분 선택극',read:'기록과 읽을거리',fire:'쌓는 틈',play:'쉬는 틈',community:'나누는 틈'};
export function routeFor(hash=''){const raw=String(hash).replace(/^#/,'').slice(0,2000),name=raw.split('?')[0];return views.includes(name)?{view:name,key:'#'+raw}:{view:'home',key:'#home'};}
export function navView(view){return view==='meal'?'home':['fire','play','community','arcade','challenge','story'].includes(view)?'read':view;}
export function rememberPosition(map,key,y){if(!key||!Number.isFinite(y))return;map.delete(key);map.set(key,Math.max(0,y));while(map.size>64)map.delete(map.keys().next().value);}
