// Bounded Canvas 2D painting. The production page never mounts the SVG mesh,
// recursive <use> trees, or SVG filters; the original fitting math is shared.
import {starterOutfit,itemById,skins,faces} from './avatar-data.mjs';
import {avatarLayers,avatarFaceSources,avatarAssetsRoot} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
import {avatarFraming} from './avatar-rig.mjs';
import {avatarTopTriangles,avatarNeckOpening,avatarNeckSkin} from './avatar-neckline.mjs?canvas=20261122';
import {avatarBottomTriangles,avatarWaistRig} from './avatar-waist.mjs?canvas=20261122';
import {avatarMeshGeometry} from './avatar-mesh.mjs?canvas=20261122';
import {ankleSkinBoundary} from './avatar-dressing.mjs';

export const avatarCanvasLimits={texturePixels:16_000_000,surfacePixels:1_600_000,dimension:1600};
const textures=new Map(),pins=new Set();let texturePixels=0,queue=Promise.resolve(),working=0,queued=0,dropRequested=false;
const tones={peach:[1,1,1],honey:[.87,.73,.62],cocoa:[.64,.49,.43],rose:[1,.99,1.04]};
const rect=(x,y,w,h)=>`M${x} ${y}h${w}v${h}h${-w}Z`;
const bareArms='M335 350H432L415 450 350 570 297 710 295 820H205V700L280 500ZM610 360H680L815 700V820H725L690 620 620 470Z';
const hands=rect(190,650,140,180)+rect(710,650,120,180);
const ankles='M298 1320H358L353 1354 348 1374 340 1390H310L304 1375 300 1355 298 1340Z M563 1320H623L621 1350 618 1376 608 1390H565V1366L566 1350Z';
const lining='M450 280H540L588 300 650 410 647 500 647 740H518L500 620 515 500 520 400 450 280Z';
const tuck='M430 530H740L705 600 690 620 660 660 650 850H450L435 650 420 600Z'+rect(0,0,1024,540)+'M0 530H415L400 560 385 580 370 600 355 620 345 640 335 660 330 680 310 700 305 750V850H0ZM685 530H1024V850H745V720L737 700 715 680 708 660 692 640 685 620Z';
const bootTuck=rect(0,0,1024,1240)+'M270 1235H415L365 1294 358 1350V1410H302V1320L300 1294ZM530 1235H720L624 1302V1410H566V1302Z';
const alphaTable=[0,.05,.1,.15,.2,.25,.3,.35,.4,.45,.5,.65,.85,1,1,1,1,1,1,1,1];
const alphaLut=Uint8Array.from({length:256},(_,a)=>{const f=a/255*(alphaTable.length-1),i=Math.min(alphaTable.length-2,Math.floor(f));return Math.round(255*(alphaTable[i]+(alphaTable[i+1]-alphaTable[i])*(f-i)));});
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function context(c){const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('캐릭터 그리기를 지원하지 않는 브라우저입니다.');return ctx;}
const clipped=(ctx,path,draw)=>{ctx.save();ctx.clip(typeof path==='string'?new Path2D(path):path);draw();ctx.restore();};
function evict(){while(texturePixels>avatarCanvasLimits.texturePixels){const entry=[...textures].find(([key])=>!pins.has(key));if(!entry)break;const[key,value]=entry;textures.delete(key);texturePixels-=value.pixels;value.image.close?.();if(value.image instanceof HTMLCanvasElement)value.image.width=value.image.height=0;}}
async function texture(name,kind='raw'){
 const key=name+':'+kind;
 if(textures.has(key)){const value=textures.get(key);textures.delete(key);textures.set(key,value);return value.image;}
 const response=await fetch(avatarAssetsRoot+name+'.png');if(!response.ok)throw Error('원화 이미지를 불러오지 못했어요.');
 const blob=await response.blob();let image;
 if(typeof createImageBitmap==='function')image=await createImageBitmap(blob);
 else{const url=URL.createObjectURL(blob);try{image=new Image();image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}}
 const width=image.width,height=image.height;
 if(kind!=='raw'){
  const c=canvas(width,height),ctx=context(c);ctx.drawImage(image,0,0);image.close?.();const data=ctx.getImageData(0,0,width,height),rgba=data.data;
  if(kind==='fabric')for(let i=3;i<rgba.length;i+=4)rgba[i]=Math.max(0,Math.round((rgba[i]-5.2)/.98));
  else{const tone=tones[kind];for(let i=0;i<rgba.length;i+=4)for(let k=0;k<3;k++)rgba[i+k]=Math.min(255,Math.round(rgba[i+k]*tone[k]));}
  ctx.putImageData(data,0,0);
  if(typeof createImageBitmap==='function'){image=await createImageBitmap(c);c.width=c.height=0;}else image=c;
 }
 textures.set(key,{image,pixels:width*height});texturePixels+=width*height;evict();return image;
}
export function clearAvatarTextureCache(){if(working){dropRequested=true;return;}for(const{image}of textures.values()){image.close?.();if(image instanceof HTMLCanvasElement)image.width=image.height=0;}textures.clear();texturePixels=0;dropRequested=false;}
export const avatarCanvasStats=()=>({texturePixels,textureCount:textures.size,working,queued,limits:{...avatarCanvasLimits}});
export function avatarCanvasSpec(value={},options={}){
 const outfit={...starterOutfit};for(const slot of Object.keys(outfit)){const id=(options.outfit||value.equipped||starterOutfit)[slot];if(itemById(id)?.slot===slot)outfit[slot]=id;else if(['hat','accessory'].includes(slot))outfit[slot]=null;}
 const skin=skins.some(s=>s.id===value.skin)?value.skin:'peach',face=faces.some(f=>f.id===value.face)?value.face:'smile',framing=options.framing||'full';
 const frame=options.frame||String(framing==='slot'?avatarFraming(options.focusSlot,avatarProfiles[avatarLayers[outfit[options.focusSlot]]?.profile]?.framing||itemById(outfit[options.focusSlot])?.style):framing==='portrait'?avatarFraming('portrait'):'160 -100 700 1640').split(' ').map(Number);
 const [,,w,h]=frame,scale=Math.min((options.width||700)/w,(options.height||1200)/h,avatarCanvasLimits.dimension/Math.max(w,h),Math.sqrt(avatarCanvasLimits.surfacePixels/(w*h)));
 return{outfit,skin,face,framing,frame,width:Math.max(1,Math.round(w*scale)),height:Math.max(1,Math.round(h*scale))};
}
export function renderAvatarCanvas(value={},options={}){
 queued++;
 const task=queue.then(async()=>{try{if(options.isCurrent&&!options.isCurrent())throw new DOMException('Preview cancelled','AbortError');working++;try{return await paint(value,options);}finally{working--;if(dropRequested)clearAvatarTextureCache();}}finally{queued--;}});
 queue=task.catch(()=>{});return task;
}
async function paint(value,options){
 const spec=avatarCanvasSpec(value,options),{outfit,skin,face,frame,width,height}=spec;
 const output=canvas(width,height),layer=canvas(width,height),aux=canvas(width,height),ctx=context(output),lc=context(layer),ac=context(aux);
 const transform=c=>c.setTransform(width/frame[2],0,0,height/frame[3],-frame[0]*width/frame[2],-frame[1]*height/frame[3]);
 const clear=(c,surface)=>{c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.clearRect(0,0,width,height);transform(c);};
 const images=new Map();
 async function get(name,kind='raw'){const key=name+':'+kind;pins.add(key);if(!images.has(key))images.set(key,await texture(name,kind));return images.get(key);}
 try{
  // Decode sequentially under a pixel budget. Only this paint job holds sources.
  const base=await get('base'),skinBase=skin==='peach'?base:await get('base',skin),faceAtlas=await get('faces',skin==='peach'?'raw':skin);
  for(const id of Object.values(outfit).filter(Boolean)){const a=avatarLayers[id];await get(a.atlas,['top','bottom'].includes(itemById(id).slot)?'fabric':'raw');}
  if(options.isCurrent&&!options.isCurrent())throw new DOMException('Preview cancelled','AbortError');
  const drawTexture=(c,atlas,source,target,kind='raw')=>c.drawImage(images.get(atlas+':'+kind),...source,...target);
  const drawItem=(c,id)=>{if(!id)return;const a=avatarLayers[id],p=avatarProfiles[a.profile],kind=['top','bottom'].includes(p.slot)?'fabric':'raw';
   if(a.legFit){const[sx,sy,sw,sh]=a.source,[x,y,w,h]=a.target,{start,end,shifts}=a.legFit,sourceY=v=>sy+(v-y)*sh/h;
    drawTexture(c,a.atlas,[sx,sy,sw,sourceY(start+3)-sy],[x,y,w,start+3-y],kind);
    const top=start-3;for(const[i,left,right]of [[0,x,480],[1,480,x+w]]){const k=shifts[i]/(end-start);c.save();c.transform(1,0,k,1,-k*start,0);drawTexture(c,a.atlas,[sx+(left-x)*sw/w,sourceY(top),(right-left)*sw/w,sourceY(y+h)-sourceY(top)],[left,top,right-left,y+h-top],kind);c.restore();}
   }else if(p.kind==='segments')for(const s of a.segments)drawTexture(c,a.atlas,s.source,s.target,kind);else drawTexture(c,a.atlas,a.source,a.target,kind);
   if(options.waistMarkers===p.slot)for(const[i,[x,y]]of a.waist.points.entries()){c.fillStyle=['#ff00ff','#00ffff','#ffff00'][i];c.fillRect(x-3,y-3,6,6);}
  };
  const triangles=(c,list,draw)=>{for(const{src,dst}of list){const{points,matrix}=avatarMeshGeometry(src,dst),path=new Path2D();points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();clipped(c,path,()=>{c.transform(...matrix);draw();});}};
  const composite=()=>{const data=lc.getImageData(0,0,width,height);for(let i=3;i<data.data.length;i+=4)data.data[i]=alphaLut[data.data[i]];lc.putImageData(data,0,0);};
  const blit=()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(layer,0,0);ctx.restore();};
  const fit=slot=>avatarProfiles[avatarLayers[outfit[slot]]?.profile],topFit=fit('top'),bottomFit=fit('bottom'),shoeFit=fit('shoes'),accessoryFit=fit('accessory');
  const arms=topFit.bareArms?bareArms:hands,clothes=(!bottomFit.longLegs?rect(0,bottomFit.legStart,1024,1341-bottomFit.legStart):'')+ankles,skinClip=arms+ankleSkinBoundary,body=arms+clothes;
  const overalls=!!bottomFit.overTop&&!topFit.outer,bootClip=bottomFit.longLegs&&shoeFit.boot;
  const order=[];const include=id=>!options.isolate||options.isolate===id;
  transform(ctx);
  if(!options.isolate){clipped(ctx,body,()=>{clipped(ctx,clothes,()=>ctx.drawImage(base,0,0));clipped(ctx,skinClip,()=>ctx.drawImage(skinBase,0,0));});}
  function neck(c,atlas=faceAtlas){
   c.drawImage(atlas,...avatarFaceSources[face],432,39,159,244);
   clear(ac,aux);ac.save();ac.translate(0,-36.75);ac.scale(1,1.15);ac.drawImage(atlas,...avatarFaceSources[face],432,39,159,244);ac.restore();
   ac.globalCompositeOperation='destination-in';const gradient=ac.createLinearGradient(0,242,0,252);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(1,'white');ac.fillStyle=gradient;ac.fillRect(430,240,170,75);ac.globalCompositeOperation='source-over';
   c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(aux,0,0);c.restore();
  }
  if(!options.isolate){clipped(ctx,avatarNeckSkin,()=>neck(ctx));if(topFit.lining)clipped(ctx,lining,()=>ctx.drawImage(base,0,0));}
  const bottom=correctAlpha=>{clear(lc,layer);const a=avatarLayers[outfit.bottom],r=a.waist?.rise<0?avatarWaistRig.overall:avatarWaistRig.bottom;
   const draw=()=>{if(a.waist){triangles(lc,avatarBottomTriangles(a),()=>drawItem(lc,outfit.bottom));clipped(lc,rect(0,0,1024,r.start+.2)+rect(0,r.end-.2,1024,1536),()=>drawItem(lc,outfit.bottom));}else drawItem(lc,outfit.bottom);};
   if(bootClip)clipped(lc,bootTuck,draw);else draw();if(correctAlpha)composite();
  };
  if(!overalls&&include(outfit.bottom)){bottom(true);blit();order.push(outfit.bottom);}
  if(include(outfit.top)){
   clear(lc,layer);const draw=()=>triangles(lc,avatarTopTriangles(avatarLayers[outfit.top]),()=>drawItem(lc,outfit.top));if(overalls&&options.waistMarkers!=='top')clipped(lc,tuck,draw);else draw();
   lc.globalCompositeOperation='destination-out';clipped(lc,avatarNeckSkin,()=>clipped(lc,avatarNeckOpening(avatarLayers[outfit.top].neckline),()=>neck(lc,images.get('faces:'+ (skin==='peach'?'raw':skin)))));
   for(const[cx,cy,rx,ry,angle]of avatarLayers[outfit.top].cuffs?.openings||[]){lc.save();lc.translate(cx,cy);lc.rotate(angle*Math.PI/180);const p=new Path2D(`M${-rx} 0Q0 ${2*ry} ${rx} 0V36H${-rx}Z`);lc.clip(p);lc.rotate(-angle*Math.PI/180);lc.translate(-cx,-cy);lc.drawImage(base,0,0);lc.restore();}
   lc.globalCompositeOperation='source-over';composite();blit();order.push(outfit.top);
  }
  if(overalls&&include(outfit.bottom)){bottom(true);blit();order.push(outfit.bottom);}
  if(include(outfit.shoes)){
   clear(lc,layer);drawItem(lc,outfit.shoes);
   if(shoeFit.boot){clear(ac,aux);clipped(ac,body,()=>ac.drawImage(base,0,0));bottom(false);ac.setTransform(1,0,0,1,0,0);ac.drawImage(layer,0,0);clear(lc,layer);drawItem(lc,outfit.shoes);lc.globalCompositeOperation='destination-out';const mouths=new Path2D();for(const[cx,cy,rx,ry,angle]of avatarLayers[outfit.shoes].openings||[]){const a=angle*Math.PI/180;mouths.moveTo(cx+rx*Math.cos(a),cy+rx*Math.sin(a));mouths.ellipse(cx,cy,rx,ry,a,0,Math.PI*2);mouths.closePath();}clipped(lc,mouths,()=>{lc.setTransform(1,0,0,1,0,0);lc.drawImage(aux,0,0);});lc.globalCompositeOperation='source-over';}
   blit();order.push(outfit.shoes);
  }
  const accessory=()=>{if(!outfit.accessory||!include(outfit.accessory))return;clear(lc,layer);lc.save();if(accessoryFit.mirror){lc.translate(1024,0);lc.scale(-1,1);}if(accessoryFit.faceClip){const p=new Path2D();p.ellipse(501,146.5,25.5,21,57*Math.PI/180,0,Math.PI*2);p.ellipse(563,155,26,24,70*Math.PI/180,0,Math.PI*2);p.rect(521,137,30,40);p.rect(469,126,20,29);p.rect(578,137,18,30);lc.clip(p);}drawItem(lc,outfit.accessory);lc.restore();if(accessoryFit.shoulderClip){lc.globalCompositeOperation='destination-in';clipped(lc,rect(0,0,1024,400),()=>lc.drawImage(base,0,0));lc.globalCompositeOperation='source-over';}blit();order.push(outfit.accessory);};
  if(accessoryFit?.behindHair)accessory();
  for(const slot of ['hair','hat'])if(outfit[slot]&&include(outfit[slot])){drawItem(ctx,outfit[slot]);order.push(outfit[slot]);}
  if(!accessoryFit?.behindHair)accessory();
  output.dataset.avatarFrame=frame.join(' ');output.dataset.avatarRenderer='canvas-v1';output.dataset.avatarStyle='raster-b-v1';output.dataset.pose='idle';output.dataset.framing=spec.framing;output.dataset.skin=skin;output.dataset.face=face;
  for(const id of order){const marker=document.createElement('span');marker.hidden=true;marker.dataset.item=id;marker.dataset.layer=itemById(id).slot;output.append(marker);}
  return output;
 }catch(error){output.width=output.height=0;throw error;}finally{layer.width=layer.height=aux.width=aux.height=0;images.clear();pins.clear();evict();}
}
