import {fittedHatTarget, hatLining, seatedHairParts,lilacRearWaves} from './avatar-head-fit.mjs?detail=3';
import {shoeFitFor,shoeFrame,shoeDepthSvg,bootInsertion,shoeSegmentOutline} from './avatar-shoe-fit.mjs?fit=20261122d';
import {fittedAvatarBottom} from './avatar-waist.mjs?detail=3';
import {itemById,starterOutfit,skins,faces} from './avatar-data.mjs';
import {avatarAssetsRoot,avatarAtlases,avatarLayers,avatarFaceSources} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
import {garmentPieces,bibEdges,ankleSkinBoundary,coatOpening,bibInsideCoat} from './avatar-dressing.mjs?detail=3';
import {avatarFraming} from './avatar-rig.mjs';
import {avatarNeckOpening,avatarNeckSkin,fittedAvatarTop} from './avatar-neckline.mjs?detail=3';
let serial=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawTexture=(atlas,source,target)=>`<svg x="${target[0]}" y="${target[1]}" width="${target[2]}" height="${target[3]}" viewBox="${source.join(' ')}" preserveAspectRatio="none" overflow="hidden"><image href="${avatarAssetsRoot+atlas}.png" width="${avatarAtlases[atlas].width}" height="${avatarAtlases[atlas].height}"/></svg>`;
const group=(id,art,extra='')=>`<g data-item="${id}" data-layer="${itemById(id).slot}" ${extra}>${art}</g>`;
function itemArtwork(id,texture,uid){
 const a=avatarLayers[id];
 if(!a) return '';
 const profile=avatarProfiles[a.profile];
 if(a.legFit || profile.shoulderClip) {
  return garmentPieces(id,a).map(({source,target,matrix,edge})=>{
   let art=texture(a.atlas,source,target);
   if(edge) art=`<g clip-path="url(#${uid}-bib-${edge})">${art}</g>`;
   return matrix ? `<g transform="matrix(${matrix.join(' ')})">${art}</g>` : art;
  }).join('');
 }
 if(profile.kind==='segments') return a.segments.map((segment,i)=>{
  let art=texture(a.atlas,segment.source,segment.target);
  if(profile.slot!=='shoes') return art;
  if(shoeSegmentOutline(id,a,i)) art=`<g clip-path="url(#${uid}-shoe-edge-${i})">${art}</g>`;
  const fit=shoeFitFor(id,a);
  return fit ? `<g transform="matrix(${shoeFrame(a,i,fit).join(' ')})">${art}</g>` : art;
 }).join('');
 return texture(a.atlas,a.source,a.target);
}
// Masks follow exposed anatomy. No broad rectangles through the torso/hips.
const bareArms='<path d="M335 350H432L415 450 350 570 297 710 295 820H205V700L280 500ZM610 360H680L815 700V820H725L690 620 620 470Z"/>';

