import {collectionOf,validCollection,validOutfit,outfitPrice} from './collection-core.mjs';
import {avatarItems,avatarSlots,itemById,starterOutfit,skins,faces} from './avatar-data.mjs';
export const WELCOME_POINTS=100;
export const emptyAvatar=()=>({version:1,welcome:WELCOME_POINTS,earned:0,spent:0,owned:avatarItems.filter(i=>!i.price).map(i=>i.id),equipped:{...starterOutfit},skin:'peach',face:'smile',claims:{},purchases:{}});
export const avatarBalance=v=>v.welcome+v.earned-v.spent;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validAvatar(v){
 if(!v||v.version!==1||v.welcome!==WELCOME_POINTS||!['earned','spent'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<1e9)||!Array.isArray(v.owned)||new Set(v.owned).size!==v.owned.length||!v.owned.every(id=>!!itemById(id))||!object(v.equipped)||!object(v.claims)||!object(v.purchases)||!skins.some(s=>s.id===v.skin)||!faces.some(f=>f.id===v.face)||avatarBalance(v)<0)return false;
 if(v.collection !== undefined && !validCollection(v.collection,v.owned))return false;
 if(!avatarItems.filter(i=>!i.price).every(i=>v.owned.includes(i.id)))return false;
 if(Object.keys(v.equipped).length!==avatarSlots.length||!avatarSlots.every(({id})=>{const value=v.equipped[id];return ['hat','accessory'].includes(id)&&value===null||v.owned.includes(value)&&itemById(value)?.slot===id;}))return false;
 let earned=0,spent=0;
 for(const [id,r]of Object.entries(v.claims)){if(!object(r)||!['journey','stage','daily','score','lab'].includes(r.kind)||!id.startsWith(r.kind+':')||id.length>130||!Number.isInteger(r.amount)||!(r.kind==='journey'?r.amount===80:r.kind==='score'?r.amount>=40&&r.amount<=80&&r.amount%5===0:r.amount===50))return false;earned+=r.amount;}
 for(const [id,r]of Object.entries(v.purchases)){const item=itemById(id);if(!item?.price||!object(r)||r.price!==item.price||!v.owned.includes(id))return false;spent+=r.price;}
 return earned===v.earned&&spent===v.spent&&v.owned.every(id=>!itemById(id).price||Object.hasOwn(v.purchases,id));
}
const fail=(value,reason)=>({ok:false,value,reason});
export function buyAvatarItem(value,id){const item=itemById(id);if(!validAvatar(value)||!item)return fail(value,'invalid');if(value.owned.includes(id))return fail(value,'owned');if(avatarBalance(value)<item.price)return fail(value,'funds');const next={...value,owned:[...value.owned,id],spent:value.spent+item.price,purchases:{...value.purchases,[id]:{price:item.price}}};return {ok:true,value:next};}
export function wearAvatarItem(value,slot,id){if(!validAvatar(value)||!avatarSlots.some(s=>s.id===slot)||!(id===null&&['hat','accessory'].includes(slot)||value.owned.includes(id)&&itemById(id)?.slot===slot))return fail(value,'not-owned');return {ok:true,value:{...value,equipped:{...value.equipped,[slot]:id}}};}
export function changeAvatarLook(value,key,id){if(!validAvatar(value)||!(key==='skin'?skins:key==='face'?faces:[]).some(i=>i.id===id))return fail(value,'invalid');return {ok:true,value:{...value,[key]:id}};}
export function grantAvatarReward(value,receipt){if(!validAvatar(value)||!receipt)return fail(value,'invalid');if(Object.hasOwn(value.claims,receipt.id))return {ok:true,duplicate:true,value,receipt:value.claims[receipt.id]};const next={...value,earned:value.earned+receipt.amount,claims:{...value.claims,[receipt.id]:{kind:receipt.kind,amount:receipt.amount}}};return validAvatar(next)?{ok:true,value:next,receipt}:{ok:false,value,reason:'invalid'};}

// Purchases and the complete outfit are committed together by avatar-store.
export function dressAvatar(value,patch) {
 if (!validAvatar(value) || !patch || typeof patch !== 'object' ||
     !Object.keys(patch).every(slot => avatarSlots.some(s => s.id === slot))) return fail(value,'invalid');
 const cost = outfitPrice(value,patch);
 if (cost === null) return fail(value,'invalid');
 if (avatarBalance(value) < cost) return fail(value,'funds');
 let next = value;
 for (const id of Object.values(patch).filter(Boolean)) {
  if (!next.owned.includes(id)) {
   const purchase = buyAvatarItem(next,id);
   if (!purchase.ok) return purchase;
   next = purchase.value;
  }
 }
 return {ok:true,value:{...next,equipped:{...next.equipped,...patch}}};
}
export function wishAvatar(value,id) {
 if (!validAvatar(value) || id !== null && !itemById(id)) return fail(value,'invalid');
 return {ok:true,value:{...value,collection:{...collectionOf(value),wish:id}}};
}
export function saveAvatarLook(value,index,name,patch={}) {
 if (!validAvatar(value) || !Number.isInteger(index) || index < 0 || index > 2 ||
     typeof name !== 'string' || !name.trim() || name.trim().length > 30) return fail(value,'invalid');
 const equipped = {...value.equipped,...patch};
 if (!validOutfit(equipped,value.owned)) return fail(value,'not-owned');
 const looks = [...collectionOf(value).looks];
 looks[index] = {name:name.trim(),skin:value.skin,face:value.face,equipped};
 return {ok:true,value:{...value,collection:{...collectionOf(value),looks}}};
}
export function loadAvatarLook(value,index) {
 if (!validAvatar(value) || !Number.isInteger(index) || index < 0 || index > 2) return fail(value,'invalid');
 const look = collectionOf(value).looks[index];
 if (!validAvatar(value) || !look || !validOutfit(look.equipped,value.owned)) return fail(value,'invalid');
 return {ok:true,value:{...value,skin:look.skin,face:look.face,equipped:{...look.equipped}}};
}
