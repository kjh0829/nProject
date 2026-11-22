import {renderAvatarCanvas} from './avatar-canvas.mjs?renderer=20261122-detail2';
import {avatarWaistRig} from './avatar-waist.mjs';
import {avatarItems} from './avatar-data.mjs';
import {avatarArt} from './avatar-art.mjs';
import {avatarLayers,avatarAssetsRoot} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
import {shoeFitFor,shoeInsertion,shoeOpeningBounds,shoeShadowAt,fittedShoePoint} from './avatar-shoe-fit.mjs?fit=20261122d';
const cache=new Map(),rawAtlases=new Map();
async function textureUrl(href){if(!href.startsWith(avatarAssetsRoot)||!/^[-a-z0-9]+\.png$/.test(href.slice(avatarAssetsRoot.length)))throw Error('Unexpected QA texture URL');if(!cache.has(href))cache.set(href,(async()=>{const response=await fetch(href);if(!response.ok)throw Error(`Texture failed ${response.status}: ${href}`);const blob=await response.blob();return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});})().catch(e=>{cache.delete(href);throw e;}));return cache.get(href);}
// Raw atlas alpha keeps a copied numeric registration from passing on empty space.
async function rawAtlas(key){
 if(!rawAtlases.has(key))rawAtlases.set(key,(async()=>{
  const image=new Image();image.src=await textureUrl(avatarAssetsRoot+key+'.png');await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  return{width:canvas.width,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
 })());
 return rawAtlases.get(key);
}
async function waistFabricAlpha(layer){
 const {width,data}=await rawAtlas(layer.atlas),[sx,sy,sw,sh]=layer.source,[x,y,w,h]=layer.target;
 return layer.waist.points.map(([px,py])=>data[(Math.round(sy+(py-y)*sh/h)*width+Math.round(sx+(px-x)*sw/w))*4+3]);
}
export async function inspectShoeFit(test,picture,isolated){
 const layer=avatarLayers[test.outfit.shoes],frames=shoeFitFor(test.outfit.shoes,layer);if(!frames)return[];
 const failures=[],expect=(ok,rule,point)=>{if(!ok)failures.push({rule,point});},base=await rawAtlas('base'),atlas=await rawAtlas(layer.atlas),pathContext=document.createElement('canvas').getContext('2d');
 const tone={peach:[1,1,1],honey:[.87,.73,.62],cocoa:[.64,.49,.43],rose:[1,.99,1.04]}[test.look.skin||'peach'],long=avatarProfiles[avatarLayers[test.outfit.bottom].profile].longLegs;
 for(let i=0;i<2;i++){
  const frame=frames[i],path=new Path2D(shoeInsertion(layer,i,frames)),bounds=shoeOpeningBounds(layer,i,frames),[ax,ay]=frame.anchor;
  expect(atlas.data[(Math.round(ay)*atlas.width+Math.round(ax))*4+3]>180,'shoe-heel-on-original-art',frame.anchor);
  let samples=0;const xs=bounds.points.map(p=>p[0]);
  for(let y=1356;y<bounds.maxY-2;y+=2)for(let x=Math.ceil(Math.min(...xs)+2);x<Math.max(...xs)-2;x+=2){
   if(![[0,0],[-1.5,0],[1.5,0],[0,-1.5],[0,1.5]].every(([dx,dy])=>pathContext.isPointInPath(path,x+.5+dx,y+.5+dy)))continue;
   const raw=[...base.data.slice((y*base.width+x)*4,(y*base.width+x)*4+4)];if(raw[3]<250)continue;samples++;
   expect(isolated.pixel(x,y)[3]<25,'shoe-interior-opens-around-foot',[x,y]);expect(picture.pixel(x,y)[3]>220,'shoe-foot-filled-behind-rim',[x,y]);
   if(!long){const t=tone,shade=shoeShadowAt(bounds,y+.5),expected=raw.slice(0,3).map((v,k)=>Math.min(255,Math.round(v*t[k]))*(1-shade)+[34,23,29][k]*shade),actual=picture.pixel(x,y);expect(expected.every((v,k)=>Math.abs(v-actual[k])<9),'shoe-wearer-skin-and-contact-shadow',[x,y]);}
  }
  expect(samples>=3,'shoe-heel-cup-meets-foot',frame.anchor);
  const [l,,r,f]=frame.opening,source=[0,1].map(k=>(l[k]+r[k])/4+f[k]/2);
  const [x,y]=fittedShoePoint(layer,i,source,frames);
  expect(isolated.pixel(Math.round(x),Math.round(y+8))[3]>160,'shoe-front-collar-preserved',[x,y+8]);
 }
 return failures;
}
export async function avatarQaPixels(test,isolate=false,options={}){
 const doc=new DOMParser().parseFromString(avatarArt(test.look,{outfit:test.outfit}).replace('160 -100 700 1640','0 0 1024 1536'),'image/svg+xml'),svg=doc.documentElement;svg.setAttribute('width','1024');svg.setAttribute('height','1536');
 if(isolate){const target=svg.querySelector(`[data-item="${test.isolate}"]`);if(!target)throw Error('Missing item layer '+test.isolate);for(const child of [...svg.children])if(child.tagName!=='defs'&&child!==target&&!child.contains(target))child.remove();}
 if(options.waistMarkers){
  const slot=options.waistMarkers,layer=avatarLayers[test.outfit[slot]],source=svg.querySelector(`g[id$="-${slot==='top'?'top':'waist'}-source"]`);
  if(!source)throw Error('Missing registered waist source');
  if(slot==='top')svg.querySelector(`[data-item="${test.outfit.top}"]`).removeAttribute('clip-path');
  // Measure registration before an outer coat hides the hip landmarks. The
  // unmarked outfit is sampled separately for the visible underarm and hip.
  if(slot==='bottom')svg.querySelector('g[clip-path$="-inside-coat)"]')?.removeAttribute('clip-path');
  for(const [i,[x,y]]of layer.waist.points.entries()){
   const rect=doc.createElementNS('http://www.w3.org/2000/svg','rect');
   for(const[k,v]of Object.entries({x:x-3,y:y-3,width:6,height:6,fill:['#ff00ff','#00ffff','#ffff00'][i]}))rect.setAttribute(k,v);
   source.append(rect);
  }
 }
 if(options.renderer==='canvas'){
  const c=await renderAvatarCanvas(test.look,{outfit:test.outfit,frame:[0,0,1024,1536],width:1024,height:1536,isolate:isolate?test.isolate:null,waistMarkers:options.waistMarkers});
  const actual=[...c.children].map(n=>n.dataset.item),expected=[...svg.querySelectorAll('[data-item]')].map(n=>n.dataset.item);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Canvas layer order differs from the registered composition');
  const data=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1024,1536).data;c.width=c.height=0;
  return{svg,data,pixel:(x,y)=>{const i=(Math.round(y)*1024+Math.round(x))*4;return[...data.slice(i,i+4)];}};
 }
 await Promise.all([...svg.querySelectorAll('image')].map(async node=>node.setAttribute('href',await textureUrl(node.getAttribute('href')))));
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,1024,1536).data;return {svg,pixel:(x,y)=>{const i=(Math.round(y)*1024+Math.round(x))*4;return [...data.slice(i,i+4)];},data};}finally{URL.revokeObjectURL(url);}
}
export async function inspectAvatarCase(test,renderer='svg'){
 const memo=new Map(),pixels=(value,isolate=false,options={})=>{const key=JSON.stringify([value.outfit,value.look,value.isolate,isolate,options]);if(!memo.has(key))memo.set(key,avatarQaPixels(value,isolate,{...options,renderer}));return memo.get(key);};
 const failures=[],expect=(ok,rule,point)=>{if(!ok)failures.push({rule,point});};const {pixel,svg}=await pixels(test);
 const entries=Object.entries(test.outfit).filter(([,id])=>id),fit=slot=>avatarProfiles[avatarLayers[test.outfit[slot]]?.profile];
 for(const [slot,id]of entries)expect(svg.querySelectorAll(`[data-item="${id}"]`).length===1,`registered-layer:${slot}`);
 if(test.groups.includes('top-bottom')||test.isolate&&['top','bottom'].includes(avatarItems.find(i=>i.id===test.isolate)?.slot)){
  const slots=test.isolate?[avatarItems.find(i=>i.id===test.isolate).slot]:['top','bottom'];
  for(const slot of slots){
   const id=test.outfit[slot],layer=avatarLayers[id],marked=await pixels({...test,isolate:id},true,{waistMarkers:slot});
   const contact=await waistFabricAlpha(layer);for(const [i,alpha]of contact.entries())if(!(slot==='top'&&fit('top').outer&&i===1))expect(alpha>180,'waist-fabric-landmark:'+slot+':'+['left','front','right'][i],layer.waist.points[i]);
   for(const [i,[cx,cy]]of avatarWaistRig.points.entries()){
    const y=cy+layer.waist.rise,color=[[255,0,255],[0,255,255],[255,255,0]][i],hits=[];
    for(let py=y-4;py<=y+4;py++)for(let x=cx-4;x<=cx+4;x++){const rgba=marked.pixel(x,py);if(rgba[3]>220&&color.every((c,k)=>Math.abs(c-rgba[k])<18))hits.push([x,py]);}
    const mean=hits.length?[0,1].map(k=>hits.reduce((n,p)=>n+p[k],0)/hits.length):[Infinity,Infinity];
    expect(hits.length>=3&&Math.hypot(mean[0]-cx,mean[1]-y)<2.5,'waist-frame:'+slot+':'+['left','front','right'][i],[cx,y]);
   }
  }
  for(const [x,y]of [[430,670],[445,690],[460,710],[650,675],[650,700],[640,720]])expect(pixel(x,y)[3]>200,'hip-contour-connection',[x,y]);
 }

 for(let x=490;x<=620;x+=20)for(let y=620;y<=710;y+=15)expect(pixel(x,y)[3]>170,'waist-connection',[x,y]);
 for(const [x,y]of [[311,600],[300,620],[290,640],[279,660],[271,680],[265,700],[255,720],[714,600],[724,640],[737,660],[747,680],[755,700],[767,720]])expect(pixel(x,y)[3]>150,'sleeve-hand-connection',[x,y]);
 for(const x of [330,595])for(let y=1320;y<=1380;y+=10)expect(pixel(x,y)[3]>150,'ankle-connection',[x,y]);
 if(fit('hair').faceClear){const [r,,b,a]=pixel(520,180);expect(a>200&&r>b+25,'hair-face-clearance',[520,180]);}
 if(fit('bottom').overTop&&!fit('top').outer){const ids=[...svg.children].map(n=>n.getAttribute('data-item'));expect(ids.indexOf(test.outfit.bottom)>ids.indexOf(test.outfit.top),'overall-above-shirt');}
 if(fit('accessory')?.perch){const top=await pixels({...test,isolate:test.outfit.top},true);for(const[x,y]of avatarLayers[test.outfit.accessory].perchPoints)expect(top.pixel(x,y)[3]>180,'companion-shoulder-contact',[x,y]);}
 if(fit('shoes').boot){const ids=[...svg.children].map(n=>n.getAttribute('data-item'));expect(ids.indexOf(test.outfit.shoes)>ids.indexOf(test.outfit.bottom),'boot-above-trousers');}
 if(test.groups.includes('top-look')||test.isolate?.startsWith('top-')){
  const neck=await pixels({...test,isolate:test.outfit.top},true);
  for(const [x,y]of [[485,250],[495,250],[505,250],[495,253]]){
   expect(neck.pixel(x,y)[3]<25,'neck-opening-clear',[x,y]);
   expect(pixel(x,y)[3]>220,'neck-skin-connected',[x,y]);
  }
  const cuffs=avatarLayers[test.outfit.top].cuffs;
  if(cuffs){
   for(const [cx,cy,,ry,angle]of cuffs.openings){expect(neck.pixel(cx,cy)[3]>180,'cuff-front-preserved',[cx,cy]);const a=angle*Math.PI/180,x=Math.round(cx-(ry+3)*Math.sin(a)),y=Math.round(cy+(ry+3)*Math.cos(a));expect(neck.pixel(x,y)[3]<25,'wrist-exit-clear',[x,y]);expect(pixel(x,y)[3]>220,'wrist-connected',[x,y]);}
   for(const [cx,cy,,ry,angle]of cuffs.openings){const a=angle*Math.PI/180;for(const u of [-6,0,6])for(let v=ry+3;v<=ry+15;v+=2){const x=Math.round(cx+u*Math.cos(a)-v*Math.sin(a)),y=Math.round(cy+u*Math.sin(a)+v*Math.cos(a));expect(neck.pixel(x,y)[3]<25,'wrist-front-unobstructed',[x,y]);expect(pixel(x,y)[3]>220,'wrist-axis-connected',[x,y]);}}
   for(const [x,y]of [[265,715],[770,715]]){expect(neck.pixel(x,y)[3]<25,'sleeve-clear-of-palm',[x,y]);expect(pixel(x,y)[3]>200,'palm-connected',[x,y]);}
   for(const [cx,cy,,,angle]of cuffs.openings){const a=angle*Math.PI/180,x=Math.round(cx+24*Math.sin(a)),y=Math.round(cy-24*Math.cos(a));expect(neck.pixel(x,y)[3]>160,'cuff-fabric-preserved',[x,y]);}
  }
  if(fit('top').outer)for(const [x,y]of [[495,285],[510,295],[520,320]])expect(pixel(x,y)[3]>220,'coat-inner-neck-connected',[x,y]);
  if(!fit('top').outer)expect(neck.pixel(510,295)[3]>200,'front-collar-preserved',[510,295]);
 }
 if(fit('accessory')?.shoulderClip){const item=svg.querySelector(`[data-item="${test.outfit.accessory}"]`),root=n=>{while(n.parentElement!==svg)n=n.parentElement;return n;},children=[...svg.children];expect(children.indexOf(root(item))<children.indexOf(svg.querySelector('[data-layer="hair"]')),'bag-strap-behind-hair');expect(!!item.closest('[mask]'),'bag-shoulder-clipping');}
 if(fit('shoes').boot){
  const shoes=test.outfit.shoes,low=avatarItems.find(i=>i.slot==='shoes'&&!avatarProfiles[avatarLayers[i.id].profile].boot);
  const reference=await pixels({...test,outfit:{...test.outfit,shoes:low.id},isolate:null});
  const backRim={'shoes-red':[[327,1314],[602,1307]],'shoes-star':[[328,1303],[586,1312]]};
  for(const [x,y] of [...avatarLayers[shoes].openings,...(backRim[shoes]||[])]){
   const expected=reference.pixel(x,y),actual=pixel(x,y);
   expect(expected[3]>200&&actual.every((v,i)=>Math.abs(v-expected[i])<5),'boot-leg-insertion',[x,y]);
  }
 }
 if(test.outfit.bottom==='bottom-overall'&&fit('top').outer&&test.groups.includes('top-bottom')){
  for(const [x,y] of [[485,500],[411,625]]) expect(pixel(x,y)[3]<25,'bib-inside-coat-opening',[x,y]);
 }
 if(shoeFitFor(test.outfit.shoes,avatarLayers[test.outfit.shoes])&&(test.groups.includes('bottom-shoes')||test.groups.includes('shoe-skin')||test.isolate===test.outfit.shoes))failures.push(...await inspectShoeFit(test,{pixel},await pixels({...test,isolate:test.outfit.shoes},true)));
 if(test.isolate){const isolated=await pixels(test,true),profile=avatarProfiles[avatarLayers[test.isolate].profile];let samples=0;for(let y=0;y<1536;y+=8)for(let x=0;x<1024;x+=8)if(isolated.data[(y*1024+x)*4+3]>100)samples++;expect(samples>=5,'nonempty-isolated-art');for(const [x,y]of profile.probes)expect(isolated.pixel(x,y)[3]>120,'item-registration-landmark',[x,y]);}
 if(test.isolate){
  const a=avatarLayers[test.isolate],p=avatarProfiles[a.profile];
  if(a.legFit){const isolated=await pixels(test,true);for(const [left,right,center]of [[270,420,324.5],[530,710,593]]){const xs=[];for(let x=left;x<right;x++)if(isolated.pixel(x,1350)[3]>180)xs.push(x);const mean=xs.reduce((a,b)=>a+b,0)/xs.length;expect(xs.length>20&&Math.abs(mean-center)<4,'hem-ankle-alignment',[center,1350]);}}
  const isolated=await pixels(test,true),alpha=(x,y)=>isolated.pixel(x,y)[3];
  if(p.shoulderClip){
   for(const [x,y] of [[600,277],[610,277],[615,285],[620,300]]) expect(alpha(x,y)<25,'strap-off-shoulder-trim',[x,y]);
   const shirt=await pixels({...test,isolate:test.outfit.top},true);
   let contact=0;
   for(let x=548;x<=628;x+=2){
    const crest=picture=>{for(let y=231;y<350;y++)if(picture.pixel(x,y)[3]>175)return y;return null;};
    const strapY=crest(isolated),shirtY=crest(shirt);
    if(strapY!==null&&shirtY!==null&&Math.abs(strapY-shirtY)<=3)contact++;
   }
   expect(contact>=3,'strap-meets-equipped-shoulder');
  }
  if(test.isolate==='bottom-overall'){
   for(const [x,y] of [[463,272],[578,291],[510,398],[621,398]]) expect(alpha(x,y)>200,'bib-shoulders-and-buckles',[x,y]);
   for(const [x,y] of [[460,337],[550,372]]) expect(alpha(x,y)<25,'bib-rear-straps-hidden',[x,y]);
  }
  if(test.isolate==='hair-lilac'){
   for(const [x,y] of [[499,191],[550,206]]) expect(alpha(x,y)<25,'rear-curl-behind-cheek',[x,y]);
   expect(alpha(478,201)>200,'front-curl-retained',[478,201]);
  }
  if(test.isolate==='top-starlit') expect(alpha(710,775)<25,'no-thread-below-cuff',[710,775]);
  const neighbours={'shoes-forest':[[389,1428]],'shoes-coast':[[391,1424],[547,1481]]};
  for(const point of neighbours[test.isolate]||[]) expect(alpha(...point)<25,'no-neighbouring-shoe-pixels',point);
  if(p.faceClip){const isolated=await pixels(test,true);expect(isolated.pixel(535,124)[3]<25,'no-floating-glasses-arm',[535,124]);}
 }
 return {id:test.id,passed:failures.length===0,failures};
}
