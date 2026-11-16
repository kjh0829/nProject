import {avatarItems,avatarSlots,starterOutfit,skins,faces} from './avatar-data.mjs';
import {avatarLayers,avatarAtlases,avatarFaceSources} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
export const avatarQaVersion='wardrobe-qa-v1';
const rect=(r,positive=false)=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>0&&r[3]>0&&(!positive||r[0]>=0&&r[1]>=0);
export function validateAvatarCatalog(items=avatarItems,layers=avatarLayers,atlases=avatarAtlases,profiles=avatarProfiles){
 const errors=[],ids=new Set(),slots=new Set(avatarSlots.map(s=>s.id));
 const profileKeys=new Set('slot kind probes framing bareArms faceClear longLegs waistJoin waistLift legStart overTop boot mirror behindHair faceClip segmentCount lining outer'.split(' '));
 for(const [name,p]of Object.entries(profiles)){if(p.framing!==undefined&&typeof p.framing!=='string')errors.push(`profile ${name}: invalid preview framing`);if(Object.keys(p).some(k=>!profileKeys.has(k))||['bareArms','faceClear','longLegs','overTop','boot','mirror','behindHair','faceClip','lining','outer'].some(k=>p[k]!==undefined&&typeof p[k]!=='boolean'))errors.push(`profile ${name}: unknown/invalid fields`);if(p.kind==='waist'&&(!Number.isFinite(p.waistLift)||p.waistLift<0||p.waistLift>128))errors.push(`profile ${name}: invalid waist lift`);}
 for(const [name,p]of Object.entries(profiles))if(!slots.has(p.slot)||!['plain','segments','waist'].includes(p.kind)||!Array.isArray(p.probes)||!p.probes.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=0&&v[0]<1024&&v[1]>=0&&v[1]<1536)||p.kind==='segments'&&(!Number.isInteger(p.segmentCount)||p.segmentCount<1))errors.push(`profile ${name}: invalid fitting rules`);
 for(const [name,a]of Object.entries(atlases))if(!/^[a-z][a-z0-9-]*$/.test(name)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1)errors.push(`atlas ${name}: invalid name/dimensions`);
 for(const item of items){const id=item.id;if(!/^[a-z][a-z0-9-]*$/.test(id)||ids.has(id))errors.push(`${id}: duplicate/unsafe ID`);ids.add(id);if(!slots.has(item.slot))errors.push(`${id}: unknown slot`);const a=layers[id];if(!a){errors.push(`${id}: missing artwork registration`);continue;}const p=profiles[a.profile],atlas=atlases[a.atlas];if(!p||p.slot!==item.slot){errors.push(`${id}: missing/incompatible fitting profile`);continue;}if(!atlas){errors.push(`${id}: unregistered atlas`);continue;}
  const boxes=[a,...(Array.isArray(a.segments)?a.segments:[])];for(const box of boxes){if(!rect(box.source,true)||box.source[0]+box.source[2]>atlas.width||box.source[1]+box.source[3]>atlas.height)errors.push(`${id}: source rectangle outside atlas`);if(!rect(box.target)||box.target[0]<160||box.target[1]<-100||box.target[0]+box.target[2]>860||box.target[1]+box.target[3]>1540)errors.push(`${id}: target rectangle outside full view`);}
  if(item.slot==='top'){
   const n=a.neckline;
   if(!n||Object.keys(n).some(k=>!['shift','opening'].includes(k))||!Number.isFinite(n.shift)||n.shift< -45||n.shift>20||!Array.isArray(n.opening)||n.opening.length!==3||!n.opening.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=450&&v[0]<=550&&v[1]>=235&&v[1]<=305)||!(n.opening[0][0]<n.opening[1][0]&&n.opening[1][0]<n.opening[2][0])||n.opening[1][1]<Math.max(n.opening[0][1],n.opening[2][1])||!rect(a.target)||a.target[0]>=430||a.target[0]+a.target[2]<=650||a.target[1]>=290||a.target[1]+a.target[3]<=380)errors.push(`${id}: invalid/missing neckline fitting`);
  }
  if(p.kind!=='segments'&&a.segments!==undefined)errors.push(`${id}: unused segment registration`);
  if(p.kind==='segments'&&(!Array.isArray(a.segments)||a.segments.length!==p.segmentCount))errors.push(`${id}: incomplete registered segments`);
  if(p.kind==='waist'&&(!rect(a.target)||!Number.isFinite(p.waistJoin)||p.waistJoin<=a.target[1]||p.waistJoin>=a.target[1]+a.target[3]))errors.push(`${id}: invalid waistband join`);
 }
 for(const id of Object.keys(layers))if(!ids.has(id))errors.push(`${id}: artwork has no catalog item`);
 for(const slot of avatarSlots)if(!items.some(i=>i.slot===slot.id))errors.push(`${slot.id}: empty catalog slot`);
 for(const face of faces){const r=avatarFaceSources[face.id],a=atlases.faces;if(!rect(r,true)||!a||r[0]+r[2]>a.width||r[1]+r[3]>a.height)errors.push(`${face.id}: invalid face source`);}
 return errors;
}
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
export const avatarQaGroups={item:'각 아이템', 'top-bottom':'상의 × 하의','bottom-shoes':'하의 × 신발','hair-hat':'머리 × 모자 × 표정','hair-accessory':'머리 × 소품','top-accessory':'상의 × 소품','top-look':'상의 × 피부 × 표정',look:'피부 × 표정','hair-skin':'머리 × 피부'};
export function buildAvatarQaPlan(items=avatarItems,layers=avatarLayers){
 const errors=validateAvatarCatalog(items,layers);if(errors.length)throw Error(errors.join('\n'));
 const by=slot=>items.filter(i=>i.slot===slot),cases=new Map(),collision=new Map(),pairCounts={};
 const add=(group,outfit={},look={},isolate=null)=>{const full={...starterOutfit,...outfit},appearance={skin:'peach',face:'smile',...look},key=JSON.stringify([full,appearance,isolate]),id='fit-'+hash(key);if(collision.has(id)&&collision.get(id)!==key)throw Error('QA case hash collision');collision.set(id,key);pairCounts[group]=(pairCounts[group]||0)+1;if(cases.has(key)){cases.get(key).groups.push(group);return;}cases.set(key,{id,outfit:full,look:appearance,isolate,groups:[group]});};
 for(const item of items)add('item',{[item.slot]:item.id},{},item.id);
 for(const top of by('top'))for(const bottom of by('bottom'))add('top-bottom',{top:top.id,bottom:bottom.id});
 for(const bottom of by('bottom'))for(const shoes of by('shoes'))add('bottom-shoes',{bottom:bottom.id,shoes:shoes.id});
 for(const hair of by('hair'))for(const hat of [null,...by('hat')])for(const face of faces)add('hair-hat',{hair:hair.id,hat:hat?.id||null},{face:face.id});
 for(const hair of by('hair'))for(const accessory of by('accessory'))add('hair-accessory',{hair:hair.id,accessory:accessory.id});
 for(const top of by('top'))for(const accessory of by('accessory'))add('top-accessory',{top:top.id,accessory:accessory.id});
 for(const top of by('top'))for(const skin of skins)for(const face of faces)add('top-look',{top:top.id},{skin:skin.id,face:face.id});
 for(const skin of skins)for(const face of faces)add('look',{}, {skin:skin.id,face:face.id});
 for(const hair of by('hair'))for(const skin of skins)add('hair-skin',{hair:hair.id},{skin:skin.id});
 return {version:avatarQaVersion,itemCount:items.length,pairCounts,cases:[...cases.values()]};
}
export function avatarQaShards(plan,size=64,maxShards=16){if(!Number.isInteger(size)||size<1)throw Error('Invalid shard size');const count=Math.max(1,Math.ceil(plan.cases.length/size));if(count>maxShards)throw Error(`QA needs ${count} shards. Increase the reviewed CI budget; cases are never silently skipped.`);return Array.from({length:count},(_,index)=>({index,start:index*size,end:Math.min((index+1)*size,plan.cases.length)}));}
export function summarizeAvatarQa(plan,reports,commit=null){
 const expected=new Set(plan.cases.map(c=>c.id)),seen=new Set(),duplicate=[],extra=[],failed=[],errors=[];
 const shards=avatarQaShards(plan),shardIds=new Set();
 for(const report of reports){if(report.version!==plan.version||report.totalPlanned!==plan.cases.length||commit&&report.commit!==commit)errors.push('Report version/count/commit mismatch');if(!Number.isInteger(report.shard)||report.shard<0||report.shard>=shards.length||shardIds.has(report.shard))errors.push('Missing/duplicate/invalid shard');shardIds.add(report.shard);if(report.checked!==report.results?.length)errors.push('Reported check count mismatch');for(const result of report.results||[]){if(seen.has(result.id))duplicate.push(result.id);seen.add(result.id);if(!expected.has(result.id))extra.push(result.id);if(result.passed!==true||!Array.isArray(result.failures)||result.failures.length)failed.push(result);}}
 const missing=[...expected].filter(id=>!seen.has(id));if(shardIds.size!==shards.length)errors.push('Incomplete shard set');
 return {version:plan.version,commit,planned:plan.cases.length,checked:seen.size,passed:!missing.length&&!duplicate.length&&!extra.length&&!failed.length&&!errors.length,missing,duplicate,extra,failed,errors};
}
