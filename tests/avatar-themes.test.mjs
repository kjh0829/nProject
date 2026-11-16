import assert from 'node:assert/strict';
import {avatarItems,avatarSlots,avatarThemes} from '../docs/avatar-data.mjs';
import {avatarLayers} from '../docs/avatar-layers.mjs';
import {emptyAvatar,validAvatar,avatarBalance,grantAvatarReward,buyAvatarItem,wearAvatarItem} from '../docs/avatar-core.mjs';
assert.equal(avatarThemes.length,5);assert.equal(new Set(avatarThemes.map(t=>t.id)).size,5);
const additions=avatarItems.filter(i=>i.theme);assert.equal(additions.length,30);
for(const slot of avatarSlots)assert.equal(additions.filter(i=>i.slot===slot.id).length,5);
let value=emptyAvatar();for(let i=0;i<Math.ceil(additions.reduce((n,item)=>n+item.price,0)/80);i++)value=grantAvatarReward(value,{id:'score:theme-test-'+i,kind:'score',amount:80}).value;
for(const theme of avatarThemes){const items=additions.filter(i=>i.theme===theme.id);assert.equal(items.length,6);assert.deepEqual(new Set(items.map(i=>i.slot)),new Set(avatarSlots.map(s=>s.id)));for(const item of items){assert(avatarLayers[item.id]);assert(item.price>0);const previous=avatarBalance(value),r=buyAvatarItem(value,item.id);assert(r.ok);value=r.value;assert.equal(avatarBalance(value),previous-item.price);value=wearAvatarItem(value,item.slot,item.id).value;assert.equal(value.equipped[item.slot],item.id);assert(!buyAvatarItem(value,item.id).ok);}assert(validAvatar(value));}
console.log('5 themed sets / 30 additions: five per slot, independent purchase/equip, exact cost and duplicate protection PASS');
