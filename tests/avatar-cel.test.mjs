import assert from 'node:assert/strict';
import {avatarArt} from '../docs/avatar-art.mjs';
import {avatarRig,avatarLayerOrder,avatarCoverage,avatarFraming} from '../docs/avatar-rig.mjs';
import {emptyAvatar,validAvatar,buyAvatarItem,wearAvatarItem} from '../docs/avatar-core.mjs';
import {avatarItems,starterOutfit} from '../docs/avatar-data.mjs';
import {readAvatar,AVATAR_KEY} from '../docs/avatar-store.mjs';
let saved=buyAvatarItem(emptyAvatar(),'hat-beret').value;saved=wearAvatarItem(saved,'hat','hat-beret').value;
const serialized=JSON.stringify(saved),storage={getItem:k=>k===AVATAR_KEY?serialized:null};assert(validAvatar(readAvatar(storage).value));
const outfits=[starterOutfit,{hair:'hair-peach',hat:'hat-sprout',top:'top-mint',bottom:'bottom-lilac',shoes:'shoes-lilac',accessory:'acc-bird'},{hair:'hair-lilac',hat:'hat-wizard',top:'top-night',bottom:'bottom-overall',shoes:'shoes-star',accessory:'acc-bag'},{hair:'hair-silver',hat:'hat-beret',top:'top-coral',bottom:'bottom-check',shoes:'shoes-red',accessory:'acc-glasses'}];
for(const outfit of outfits)for(const pose of avatarRig.poses){const svg=avatarArt(saved,{outfit,pose});assert(svg.includes('data-avatar-style="cel-b-v1"'));assert(svg.includes('data-pose="'+pose+'"'));assert(svg.includes('viewBox="0 0 300 540"'));assert(svg.includes('data-rig="right-elbow"'));assert(svg.includes('data-rig="right-shoulder"'));assert(!/<script|foreignObject|href=|onload=/i.test(svg));for(const layer of avatarLayerOrder)assert(svg.includes('data-layer="'+layer+'"'),layer);}
assert.equal(avatarCoverage('coat').showOverallBib,false);assert.equal(avatarCoverage('hoodie').showOverallBib,true);
for(const item of avatarItems){const svg=avatarArt(saved,{outfit:{...starterOutfit,[item.slot]:item.id},framing:'slot',focusSlot:item.slot});assert(svg.includes('viewBox="'+avatarFraming(item.slot,item.style)+'"'));assert(!svg.includes('viewBox="0 0 300 540"'));}
assert(avatarArt(saved,{pose:'unknown'}).includes('data-pose="idle"'));assert.equal(JSON.stringify(saved),serialized);assert.equal(JSON.stringify(readAvatar(storage).value),serialized);
console.log('Cel B: every published item, four layered outfits × three poses, shared joint contract, garment coverage, focused crops, SVG safety and original wallet compatibility PASS');
