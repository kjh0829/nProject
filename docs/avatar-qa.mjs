import {avatarWaistRig,fitAvatarWaist,avatarWaistMeshAxes} from './avatar-waist.mjs';
import {avatarEyeRig} from './avatar-rig.mjs';
import {avatarWristRig} from './avatar-neckline.mjs';
import {avatarItems,avatarSlots,starterOutfit,skins,faces} from './avatar-data.mjs';
import {avatarLayers,avatarAtlases,avatarFaceSources} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
import {avatarFootRig,fittedShoePoint,shoeOpeningBounds} from './avatar-shoe-fit.mjs';
export const avatarQaVersion='wardrobe-qa-v3';
const rect=(r,positive=false)=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>0&&r[3]>0&&(!positive||r[0]>=0&&r[1]>=0);
export function validateAvatarCatalog(items=avatarItems,layers=avatarLayers,atlases=avatarAtlases,profiles=avatarProfiles){
 const errors=[],ids=new Set(),slots=new Set(avatarSlots.map(s=>s.id));
 const profileKeys=new Set('slot kind probes framing bareArms faceClear longLegs legStart overTop boot mirror behindHair faceClip segmentCount lining outer shoulderClip eyeFit perch'.split(' '));
 for(const [name,p]of Object.entries(profiles)){if(p.framing!==undefined&&typeof p.framing!=='string')errors.push(`profile ${name}: invalid preview framing`);if(Object.keys(p).some(k=>!profileKeys.has(k))||['bareArms','faceClear','longLegs','overTop','boot','mirror','behindHair','faceClip','lining','outer','shoulderClip','eyeFit','perch'].some(k=>p[k]!==undefined&&typeof p[k]!=='boolean'))errors.push(`profile ${name}: unknown/invalid fields`);}
 for(const [name,p]of Object.entries(profiles))if(!slots.has(p.slot)||!['plain','segments','waist'].includes(p.kind)||!Array.isArray(p.probes)||!p.probes.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=0&&v[0]<1024&&v[1]>=0&&v[1]<1536)||p.kind==='segments'&&(!Number.isInteger(p.segmentCount)||p.segmentCount<1))errors.push(`profile ${name}: invalid fitting rules`);
 for(const [name,a]of Object.entries(atlases))if(!/^[a-z][a-z0-9-]*$/.test(name)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1)errors.push(`atlas ${name}: invalid name/dimensions`);
 for(const item of items){const id=item.id;if(!/^[a-z][a-z0-9-]*$/.test(id)||ids.has(id))errors.push(`${id}: duplicate/unsafe ID`);ids.add(id);if(!slots.has(item.slot))errors.push(`${id}: unknown slot`);const a=layers[id];if(!a){errors.push(`${id}: missing artwork registration`);continue;}const p=profiles[a.profile],atlas=atlases[a.atlas];if(!p||p.slot!==item.slot){errors.push(`${id}: missing/incompatible fitting profile`);continue;}if(!atlas){errors.push(`${id}: unregistered atlas`);continue;}
  const boxes=[a,...(Array.isArray(a.segments)?a.segments:[])];for(const box of boxes){if(!rect(box.source,true)||box.source[0]+box.source[2]>atlas.width||box.source[1]+box.source[3]>atlas.height)errors.push(`${id}: source rectangle outside atlas`);if(!rect(box.target)||box.target[0]<160||box.target[1]<-100||box.target[0]+box.target[2]>860||box.target[1]+box.target[3]>1540)errors.push(`${id}: target rectangle outside full view`);}
  if(['top','bottom'].includes(item.slot)){
   const f=a.waist,point=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
   const okay=f&&Object.keys(f).every(k=>['points','rise'].includes(k))&&Array.isArray(f.points)&&f.points.length===3&&f.points.every(point)&&f.points[0][0]>=405&&f.points[0][0]<500&&f.points[1][0]>500&&f.points[1][0]<620&&f.points[2][0]>620&&f.points[2][0]<=700&&f.points.every(p=>p[1]>=540&&p[1]<=700)&&Math.abs(f.points[2][1]-f.points[0][1])<35&&f.points[1][1]>=Math.max(f.points[0][1],f.points[2][1])-4&&f.points[1][1]<=Math.max(f.points[0][1],f.points[2][1])+55&&Number.isFinite(f.rise)&&f.rise>=-50&&f.rise<=20&&(item.slot!=='top'||f.rise===0)&&(!p.overTop||f.rise<0)&&rect(a.target)&&f.points.every(v=>v[0]>a.target[0]&&v[0]<a.target[0]+a.target[2]&&v[1]>a.target[1]&&v[1]<a.target[1]+a.target[3]);
   if(!okay)errors.push(`${id}: invalid/missing waist registration`);
   else {
    const axes=avatarWaistMeshAxes(a,a.target,item.slot),xs=[...new Set([a.target[0],...axes.xs,a.target[0]+a.target[2]])].sort((a,b)=>a-b),ys=[...new Set([Math.max(a.target[1],item.slot==='top'?480:p.overTop?440:500),...axes.ys,Math.min(a.target[1]+a.target[3],item.slot==='top'?850:p.overTop?950:900)])].sort((a,b)=>a-b);
    for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++)for(const tri of [[[xs[i],ys[j]],[xs[i+1],ys[j]],[xs[i+1],ys[j+1]]],[[xs[i],ys[j]],[xs[i+1],ys[j+1]],[xs[i],ys[j+1]]]]){
     const [A,B,C]=tri.map(v=>fitAvatarWaist(v,a,item.slot)),area=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);
     if(!Number.isFinite(area)||area<.18*(xs[i+1]-xs[i])*(ys[j+1]-ys[j]))errors.push(`${id}: folded waist mesh`);
    }
   }
  }else if(a.waist!==undefined)errors.push(`${id}: waist registration on incompatible slot`);
  if(item.slot==='top'){
   const n=a.neckline;
   if(!n||Object.keys(n).some(k=>!['shift','scale','lift','opening','tilt'].includes(k))||!Number.isFinite(n.tilt)||Math.abs(n.tilt)>12||!Number.isFinite(n.scale)||n.scale<.5||n.scale>1.2||!Number.isFinite(n.lift)||n.lift< -25||n.lift>5||!Number.isFinite(n.shift)||n.shift< -45||n.shift>20||460+n.shift-70*(n.scale-1)<=420||600+n.shift+70*(n.scale-1)>=690||!Array.isArray(n.opening)||n.opening.length!==3||!n.opening.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=450&&v[0]<=550&&v[1]>=235&&v[1]<=305)||!(n.opening[0][0]<n.opening[1][0]&&n.opening[1][0]<n.opening[2][0])||n.opening[1][1]<Math.max(n.opening[0][1],n.opening[2][1])||!rect(a.target)||a.target[0]>=420||a.target[0]+a.target[2]<=690||a.target[1]>=290||a.target[1]+a.target[3]<=380)errors.push(`${id}: invalid/missing neckline fitting`);
  }
  if(item.slot==='top'&&!p.bareArms){const c=a.cuffs;if(!rect(a.target)||a.target[0]>=350||a.target[0]+a.target[2]<=730||a.target[1]+a.target[3]<=600||!c||Object.keys(c).some(k=>!['scale','rightShift','openings','frames'].includes(k))||!Number.isFinite(c.scale)||c.scale<.55||c.scale>.9||!Number.isFinite(c.rightShift)||c.rightShift< -30||c.rightShift>0||!Array.isArray(c.openings)||c.openings.length!==2||!c.openings.every((v,i)=>Array.isArray(v)&&v.length===5&&v.every(Number.isFinite)&&v[0]>(i?710:240)&&v[0]<(i?800:310)&&v[1]>650&&v[1]<700&&v[2]>5&&v[2]<30&&v[3]>2&&v[3]<15&&Math.abs(v[4])<=45))errors.push(`${id}: invalid/missing cuff fitting`);}
  if(item.slot==='top'&&!p.bareArms){
   const c=a.cuffs,frames=c?.frames,point=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
   if(!Array.isArray(frames)||frames.length!==2||!frames.every((f,i)=>f&&Object.keys(f).every(k=>['pivot','angle','turn','width','shift'].includes(k))&&point(f.pivot)&&point(f.shift)&&f.pivot[0]>(i?710:235)&&f.pivot[0]<(i?805:315)&&f.pivot[1]>640&&f.pivot[1]<700&&f.shift.every(v=>Math.abs(v)<=25)&&Number.isFinite(f.angle)&&Math.abs(f.angle)<=45&&Number.isFinite(f.turn)&&Math.abs(f.turn)<=15&&Number.isFinite(f.width)&&f.width>=.75&&f.width<=1.1&&c.openings?.[i]&&Math.hypot(f.pivot[0]+f.shift[0]-c.openings[i][0],f.pivot[1]+f.shift[1]-c.openings[i][1])<.5&&Math.abs(f.angle+f.turn-c.openings[i][4])<.5&&Math.hypot(c.openings[i][0]-avatarWristRig[i].center[0],c.openings[i][1]-avatarWristRig[i].center[1])<3&&Math.abs(c.openings[i][4]-avatarWristRig[i].angle)<3))errors.push(`${id}: invalid/missing cuff angle frames`);
  }
  if(a.legFit&&!p.longLegs)errors.push(`${id}: leg fitting on incompatible profile`);
  if(a.openings&&!p.boot)errors.push(`${id}: boot openings on incompatible profile`);
  if(p.longLegs){const f=a.legFit;if(!f||Object.keys(f).some(k=>!['start','end','shifts'].includes(k))||!Number.isFinite(f.start)||f.start<1100||f.start>1250||!Number.isFinite(f.end)||!rect(a.target)||f.end<=f.start||f.start<=a.target[1]||a.target[0]>=480||a.target[0]+a.target[2]<=480||Math.abs(f.end-(a.target[1]+a.target[3]))>2||!Array.isArray(f.shifts)||f.shifts.length!==2||!f.shifts.every(v=>Number.isFinite(v)&&Math.abs(v)<=20))errors.push(`${id}: invalid/missing leg fitting`);}
  if(p.boot){if(!Array.isArray(a.openings)||a.openings.length!==2||!a.openings.every((o,i)=>Array.isArray(o)&&o.length===5&&o.every(Number.isFinite)&&o[0]>(i?560:300)&&o[0]<(i?620:350)&&o[1]>1280&&o[1]<1340&&o[2]>10&&o[2]<40&&o[3]>2&&o[3]<15&&Math.abs(o[4])<=30))errors.push(`${id}: invalid/missing boot openings`);}
  if(item.slot==='shoes'&&!p.boot){
   const point=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
   const okay=Array.isArray(a.footFit)&&a.footFit.length===2&&a.footFit.every((f,i)=>f&&Object.keys(f).every(k=>['anchor','opening'].includes(k))&&point(f.anchor)&&Array.isArray(f.opening)&&f.opening.length===4&&f.opening.every(point)&&a.segments?.[i]&&rect(a.segments[i].source,true)&&rect(a.segments[i].target)&&f.anchor[0]>a.segments[i].source[0]&&f.anchor[0]<a.segments[i].source[0]+a.segments[i].source[2]&&f.anchor[1]>a.segments[i].source[1]&&f.anchor[1]<a.segments[i].source[1]+a.segments[i].source[3]);
   if(!okay)errors.push(`${id}: invalid/missing shoe heel and opening registration`);
   else for(let i=0;i<2;i++){
    const b=shoeOpeningBounds(a,i),center=fittedShoePoint(a,i,a.footFit[i].anchor),[sx,sy,sw,sh]=a.segments[i].source;
    const area=Math.abs(b.points.reduce((sum,p,j)=>{const q=b.points[(j+1)%b.points.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
    if(b.minY<1340||b.maxY>1420||b.maxY-b.minY<6||area<100||Math.hypot(center[0]-avatarFootRig[i].center[0],center[1]-avatarFootRig[i].center[1])>.1)errors.push(`${id}: shoe opening misses the standing foot`);
    for(const [x,y]of a.footFit[i].opening)if(x<0||x>atlas.width||y<0||y>atlas.height)errors.push(`${id}: shoe opening outside atlas`);
    const corners=[[sx,sy],[sx+sw,sy],[sx+sw,sy+sh],[sx,sy+sh]].map(p=>fittedShoePoint(a,i,p));
    const ground=Math.max(...corners.map(p=>p[1]));if(ground<1480||ground>1535||corners.some(p=>p[0]<160||p[0]>860||p[1]<1280))errors.push(`${id}: shoe sole misses the standing foot`);
    const[l,back,r,front]=a.footFit[i].opening;
    for(const[p,q,z]of [[l,back,r],[r,front,l]])for(let j=0;j<=24;j++){const t=j/24,[x,y]=[0,1].map(k=>(1-t)**2*p[k]+2*(1-t)*t*q[k]+t*t*z[k]);if(x<sx-.5||x>sx+sw+.5||y<sy-.5||y>sy+sh+.5)errors.push(`${id}: shoe opening leaves its original segment`);}
   }
  }else if(a.footFit!==undefined)errors.push(`${id}: shoe heel fitting on incompatible slot`);
  if(p.eyeFit){const anchors=a.lensAnchors;if(!Array.isArray(anchors)||anchors.length!==2||!anchors.every((point,i)=>{if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))return false;const box=(Array.isArray(a.segments)?a.segments:[]).find(b=>rect(b.source)&&point[0]>=b.source[0]&&point[0]<=b.source[0]+b.source[2]&&point[1]>=b.source[1]&&point[1]<=b.source[1]+b.source[3]);if(!box||!rect(box.target))return false;const x=box.target[0]+(point[0]-box.source[0])*box.target[2]/box.source[2],y=box.target[1]+(point[1]-box.source[1])*box.target[3]/box.source[3];return Math.hypot(x-avatarEyeRig[i][0],y-avatarEyeRig[i][1])<4;}))errors.push(`${id}: missing/misaligned eye anchors`);}
  if(p.eyeFit&&(!Array.isArray(a.segments)||a.segments.some((b,i,all)=>i>0&&(!rect(b.target)||!rect(all[i-1].target)||Math.abs(b.target[0]-all[i-1].target[0]-all[i-1].target[2])>.5||Math.abs(b.target[1]-all[0].target[1])>.5||Math.abs(b.target[3]-all[0].target[3])>.5))))errors.push(`${id}: disconnected lens segments`);
  if(p.perch&&(!Array.isArray(a.perchPoints)||a.perchPoints.length!==2||!a.perchPoints.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&rect(a.target)&&v[0]>=a.target[0]&&v[0]<=a.target[0]+a.target[2]&&v[1]>=a.target[1]&&v[1]<=a.target[1]+a.target[3])))errors.push(`${id}: invalid/missing perch points`);
  if(p.kind!=='segments'&&a.segments!==undefined)errors.push(`${id}: unused segment registration`);
  if(p.kind==='segments'&&(!Array.isArray(a.segments)||a.segments.length!==p.segmentCount))errors.push(`${id}: incomplete registered segments`);
 }
 for(const id of Object.keys(layers))if(!ids.has(id))errors.push(`${id}: artwork has no catalog item`);
 for(const slot of avatarSlots)if(!items.some(i=>i.slot===slot.id))errors.push(`${slot.id}: empty catalog slot`);
 for(const face of faces){const r=avatarFaceSources[face.id],a=atlases.faces;if(!rect(r,true)||!a||r[0]+r[2]>a.width||r[1]+r[3]>a.height)errors.push(`${face.id}: invalid face source`);}
 return errors;
}
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
export const avatarQaGroups={item:'각 아이템', 'top-bottom':'상의 × 하의','bottom-shoes':'하의 × 신발','hair-hat':'머리 × 모자 × 표정','hair-accessory':'머리 × 소품','top-accessory':'상의 × 소품','top-look':'상의 × 피부 × 표정',look:'피부 × 표정','hair-skin':'머리 × 피부','face-accessory':'안경 × 머리 × 표정','boot-skin':'부츠 × 하의 × 피부','shoe-skin':'운동화 × 하의 × 피부'};
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
 for(const accessory of by('accessory').filter(i=>avatarProfiles[layers[i.id].profile].faceClip))for(const hair of by('hair'))for(const face of faces)add('face-accessory',{accessory:accessory.id,hair:hair.id},{face:face.id});
 for(const shoes of by('shoes').filter(i=>avatarProfiles[layers[i.id].profile].boot))for(const bottom of by('bottom'))for(const skin of skins)add('boot-skin',{shoes:shoes.id,bottom:bottom.id},{skin:skin.id});
 for(const shoes of by('shoes').filter(i=>!avatarProfiles[layers[i.id].profile].boot))for(const bottom of by('bottom'))for(const skin of skins)add('shoe-skin',{shoes:shoes.id,bottom:bottom.id},{skin:skin.id});
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
