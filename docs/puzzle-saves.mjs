import {validSnapshot} from './puzzle-core.mjs';
export const RUNS_KEY='teum-puzzle-saves-v2',LEGACY_KEY='teum-puzzle-run-v1';
export const emptyRuns=()=>({version:2,order:[],slots:{}});
export function validSlot(slot){
 if(!slot||typeof slot.key!=='string'||!validSnapshot(slot.state))return false;
 const s=slot.state;if(/^stage-[1-5]$/.test(slot.key)){if(slot.key!=='stage-'+s.stage||s.seed!=='teum-stage-'+s.stage)return false;}
 else if(/^daily-\d{4}-\d{2}-\d{2}$/.test(slot.key)){const date=slot.key.slice(6),parsed=new Date(date+'T00:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||s.stage!==3||!(s.seed.startsWith('teum-daily-'+date+'-')||s.seed==='teum-stage-3'))return false;}
 else return false;
 if(slot.undo!=null&&(!validSnapshot(slot.undo)||slot.undo.status!=='playing'||slot.undo.seed!==s.seed||slot.undo.stage!==s.stage||slot.undo.moves!==s.moves+1))return false;
 if(slot.restart!=null&&(s.turns.length!==0||slot.restart.state?.seed!==s.seed||slot.restart.state?.stage!==s.stage||!slot.restart.state?.turns?.length||!validSlot({key:slot.key,state:slot.restart.state,undo:slot.restart.undo})))return false;
 return true;
}
export function normalizeRuns(raw){
 if(!raw||raw.version!==2||!Array.isArray(raw.order)||!raw.slots||typeof raw.slots!=='object'||Array.isArray(raw.slots))throw Error('Invalid puzzle saves');
 const order=[...new Set(raw.order)];if(!order.every(k=>typeof k==='string'&&Object.hasOwn(raw.slots,k)&&raw.slots[k]?.key===k&&validSlot(raw.slots[k])))throw Error('Invalid saved puzzle');
 let daily=0;const retained=order.filter(k=>!k.startsWith('daily-')||daily++<14);return {version:2,order:retained,slots:Object.fromEntries(retained.map(k=>[k,raw.slots[k]]))};
}
export function withRun(vault,slot){if(!validSlot(slot))throw Error('Cannot save invalid run');return normalizeRuns({version:2,order:[slot.key,...vault.order.filter(k=>k!==slot.key)],slots:{...vault.slots,[slot.key]:slot}});}
export function readRuns(storage){
 let vault=emptyRuns();try{storage=storage??globalThis.localStorage;
  const raw=storage.getItem(RUNS_KEY);if(raw!==null)return {vault:normalizeRuns(JSON.parse(raw)),writable:true};
  const legacy=storage.getItem(LEGACY_KEY);if(legacy!==null){const slot=JSON.parse(legacy);if(validSlot(slot))vault=withRun(vault,{...slot,undo:null});}
  return {vault,writable:true};
 }catch{return {vault,writable:false};}
}
export function saveRun(slot,storage){try{storage=storage??globalThis.localStorage;const current=readRuns(storage);if(!current.writable)return false;const next=withRun(current.vault,slot);storage.setItem(RUNS_KEY,JSON.stringify(next));return true;}catch{return false;}}
export function continueRun(vault){return vault.order.map(k=>vault.slots[k]).find(slot=>slot.state.status==='playing'&&slot.state.turns.length>0)||null;}
