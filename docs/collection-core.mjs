import {avatarSlots,itemById,skins,faces} from './avatar-data.mjs';
import {journeyCatalog} from './journey-data.mjs';

export const collectionDefaults = () => ({wish:null,looks:[null,null,null],background:'studio'});
export const collectionOf = value => value.collection || collectionDefaults();
export const regionPrizes = [
 {id:'citrus-lane',name:'귤빛 골목',background:'햇살 우체국',badge:'첫 편지 배달부',prop:'황금 편지함',symbol:'✉'},
 {id:'glass-garden',name:'유리 온실',background:'초록빛 온실',badge:'온실의 정원사',prop:'유리 꽃 화분',symbol:'❋'},
 {id:'starlight-station',name:'밤하늘 정거장',background:'별빛 승강장',badge:'별빛 여행자',prop:'별빛 랜턴',symbol:'✦'}
];
export function unlockedPrizes(progress) {
 return regionPrizes.filter(prize => {
  const chapter = journeyCatalog.chapters.find(region => region.id === prize.id);
  return chapter && chapter.levelIds.every(id => progress.records[id]);
 });
}
export function validOutfit(outfit,owned) {
 return outfit && typeof outfit === 'object' && !Array.isArray(outfit) && Object.keys(outfit).length === avatarSlots.length &&
  avatarSlots.every(({id}) => outfit[id] === null && ['hat','accessory'].includes(id) ||
   owned.includes(outfit[id]) && itemById(outfit[id])?.slot === id);
}
export function validCollection(collection,owned) {
 return collection && (collection.wish === null || !!itemById(collection.wish)) &&
  ['studio',...regionPrizes.map(p => p.id)].includes(collection.background) &&
  Array.isArray(collection.looks) && collection.looks.length === 3 && collection.looks.every(look => look === null ||
   look && typeof look.name === 'string' && look.name.trim().length > 0 && look.name.length <= 30 &&
   skins.some(s => s.id === look.skin) && faces.some(f => f.id === look.face) && validOutfit(look.equipped,owned));
}
export function outfitPrice(value,patch) {
 const outfit = {...value.equipped,...patch};
 if (!validOutfit(outfit, Object.values(outfit).filter(Boolean))) return null;
 return Object.values(outfit).reduce((total,id) => total + (id && !value.owned.includes(id) ? itemById(id).price : 0),0);
}
