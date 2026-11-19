import {missionKinds} from './puzzle-missions.mjs';
// Append packs and IDs; published level IDs/seeds/rules must remain stable for saved games.
export function createJourneyCatalog(packs){
 if(!Array.isArray(packs)||!packs.length)throw Error('Journey needs region packs');
 const chapters=[],levels=[],ids=new Set();
 for(const pack of packs){
  if(!pack||!/^[-a-z0-9]+$/.test(pack.id)||ids.has(pack.id)||!['name','intro','ending','icon','color'].every(k=>typeof pack[k]==='string'&&pack[k].length)||!/^#[a-f\d]{6}$/i.test(pack.color)||!Array.isArray(pack.levels)||!pack.levels.length)throw Error('Invalid journey region');
  ids.add(pack.id);const chapter=chapters.length,levelIds=[];
  for(const level of pack.levels){
   if(!level||level.id!==levels.length+1||!['name','subtitle'].every(k=>typeof level[k]==='string'&&level[k].length)||!Number.isInteger(level.color)||level.color<0||level.color>3||!Number.isInteger(level.target)||level.target<1||!Number.isInteger(level.moves)||level.moves<1||!Array.isArray(level.ice)||new Set(level.ice).size!==level.ice.length||!level.ice.every(i=>Number.isInteger(i)&&i>=0&&i<36))throw Error('Invalid or reordered journey level');
   if(level.mission&&(!missionKinds.includes(level.mission.kind)||!Number.isInteger(level.mission.target)||level.mission.target<1||typeof level.mission.label!=='string'||!level.mission.label))throw Error('Invalid mission');
   levels.push({...level,chapter,chapterId:pack.id});levelIds.push(level.id);
  }
  const {levels:unused,...meta}=pack;chapters.push({...meta,levelIds,firstLevel:levelIds[0],lastLevel:levelIds.at(-1)});
 }
 return {chapters,levels};
}
export const MAP_PAGE_SIZE=10;
export function journeyMapState(catalog,progress,query=''){
 const {chapters,levels}=catalog,params=new URLSearchParams(query);
 let current=1;while(current<levels.length&&progress.records[current])current++;
 const currentLevel=levels[current-1],requested=chapters.findIndex(c=>c.id===params.get('region'));
 const chapterIndex=requested>=0?requested:currentLevel.chapter,chapter=chapters[chapterIndex];
 const pageCount=Math.ceil(chapter.levelIds.length/MAP_PAGE_SIZE),requestedPage=Number(params.get('page'));
 const defaultPage=chapterIndex===currentLevel.chapter?Math.floor(chapter.levelIds.indexOf(current)/MAP_PAGE_SIZE):0;
 const page=params.has('page')&&Number.isInteger(requestedPage)&&requestedPage>=1?Math.min(pageCount-1,requestedPage-1):defaultPage;
 const visibleLevels=chapter.levelIds.slice(page*MAP_PAGE_SIZE,(page+1)*MAP_PAGE_SIZE).map(id=>levels[id-1]);
 const requestedLevel=Number(params.get('level')),selected=visibleLevels.find(l=>l.id===requestedLevel)||visibleLevels.find(l=>l.id===current)||visibleLevels[0];
 return {chapterIndex,chapter,page,pageCount,visibleLevels,selected,current,complete:!!progress.records[levels.at(-1).id]};
}
