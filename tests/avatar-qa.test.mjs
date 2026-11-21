import {avatarProfiles} from '../docs/avatar-profiles.mjs';
import assert from 'node:assert/strict';
import {avatarItems,avatarSlots,faces,skins} from '../docs/avatar-data.mjs';
import {avatarLayers,avatarAtlases} from '../docs/avatar-layers.mjs';
import {validateAvatarCatalog,buildAvatarQaPlan,avatarQaShards} from '../docs/avatar-qa.mjs';
const copy=v=>structuredClone(v),plan=buildAvatarQaPlan();assert.deepEqual(validateAvatarCatalog(),[]);
for(const item of avatarItems)assert(plan.cases.some(c=>c.isolate===item.id),'Missing isolated check '+item.id);
for(const [a,b]of [['top','bottom'],['bottom','shoes'],['hair','hat'],['hair','accessory'],['top','accessory']])for(const first of avatarItems.filter(i=>i.slot===a))for(const second of avatarItems.filter(i=>i.slot===b))assert(plan.cases.some(c=>!c.isolate&&c.outfit[a]===first.id&&c.outfit[b]===second.id),`${first.id}/${second.id} missing`);
const next={...avatarItems.find(i=>i.slot==='top'),id:'qa-new-top'},nextItems=[...avatarItems,next],nextLayers=copy(avatarLayers);nextLayers[next.id]=copy(avatarLayers[avatarItems.find(i=>i.slot==='top').id]);
assert(validateAvatarCatalog(nextItems).some(e=>e.includes('missing artwork')));const expanded=buildAvatarQaPlan(nextItems,nextLayers);assert(expanded.cases.length>plan.cases.length);for(const other of avatarItems.filter(i=>['bottom','accessory'].includes(i.slot)))assert(expanded.cases.some(c=>c.outfit.top===next.id&&c.outfit[other.slot]===other.id),'New item omitted from pairs');
for(const mutate of [a=>delete a.profile,a=>a.profile='unknown',a=>a.profile='hair',a=>a.source=[0,0,9000,20],a=>a.target=[NaN,0,20,20],a=>a.atlas='../remote']){const layers=copy(avatarLayers);mutate(layers['top-stripe']);assert(validateAvatarCatalog(avatarItems,layers).length>0);}
const segments=copy(avatarLayers);segments['shoes-red'].segments.pop();assert(validateAvatarCatalog(avatarItems,segments).some(e=>e.includes('segments')));
const duplicate=[...avatarItems,avatarItems[0]];assert(validateAvatarCatalog(duplicate).some(e=>e.includes('duplicate')));
const shards=avatarQaShards(plan,17,256),indices=shards.flatMap(s=>Array.from({length:s.end-s.start},(_,i)=>s.start+i));assert.deepEqual(indices,plan.cases.map((_,i)=>i));assert.throws(()=>avatarQaShards(plan,1,1),/never silently skipped/);
assert.equal(new Set(plan.cases.map(c=>c.id)).size,plan.cases.length);assert.deepEqual(buildAvatarQaPlan(),plan);console.log(`Catalog QA PASS: auto inclusion, all adjacent pairs, bad registration failures, deterministic IDs and complete sharding (${plan.cases.length} cases)`);
const {summarizeAvatarQa}=await import('../docs/avatar-qa.mjs');
const complete=avatarQaShards(plan).map(shard=>({version:plan.version,commit:'fixture',shard:shard.index,totalPlanned:plan.cases.length,checked:shard.end-shard.start,results:plan.cases.slice(shard.start,shard.end).map(c=>({id:c.id,passed:true,failures:[]}))}));
assert(summarizeAvatarQa(plan,complete,'fixture').passed);assert(!summarizeAvatarQa(plan,complete.slice(1),'fixture').passed);const dup=copy(complete);dup[0].results[0]=dup[0].results[1];assert(!summarizeAvatarQa(plan,dup,'fixture').passed);const falsePass=copy(complete);falsePass[0].results[0].failures.push({rule:'bad-seam'});assert(!summarizeAvatarQa(plan,falsePass,'fixture').passed);assert(!summarizeAvatarQa(plan,complete,'different-commit').passed);
console.log('QA aggregation rejects missing cases, duplicates, hidden failures and mismatched commits PASS');
for(const slot of avatarSlots){const original=avatarItems.find(i=>i.slot===slot.id),added={...original,id:'qa-added-'+slot.id},layers={...copy(avatarLayers),[added.id]:copy(avatarLayers[original.id])},grown=buildAvatarQaPlan([...avatarItems,added],layers);assert(grown.cases.some(c=>c.isolate===added.id));assert(grown.cases.some(c=>!c.isolate&&c.outfit[slot.id]===added.id),'New '+slot.id+' omitted from combinations');}
console.log('New items in all six slots automatically enter isolated and paired checks PASS');

for(const mutate of [a=>delete a.neckline,a=>a.neckline.shift=-60,a=>a.neckline.opening[0][1]=NaN,a=>a.neckline.opening='path']){const layers=copy(avatarLayers);mutate(layers['top-stripe']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('neckline')));}
assert.equal(plan.pairCounts['top-look'],avatarItems.filter(i=>i.slot==='top').length*12);
console.log('Every top requires a safe neckline registration and all 12 skin/expression combinations PASS');

