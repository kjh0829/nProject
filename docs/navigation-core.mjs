export const views=['home','challenge','story','read','fire','play','community'];
export const viewNames={home:'3분 놀이터',challenge:'한 정거장 퍼즐',story:'1분 선택극',read:'기록과 읽을거리',fire:'쌓는 틈',play:'쉬는 틈',community:'나누는 틈'};
export function routeFor(hash=''){const raw=String(hash).replace(/^#/,'').slice(0,2000),name=raw.split('?')[0];return views.includes(name)?{view:name,key:'#'+raw}:{view:'home',key:'#home'};}
export function navView(view){return ['fire','play','community'].includes(view)?'read':view;}
export function rememberPosition(map,key,y){if(!key||!Number.isFinite(y))return;map.delete(key);map.set(key,Math.max(0,y));while(map.size>64)map.delete(map.keys().next().value);}
