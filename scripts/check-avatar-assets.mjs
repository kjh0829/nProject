import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {avatarAtlases,avatarAssetsRoot} from '../docs/avatar-layers.mjs';
import {buildAvatarQaPlan,avatarQaShards} from '../docs/avatar-qa.mjs';
const plan=buildAvatarQaPlan(),assets={};
for(const [name,expected]of Object.entries(avatarAtlases)){const path=new URL('../docs/'+avatarAssetsRoot.replace('./','')+name+'.png',import.meta.url),data=readFileSync(path);if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.toString('ascii',12,16)!=='IHDR'||data.readUInt32BE(16)!==expected.width||data.readUInt32BE(20)!==expected.height||data[25]!==6)throw Error(`${name}: expected RGBA PNG ${expected.width}×${expected.height}`);assets[name]={...expected,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length};}
const shards=avatarQaShards(plan);mkdirSync('test-results/avatar-qa',{recursive:true});writeFileSync('test-results/avatar-qa/manifest.json',JSON.stringify({version:plan.version,commit:process.env.GITHUB_SHA||null,itemCount:plan.itemCount,caseCount:plan.cases.length,coverage:plan.pairCounts,assets,shards},null,2));
if(process.argv.includes('--matrix'))console.log(JSON.stringify({include:shards}));else console.log(`Wardrobe registry PASS: ${plan.itemCount} items, ${Object.keys(assets).length} RGBA atlases, ${plan.cases.length} cases, ${shards.length} shards`);
