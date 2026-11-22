import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.argv[2];
if(!base?.startsWith('https://kjh0829.github.io/nProject/'))throw Error('Expected the project Pages URL');
const paths=['index.html','avatar-runtime.mjs','avatar-canvas.mjs','avatar-shoe-fit.mjs','avatar-head-fit.mjs','avatar-layers.mjs','avatar-dressing.mjs','avatar-mesh.mjs','avatar-neckline.mjs','avatar-waist.mjs','avatar-art.mjs','avatar-qa-render.mjs'];
const digest=text=>createHash('sha256').update(text).digest('hex');
const expected=await Promise.all(paths.map(async path=>digest(await readFile('docs/'+path,'utf8'))));
const deadline=Date.now()+180_000;let matches=[];
while(Date.now()<deadline){
 matches=await Promise.all(paths.map(async(path,i)=>{try{const url=new URL(path+'?deployment=outfit-details-20261122',base);const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10_000)});return response.ok&&digest(await response.text())===expected[i];}catch{return false;}}));
 if(matches.every(Boolean)){console.log('Public Pages HTML and Canvas renderer hashes match this checkout PASS');process.exit(0);}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
console.error('Public Pages assets did not match this checkout:',paths.filter((_,i)=>!matches[i]).join(', '));process.exitCode=1;
