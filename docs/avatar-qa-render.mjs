import {avatarArt} from './avatar-art.mjs';
import {avatarLayers,avatarAssetsRoot} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
const cache=new Map();
async function textureUrl(href){if(!href.startsWith(avatarAssetsRoot)||!/^[-a-z0-9]+\.png$/.test(href.slice(avatarAssetsRoot.length)))throw Error('Unexpected QA texture URL');if(!cache.has(href))cache.set(href,(async()=>{const response=await fetch(href);if(!response.ok)throw Error(`Texture failed ${response.status}: ${href}`);const blob=await response.blob();return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});})().catch(e=>{cache.delete(href);throw e;}));return cache.get(href);}
export async function avatarQaPixels(test,isolate=false){
 const doc=new DOMParser().parseFromString(avatarArt(test.look,{outfit:test.outfit}).replace('160 -100 700 1640','0 0 1024 1536'),'image/svg+xml'),svg=doc.documentElement;svg.setAttribute('width','1024');svg.setAttribute('height','1536');
 if(isolate){const target=svg.querySelector(`[data-item="${test.isolate}"]`);if(!target)throw Error('Missing item layer '+test.isolate);for(const child of [...svg.children])if(child.tagName!=='defs'&&child!==target&&!child.contains(target))child.remove();}
 await Promise.all([...svg.querySelectorAll('image')].map(async node=>node.setAttribute('href',await textureUrl(node.getAttribute('href')))));
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,1024,1536).data;return {svg,pixel:(x,y)=>{const i=(Math.round(y)*1024+Math.round(x))*4;return [...data.slice(i,i+4)];},data};}finally{URL.revokeObjectURL(url);}
}
export async function inspectAvatarCase(test){
 const failures=[],expect=(ok,rule,point)=>{if(!ok)failures.push({rule,point});};const {pixel,svg}=await avatarQaPixels(test);
 const entries=Object.entries(test.outfit).filter(([,id])=>id),fit=slot=>avatarProfiles[avatarLayers[test.outfit[slot]].profile];
 for(const [slot,id]of entries)expect(svg.querySelectorAll(`[data-item="${id}"]`).length===1,`registered-layer:${slot}`);
 for(let x=490;x<=620;x+=20)for(let y=620;y<=710;y+=15)expect(pixel(x,y)[3]>170,'waist-connection',[x,y]);
 for(const [x,y]of [[311,600],[300,620],[290,640],[279,660],[271,680],[265,700],[255,720],[714,600],[724,640],[737,660],[747,680],[755,700],[767,720]])expect(pixel(x,y)[3]>150,'sleeve-hand-connection',[x,y]);
 for(const x of [330,595])for(let y=1320;y<=1380;y+=10)expect(pixel(x,y)[3]>150,'ankle-connection',[x,y]);
 if(fit('hair').faceClear){const [r,,b,a]=pixel(520,180);expect(a>200&&r>b+25,'hair-face-clearance',[520,180]);}
 if(fit('bottom').overTop&&!fit('top').outer){const ids=[...svg.children].map(n=>n.getAttribute('data-item'));expect(ids.indexOf(test.outfit.bottom)>ids.indexOf(test.outfit.top),'overall-above-shirt');}
 if(fit('shoes').boot){const ids=[...svg.children].map(n=>n.getAttribute('data-item'));expect(ids.indexOf(test.outfit.shoes)>ids.indexOf(test.outfit.bottom),'boot-above-trousers');}
 if(test.groups.includes('top-look')||test.isolate?.startsWith('top-')){
  const neck=await avatarQaPixels({...test,isolate:test.outfit.top},true);
  for(const [x,y]of [[485,250],[495,250],[505,250],[495,253]]){
   expect(neck.pixel(x,y)[3]<25,'neck-opening-clear',[x,y]);
   expect(pixel(x,y)[3]>220,'neck-skin-connected',[x,y]);
  }
  const cuffs=avatarLayers[test.outfit.top].cuffs;
  if(cuffs){
   for(const [x,y]of cuffs.openings){expect(neck.pixel(x,y)[3]<25,'wrist-opening-clear',[x,y]);expect(pixel(x,y)[3]>220,'wrist-connected',[x,y]);}
   for(const [cx,cy,,,angle]of cuffs.openings){const a=angle*Math.PI/180;for(const u of [-6,0,6])for(let v=0;v<=12;v+=2){const x=Math.round(cx+u*Math.cos(a)-v*Math.sin(a)),y=Math.round(cy+u*Math.sin(a)+v*Math.cos(a));expect(neck.pixel(x,y)[3]<25,'wrist-front-unobstructed',[x,y]);expect(pixel(x,y)[3]>220,'wrist-axis-connected',[x,y]);}}
   for(const [x,y]of [[265,715],[770,715]]){expect(neck.pixel(x,y)[3]<25,'sleeve-clear-of-palm',[x,y]);expect(pixel(x,y)[3]>200,'palm-connected',[x,y]);}
   for(const [cx,cy,,,angle]of cuffs.openings){const a=angle*Math.PI/180,x=Math.round(cx+24*Math.sin(a)),y=Math.round(cy-24*Math.cos(a));expect(neck.pixel(x,y)[3]>160,'cuff-fabric-preserved',[x,y]);}
  }
  if(fit('top').outer)for(const [x,y]of [[495,285],[510,295],[520,320]])expect(pixel(x,y)[3]>220,'coat-inner-neck-connected',[x,y]);
  if(!fit('top').outer)expect(neck.pixel(510,295)[3]>200,'front-collar-preserved',[510,295]);
 }
 if(test.isolate){const isolated=await avatarQaPixels(test,true),profile=avatarProfiles[avatarLayers[test.isolate].profile];let samples=0;for(let y=0;y<1536;y+=8)for(let x=0;x<1024;x+=8)if(isolated.data[(y*1024+x)*4+3]>100)samples++;expect(samples>=5,'nonempty-isolated-art');for(const [x,y]of profile.probes)expect(isolated.pixel(x,y)[3]>120,'item-registration-landmark',[x,y]);}
 return {id:test.id,passed:failures.length===0,failures};
}