for(const mutate of [a=>delete a.cuffs,a=>a.cuffs.scale=1.4,a=>a.cuffs.rightShift=-100,a=>a.cuffs.openings.pop()]){const layers=copy(avatarLayers);mutate(layers['top-mint']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('cuff')));}
for(const mutate of [a=>delete a.neckline.scale,a=>a.neckline.scale=.1,a=>a.neckline.lift=-100]){const layers=copy(avatarLayers);mutate(layers['top-stripe']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('neckline')));}

{const layers=copy(avatarLayers);Object.assign(layers['top-stripe'].neckline,{shift:-45,scale:1.2});assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('neckline')));}

const {fitAvatarCuff}=await import('../docs/avatar-neckline.mjs');
for(const a of Object.values(avatarLayers))if(a.cuffs)for(let i=0;i<2;i++){
 const f=a.cuffs.frames[i],o=a.cuffs.openings[i],p=fitAvatarCuff(f.pivot,f),angle=f.angle*Math.PI/180,probe=fitAvatarCuff([f.pivot[0]+20*Math.cos(angle),f.pivot[1]+20*Math.sin(angle)],f);
 assert(Math.hypot(p[0]-o[0],p[1]-o[1])<.001);assert(Math.abs(Math.hypot(probe[0]-p[0],probe[1]-p[1])-20*f.width)<.001);assert(Math.abs(Math.atan2(probe[1]-p[1],probe[0]-p[0])*180/Math.PI-o[4])<.001);
}
for(const mutate of [a=>delete a.cuffs.frames,a=>a.cuffs.frames[0].turn=80,a=>a.cuffs.frames[1].shift[0]=0,a=>a.cuffs.frames[0].width=-1,a=>a.cuffs.frames.reverse()]){const layers=copy(avatarLayers);mutate(layers['top-mint']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('frames')));}
{const layers=copy(avatarLayers);layers['top-coral'].neckline.tilt=90;assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('neckline')));}
console.log('Independent left/right cuff positions, width, anatomical angles and invalid frame rejection PASS');

{const layers=copy(avatarLayers);layers['top-mint'].cuffs.frames[0].turn=-layers['top-mint'].cuffs.frames[0].angle;layers['top-mint'].cuffs.openings[0][4]=0;assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('frames')));}

for(const mutate of [a=>delete a.legFit,a=>a.legFit.start=NaN,a=>a.legFit.end=900,a=>a.legFit.shifts=[-50,0]]){const layers=copy(avatarLayers);mutate(layers['bottom-denim']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('leg fitting')));}
for(const mutate of [a=>delete a.openings,a=>a.openings.pop(),a=>a.openings[0][0]=999]){const layers=copy(avatarLayers);mutate(layers['shoes-red']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('boot openings')));}
console.log('Hem fitting and both boot mouth registrations are required and bounded PASS');

{const layers=copy(avatarLayers);delete layers['acc-glasses'].lensAnchors;assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('eye anchors')));}
{const layers=copy(avatarLayers),a=layers['acc-glasses'];a.segments[0].target[0]=469;a.segments[1].target=[524,116,27,63];a.segments[2].target=[551,116,92,63];assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('eye anchors')));}
assert.equal(plan.pairCounts['face-accessory'],avatarItems.filter(i=>i.slot==='hair').length*faces.length*avatarItems.filter(i=>avatarProfiles[avatarLayers[i.id].profile].faceClip).length);assert.equal(plan.pairCounts['boot-skin'],avatarItems.filter(i=>i.slot==='bottom').length*skins.length*avatarItems.filter(i=>avatarProfiles[avatarLayers[i.id].profile].boot).length);
console.log('Both lenses align with the eye rig; all expressions and boot skin combinations included PASS');

{const layers=copy(avatarLayers);delete layers['acc-bird'].perchPoints;assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('perch points')));}

const {avatarWaistRig,fitAvatarWaist}=await import('../docs/avatar-waist.mjs');
for(const item of avatarItems.filter(i=>['top','bottom'].includes(i.slot))){
 const a=avatarLayers[item.id];
 for(const [i,point]of a.waist.points.entries())assert.deepEqual(fitAvatarWaist(point,a,item.slot),[avatarWaistRig.points[i][0],avatarWaistRig.points[i][1]+a.waist.rise]);
 const fixed=item.slot==='top'?[[495,253],[275,672],[744,674],[520,420]]:[[520,300],[400,1000],[330,1350],[595,1350]];
 for(const point of fixed)assert.deepEqual(fitAvatarWaist(point,a,item.slot),point,'Waist fitting moved another joint: '+item.id);
}
for(const mutate of [a=>delete a.waist,a=>a.waist.points.reverse(),a=>a.waist.points[1][0]=NaN,a=>a.waist.rise=100,a=>a.waist.points[0]=[200,630],a=>a.waist.unknown=true]){
 const layers=copy(avatarLayers);mutate(layers['bottom-denim']);assert(validateAvatarCatalog(avatarItems,layers).some(e=>e.includes('waist')));
}
{const layers=copy(avatarLayers);delete layers['top-forest'].waist;assert.throws(()=>buildAvatarQaPlan(avatarItems,layers),/waist/);}
console.log('All tops/bottoms register the posed waist frame; shared front/angle alignment, fixed neck/hands/knees/ankles and invalid/missing registrations PASS');
