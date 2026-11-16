import assert from 'node:assert/strict';
import {avatarItems,avatarSlots} from '../docs/avatar-data.mjs';
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
