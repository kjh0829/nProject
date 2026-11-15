import assert from 'node:assert/strict';
import {createJourneyCatalog,journeyMapState,MAP_PAGE_SIZE} from '../docs/journey-catalog.mjs';
import {journeyCatalog,journeyLevels,chapters,nextJourneyLevel,isJourneyChapterEnd} from '../docs/journey-data.mjs';
import citrus from '../docs/journey-content/citrus-lane.mjs';
import glass from '../docs/journey-content/glass-garden.mjs';
import station from '../docs/journey-content/starlight-station.mjs';
const empty={records:{},slots:{}};
assert.equal(journeyMapState(journeyCatalog,empty).chapter.id,chapters[0].id);
assert.equal(journeyMapState(journeyCatalog,empty).visibleLevels.length,5);
assert.equal(journeyMapState(journeyCatalog,empty,'region=glass-garden&level=7').selected.id,7);
assert.equal(journeyMapState(journeyCatalog,empty,'region=missing&page=-1').selected.id,1);
assert.equal(isJourneyChapterEnd(5),true);assert.equal(isJourneyChapterEnd(4),false);assert.equal(nextJourneyLevel(journeyLevels.length),null);
// Append differently sized regions to the exact published packs. Existing IDs/rules stay identical.
let id=journeyLevels.length;const packs=[citrus,glass,station];for(let region=0;region<40;region++){packs.push({id:'extra-'+region,name:'검증 지역 '+region,icon:'✦',color:'#ded6ef',intro:'검증용',ending:'검증용',levels:Array.from({length:37},()=>({id:++id,name:'검증 판 '+id,subtitle:'검증용',color:0,target:12,moves:16,ice:[]}))});}
const big=createJourneyCatalog(packs);assert.deepEqual(big.levels.slice(0,journeyLevels.length),journeyLevels);
const oldComplete={records:Object.fromEntries(journeyLevels.map(l=>[l.id,{stars:2,score:100,moves:5}])),slots:{}};
assert.equal(journeyMapState(big,oldComplete).current,16);assert.equal(journeyMapState(big,oldComplete).chapter.id,'extra-0');
const progress={records:Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{stars:1,score:100,moves:4}]))};
let map=journeyMapState(big,progress);assert.equal(map.current,1001);assert(map.visibleLevels.some(l=>l.id===1001));assert(map.visibleLevels.length<=MAP_PAGE_SIZE);
for(const chapter of big.chapters)for(let page=1;page<=5;page++){map=journeyMapState(big,progress,new URLSearchParams({region:chapter.id,page}));assert(map.visibleLevels.length<=MAP_PAGE_SIZE);assert(map.visibleLevels.length>0);assert(map.visibleLevels.every(l=>l.chapterId===chapter.id));assert(map.page<map.pageCount);}
assert.throws(()=>createJourneyCatalog([citrus,citrus]));assert.throws(()=>createJourneyCatalog([glass]));assert.throws(()=>createJourneyCatalog([{...citrus,levels:[{...citrus.levels[0],ice:[-1]}]}]));
console.log('Catalog: published IDs/rules preserved; append unlock, 1,495-level/43-region bounded pages, deep links, invalid input and pack validation PASS');