const hands='<rect x="190" y="650" width="140" height="180"/><rect x="710" y="650" width="120" height="180"/>';
// Follow the actual coat opening; the armpit cut-outs must stay empty.
const coatLining=`<path d="${coatOpening}"/>`;
export function avatarArt(value={},options={}){
 const outfit={...starterOutfit};for(const slot of Object.keys(outfit)){const id=(options.outfit||value.equipped||starterOutfit)[slot];if(itemById(id)?.slot===slot)outfit[slot]=id;else if(['hat','accessory'].includes(slot))outfit[slot]=null;}
 const skin=skins.some(s=>s.id===value.skin)?value.skin:'peach',face=faces.some(f=>f.id===value.face)?value.face:'smile',uid='avatar-art-'+(++serial),top=itemById(outfit.top),bottom=itemById(outfit.bottom),framing=options.framing||'full';
 const viewBox=framing==='slot'?avatarFraming(options.focusSlot,avatarProfiles[avatarLayers[outfit[options.focusSlot]]?.profile]?.framing||itemById(outfit[options.focusSlot])?.style):framing==='portrait'?avatarFraming('portrait'):'160 -100 700 1640';
 const texture=rawTexture,fabricTexture=(...args)=>rawTexture(...args).replace('<image ',`<image filter="url(#${uid}-fabric-alpha)" `);
 const itemLayer=(id,extra='')=>avatarLayers[id]?group(id,itemArtwork(id,texture,uid),extra):'';
 const bottomSource=itemArtwork(outfit.bottom,fabricTexture,uid);
 const bottomFitted=fittedAvatarBottom(avatarLayers[outfit.bottom],uid,bottomSource);
 const fabricGroup=(id,art,extra='')=>group(id,art,`${extra} filter="url(#${uid}-fabric-composite)"`);
 const bottomLayer=extra=>{
  let art=bottomFitted.art;
  if(outfit.bottom==='bottom-overall'){
   const fit=topFit.outer ? `clip-path="url(#${uid}-inside-coat)"` : `mask="url(#${uid}-shoulder)"`;
   art=`<g ${fit}>${art}</g>`;
  }
  return fabricGroup(outfit.bottom,art,extra);
 };
 const tone={peach:[1,1,1],honey:[.87,.73,.62],cocoa:[.64,.49,.43],rose:[1,.99,1.04]}[skin];
 const filter=`<filter id="${uid}-skin" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${tone[0]}"/><feFuncG type="linear" slope="${tone[1]}"/><feFuncB type="linear" slope="${tone[2]}"/></feComponentTransfer></filter>`;
 const neckTexture=`${texture('faces',avatarFaceSources[face],[432,39,159,244])}<g mask="url(#${uid}-neck-blend)" clip-path="url(#${uid}-extended-neck)"><g transform="translate(0 -36.75) scale(1 1.15)">${texture('faces',avatarFaceSources[face],[432,39,159,244])}</g></g>`;
 const topFit=avatarProfiles[avatarLayers[outfit.top].profile],bottomFit=avatarProfiles[avatarLayers[outfit.bottom].profile],shoeFit=avatarProfiles[avatarLayers[outfit.shoes].profile],accessoryFit=outfit.accessory?avatarProfiles[avatarLayers[outfit.accessory].profile]:null;
 const longBottom=!!bottomFit.longLegs,legStart=bottomFit.legStart;
 const armsClip=topFit.bareArms?bareArms:hands;
 const ankleClip='<path d="M298 1320H358L353 1354 348 1374 340 1390H310L304 1375 300 1355 298 1340Z M563 1320H623L621 1350 618 1376 608 1390H565V1366L566 1350Z"/>';
 const tightsClip=!longBottom?`<rect x="0" y="${legStart}" width="1024" height="${1341-legStart}"/>`:'';
 const skinClip=armsClip+`<path d="${ankleSkinBoundary}"/>`,clothesBody=tightsClip+ankleClip;
 const bodyClip=armsClip+clothesBody;
 const legClip=longBottom&&shoeFit.boot?`clip-path="url(#${uid}-boot-tuck)"`:'';
 const bibOnTop=!!bottomFit.overTop&&!topFit.outer;
 // Overalls are one continuous foreground garment, never a separately cropped bib.
 const lower=bibOnTop?'':bottomLayer(legClip);
 const fitted=fittedAvatarTop(avatarLayers[outfit.top],uid,fabricTexture);
 const topArt=fabricGroup(outfit.top,`<g mask="url(#${uid}-neck-mask)">${fitted.art}</g>`,bibOnTop?`clip-path="url(#${uid}-tucked)"`:'');
 const accRaw=outfit.accessory?itemLayer(outfit.accessory,accessoryFit.faceClip?`clip-path="url(#${uid}-glasses)"`:''):'',accPlaced=accessoryFit?.mirror?`<g transform="translate(1024 0) scale(-1 1)">${accRaw}</g>`:accRaw,accessoryArt=accessoryFit?.shoulderClip?`<g mask="url(#${uid}-shoulder)">${accPlaced}</g>`:accPlaced;
 const lowFit=shoeFitFor(outfit.shoes,avatarLayers[outfit.shoes]);
 const trouserLegs=bottomFitted.sourceId ? `<use href="#${bottomFitted.sourceId}"/>` : bottomSource;
 const lowShoe=lowFit?shoeDepthSvg(avatarLayers[outfit.shoes],lowFit,uid,`<image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/><g filter="url(#${uid}-skin)" clip-path="url(#${uid}-shoe-skin)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g><g ${legClip}>${trouserLegs}</g>`,ankleSkinBoundary):{defs:'',underlay:'',attribute:''};
 const hairLayer = avatarLayers[outfit.hair];
 const strands = seatedHairParts(outfit.hair,outfit.hat,hairLayer)
  .map(([source,target]) => texture(hairLayer.atlas,source,target)).join('');
 const rearWaves = outfit.hair==='hair-lilac';
 const faceForHair = rearWaves ? `<clipPath id="${uid}-rear-waves"><path d="${lilacRearWaves}"/></clipPath><mask id="${uid}-jaw" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-rear-waves)" filter="url(#${uid}-black-neck)">${texture('faces',avatarFaceSources[face],[432,39,159,244])}</g></mask>` : '';
 const hairPaint = rearWaves ? `<g mask="url(#${uid}-jaw)">${strands}</g>` : strands;
 const bibDefs = outfit.bottom==='bottom-overall' ? Object.entries(bibEdges).map(([key,path])=>`<clipPath id="${uid}-bib-${key}"><path d="${path}"/></clipPath>`).join('')+`<clipPath id="${uid}-inside-coat"><path d="${bibInsideCoat}"/></clipPath>` : '';
 const shoe=avatarLayers[outfit.shoes];
 const edgeDef=(shoe.segments||[]).map((_,i)=>{
  const outline=shoeSegmentOutline(outfit.shoes,shoe,i);
  return outline ? `<clipPath id="${uid}-shoe-edge-${i}"><path d="${outline}"/></clipPath>` : '';
 }).join('');
 const hatLayer = avatarLayers[outfit.hat];
 const brim = hatLayer && hatLining(outfit.hat,hatLayer);
 const brimDefs = brim ? `<clipPath id="${uid}-lining-edge"><path d="${brim}"/></clipPath><mask id="${uid}-hat-depth" maskUnits="userSpaceOnUse" x="160" y="-100" width="700" height="1640"><rect x="160" y="-100" width="700" height="1640" fill="white"/><g clip-path="url(#${uid}-lining-edge)" filter="url(#${uid}-black-neck)">${hairPaint}</g></mask>` : '';
 const hatPaint = hatLayer ? group(outfit.hat,texture(hatLayer.atlas,hatLayer.source,fittedHatTarget(outfit.hat,hatLayer)),brim ? `mask="url(#${uid}-hat-depth)"` : '') : '';
 const label='내 캐릭터 · '+Object.values(outfit).map(id=>itemById(id)?.name).filter(Boolean).join(', ');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="avatar-sprite avatar-raster" data-avatar-style="raster-b-v1" data-pose="idle" data-framing="${esc(framing)}" data-skin="${skin}" data-face="${face}" viewBox="${viewBox}" ${options.decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`}><defs>${bibDefs}${edgeDef}${faceForHair}${brimDefs}${filter}<filter id="${uid}-fabric-alpha" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.0408163265" intercept="-0.0204081633"/></feComponentTransfer></filter><filter id="${uid}-fabric-composite" filterUnits="userSpaceOnUse" x="160" y="-100" width="700" height="1640" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="table" tableValues="0 .05 .1 .15 .2 .25 .3 .35 .4 .45 .5 .65 .85 1 1 1 1 1 1 1 1"/></feComponentTransfer></filter>${fitted.defs}${bottomFitted.defs}${lowShoe.defs}${(accessoryFit?.shoulderClip || bibOnTop)?`<filter id="${uid}-white-alpha" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.01 0"/></filter><clipPath id="${uid}-shoulder-upper"><rect width="1024" height="383"/></clipPath><mask id="${uid}-shoulder" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect y="383" width="1024" height="1153" fill="white"/><g filter="url(#${uid}-white-alpha)" clip-path="url(#${uid}-shoulder-upper)">${fitted.shoulderArt}</g></mask>`:''}${shoeFit.boot?`<clipPath id="${uid}-boot-mouth"><path d="${bootInsertion(outfit.shoes,avatarLayers[outfit.shoes].openings)}"/></clipPath><mask id="${uid}-boot-depth" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-boot-mouth)" filter="url(#${uid}-black-neck)"><g clip-path="url(#${uid}-body)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g><g ${legClip}>${bottomFitted.art}</g></g></mask>`:''}<linearGradient id="${uid}-neck-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="242" y2="252"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><mask id="${uid}-neck-blend" maskUnits="userSpaceOnUse" x="430" y="240" width="170" height="75"><rect x="430" y="240" width="170" height="75" fill="url(#${uid}-neck-fade)"/></mask><clipPath id="${uid}-extended-neck"><path d="M430 240H600V315H430Z"/></clipPath><filter id="${uid}-black-neck" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.01 0"/></filter><clipPath id="${uid}-neck-opening"><path d="${avatarNeckOpening(avatarLayers[outfit.top].neckline)}"/></clipPath><mask id="${uid}-neck-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-head)"><g clip-path="url(#${uid}-neck-opening)" filter="url(#${uid}-black-neck)">${neckTexture}</g></g>${avatarLayers[outfit.top].cuffs?`<g filter="url(#${uid}-black-neck)" clip-path="url(#${uid}-cuff-opening)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g>`:''}</mask><clipPath id="${uid}-cuff-opening">${(avatarLayers[outfit.top].cuffs?.openings||[]).map(([cx,cy,rx,ry,angle])=>`<path d="M${-rx} 0Q0 ${2*ry} ${rx} 0V36H${-rx}Z" transform="translate(${cx} ${cy}) rotate(${angle})"/>`).join('')}</clipPath><clipPath id="${uid}-boot-tuck"><rect width="1024" height="1240"/><path d="M270 1235H415L365 1294 358 1350V1410H302V1320L300 1294ZM530 1235H720L624 1302V1410H566V1302Z"/></clipPath><clipPath id="${uid}-lining">${coatLining}</clipPath><clipPath id="${uid}-body">${bodyClip}</clipPath><clipPath id="${uid}-skin-body">${skinClip}</clipPath><clipPath id="${uid}-tights">${clothesBody}</clipPath><clipPath id="${uid}-glasses"><ellipse cx="501" cy="146.5" rx="25.5" ry="21" transform="rotate(57 501 146.5)"/><ellipse cx="563" cy="155" rx="26" ry="24" transform="rotate(70 563 155)"/><rect x="521" y="137" width="30" height="40"/><path d="M469 126H489V155H469ZM578 137H596V167H578Z"/></clipPath><clipPath id="${uid}-head"><path d="${avatarNeckSkin}"/></clipPath><clipPath id="${uid}-tucked"><rect width="1024" height="540"/><path d="M430 530H740L705 600 690 620 660 660 650 850H450L435 650 420 600Z"/><path d="M0 530H415L400 560 385 580 370 600 355 620 345 640 335 660 330 680 310 700 305 750V850H0ZM685 530H1024V850H745V720L737 700 715 680 708 660 692 640 685 620Z"/></clipPath></defs><g data-layer="base" clip-path="url(#${uid}-body)"><g clip-path="url(#${uid}-tights)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g><g filter="url(#${uid}-skin)" clip-path="url(#${uid}-skin-body)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g></g><g data-layer="face" filter="url(#${uid}-skin)" clip-path="url(#${uid}-head)">${neckTexture}</g>${topFit.lining?`<g clip-path="url(#${uid}-lining)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g>`:''}${lower}${topArt}${bibOnTop?bottomLayer(legClip):''}${lowShoe.underlay}${itemLayer(outfit.shoes,lowFit?lowShoe.attribute:shoeFit.boot?`mask="url(#${uid}-boot-depth)"`:'')}${accessoryFit?.behindHair?accessoryArt:''}${group(outfit.hair,hairPaint)}${hatPaint}${accessoryFit?.behindHair?'':accessoryArt}</svg>`;
}
