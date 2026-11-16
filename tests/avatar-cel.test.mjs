import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {avatarArt} from '../docs/avatar-art.mjs';
import {avatarRig,avatarCoverage,avatarFraming} from '../docs/avatar-rig.mjs';
import {avatarLayers,avatarFaceSources,avatarAtlases} from '../docs/avatar-layers.mjs';
import {emptyAvatar,buyAvatarItem,wearAvatarItem} from '../docs/avatar-core.mjs';
import {avatarItems,starterOutfit,skins,faces} from '../docs/avatar-data.mjs';
let saved=buyAvatarItem(emptyAvatar(),'hat-beret').value;saved=wearAvatarItem(saved,'hat','hat-beret').value;const before=JSON.stringify(saved);
assert.equal(Object.keys(avatarLayers).length,avatarItems.length);
for(const item of avatarItems){const layer=avatarLayers[item.id];assert(layer);assert(layer.source.every(Number.isFinite));assert(layer.target.every(Number.isFinite));assert(layer.source[2]>0&&layer.source[3]>0);assert(layer.source[0]+layer.source[2]<=avatarAtlases[layer.atlas].width);assert(layer.source[1]+layer.source[3]<=avatarAtlases[layer.atlas].height);assert(existsSync(new URL(`../docs/assets/avatar-art/wardrobe-v1/${layer.atlas}.png`,import.meta.url)));const outfit={...starterOutfit,[item.slot]:item.id},svg=avatarArt(saved,{outfit,framing:'slot',focusSlot:item.slot});assert(svg.includes(`data-item="${item.id}"`));assert(svg.includes('data-avatar-style="raster-b-v1"'));assert(svg.includes(`viewBox="${avatarFraming(item.slot,item.style)}"`));assert(!/<script|foreignObject|on\w+=/i.test(svg));for(const [,href]of svg.matchAll(/href="([^"]+)"/g))assert(/^\.\/assets\/avatar-art\/wardrobe-v1\/[a-z][a-z0-9-]*\.png$/.test(href));}
assert.equal(avatarCoverage('coat').showOverallBib,false);assert.equal(avatarCoverage('hoodie').showOverallBib,true);
assert(!avatarArt(saved,{outfit:{...starterOutfit,hat:null,accessory:null}}).includes('data-item="hat-beret"'));
for(const skin of skins)for(const face of faces){const svg=avatarArt({...saved,skin:skin.id,face:face.id});assert(svg.includes(`data-skin="${skin.id}"`));assert(svg.includes(`data-face="${face.id}"`));assert(avatarFaceSources[face.id]);}
assert.equal(JSON.stringify(saved),before);assert(avatarArt(saved,{pose:'wave'}).includes('data-pose="idle"'));assert.deepEqual(avatarRig.poses,['idle']);
// Raster source originals are valid PNGs, not remote URLs or baked full-outfit substitutes.
for(const name of ['base','faces',...new Set(Object.values(avatarLayers).map(a=>a.atlas))])assert.equal(readFileSync(new URL(`../docs/assets/avatar-art/wardrobe-v1/${name}.png`,import.meta.url)).subarray(1,4).toString(),'PNG');
console.log(`Raster wardrobe: all ${avatarItems.length} independent items, safe local atlas crops, optional removals, 12 skin/expression combinations, static pose and original wallet preservation PASS`);
