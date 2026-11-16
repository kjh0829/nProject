import {itemById,starterOutfit,skins,faces} from './avatar-data.mjs';
import {avatarAssetsRoot,avatarAtlasSize,avatarLayers,avatarFaceSources} from './avatar-layers.mjs';
import {avatarFraming,avatarCoverage} from './avatar-rig.mjs';
let serial=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const texture=(atlas,source,target)=>`<svg x="${target[0]}" y="${target[1]}" width="${target[2]}" height="${target[3]}" viewBox="${source.join(' ')}" preserveAspectRatio="none" overflow="hidden"><image href="${avatarAssetsRoot+atlas}.png" width="${avatarAtlasSize}" height="${avatarAtlasSize}"/></svg>`;
const group=(id,art,extra='')=>`<g data-item="${id}" data-layer="${itemById(id).slot}" ${extra}>${art}</g>`;
function itemLayer(id,extra=''){
 const a=avatarLayers[id];if(!a)return '';
 if(id==='acc-glasses'){
  // Keep each lens round; lengthen the bridge to the actual eye spacing.
  const source=[[706,250,164,193],[870,250,40,193],[910,250,274,193]],target=[[469,116,55,63],[524,116,27,63],[551,116,92,63]];
  return group(id,source.map((src,i)=>texture(a.atlas,src,target[i])).join(''),extra);
 }
 if(a.atlas==='shoes'){
  const split={'shoes-canvas':[[51,145,181,362],[242,174,339,293]],'shoes-red':[[676,110,173,409],[875,122,340,357]],'shoes-lilac':[[48,756,190,390],[244,772,339,333]],'shoes-star':[[671,707,180,465],[880,718,327,412]]}[id];
  const boot=['shoes-red','shoes-star'].includes(id),targets=boot?[[278,1294,112,214],[549,1302,166,197]]:[[278,1354,112,154],[549,1365,166,140]];
  return group(id,split.map((src,i)=>texture('shoes',src,targets[i])).join(''),extra);
 }
 // Extend only the waistband behind the shirt. Keep the crotch, hem and ankles fixed.
 if(a.atlas==='bottoms'&&id!=='bottom-overall'){
  const [sx,sy,sw,sh]=a.source,[x,y,w,h]=a.target,join=id==='bottom-denim'?800:760,cut=sh*(join-y)/h,lift=42;
  return group(id,texture(a.atlas,[sx,sy,sw,cut],[x,y-lift,w,join-y+lift+.5])+texture(a.atlas,[sx,sy+cut,sw,sh-cut],[x,join,w,y+h-join]),extra);
 }
 return group(id,texture(a.atlas,a.source,a.target),extra);
}
// Masks follow exposed anatomy. No broad rectangles through the torso/hips.
const bareArms='<path d="M335 350H432L415 450 350 570 297 710 295 820H205V700L280 500ZM610 360H680L815 700V820H725L690 620 620 470Z"/>';
const hands='<path d="M205 815V710L251 674 285 692 300 815ZM725 700L755 681 815 718V820H725Z"/>';
// Follow the actual coat opening; the armpit cut-outs must stay empty.
const coatLining='<path d="M478 225L560 225 580 260 588 300 650 410 647 500 647 740H518L531 700 542 660 551 620 563 580 571 540 577 500 578 460 577 420 574 400 568 380 558 360 544 340 528 320 515 300 499 280 482 246Z"/>';
export function avatarArt(value={},options={}){
 const outfit={...starterOutfit};for(const slot of Object.keys(outfit)){const id=(options.outfit||value.equipped||starterOutfit)[slot];if(itemById(id)?.slot===slot)outfit[slot]=id;else if(['hat','accessory'].includes(slot))outfit[slot]=null;}
 const skin=skins.some(s=>s.id===value.skin)?value.skin:'peach',face=faces.some(f=>f.id===value.face)?value.face:'smile',uid='avatar-art-'+(++serial),top=itemById(outfit.top),bottom=itemById(outfit.bottom),framing=options.framing||'full';
 const viewBox=framing==='slot'?avatarFraming(options.focusSlot,itemById(outfit[options.focusSlot])?.style):framing==='portrait'?avatarFraming('portrait'):'160 -100 700 1640';
 const tone={peach:[1,1,1],honey:[.87,.73,.62],cocoa:[.64,.49,.43],rose:[1,.99,1.04]}[skin];
 const filter=`<filter id="${uid}-skin" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${tone[0]}"/><feFuncG type="linear" slope="${tone[1]}"/><feFuncB type="linear" slope="${tone[2]}"/></feComponentTransfer></filter>`;
 const longBottom=['pants','overall'].includes(bottom.style),legStart=bottom.style==='shorts'?800:875;
 const bodyClip=(top.style==='stripe'?bareArms:hands)+(top.style==='coat'?coatLining:'')+(!longBottom?`<rect x="0" y="${legStart}" width="1024" height="${1390-legStart}"/>`:'')+'<rect x="280" y="1340" width="100" height="50"/><rect x="550" y="1340" width="100" height="50"/>';
 const isOverall=bottom.style==='overall',bibOnTop=isOverall&&avatarCoverage(top.style).showOverallBib;
 // Overalls are one continuous foreground garment, never a separately cropped bib.
 const lower=bibOnTop?'':itemLayer(outfit.bottom);
 const topArt=itemLayer(outfit.top,bibOnTop?`clip-path="url(#${uid}-tucked)"`:'');
 const label='내 캐릭터 · '+Object.values(outfit).map(id=>itemById(id)?.name).filter(Boolean).join(', ');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="avatar-sprite avatar-raster" data-avatar-style="raster-b-v1" data-pose="idle" data-framing="${esc(framing)}" data-skin="${skin}" data-face="${face}" viewBox="${viewBox}" ${options.decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`}><defs>${filter}<clipPath id="${uid}-body">${bodyClip}</clipPath><clipPath id="${uid}-glasses"><path d="M455 128H530L580 139 598 146V190H455Z"/></clipPath><clipPath id="${uid}-head"><rect width="1024" height="283"/></clipPath><clipPath id="${uid}-tucked"><rect width="1024" height="540"/><path d="M430 530H740L705 600 690 620 660 660 650 850H450L435 650 420 600Z"/><path d="M0 530H415L400 560 385 580 370 600 355 620 345 640 335 660 330 680 310 700 305 750V850H0ZM685 530H1024V850H745V720L737 700 715 680 708 660 692 640 685 620Z"/></clipPath></defs><g data-layer="base" filter="url(#${uid}-skin)" clip-path="url(#${uid}-body)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g><g data-layer="face" filter="url(#${uid}-skin)" clip-path="url(#${uid}-head)">${texture('faces',avatarFaceSources[face],[432,39,159,244])}</g>${lower}${itemLayer(outfit.shoes)}${topArt}${bibOnTop?itemLayer(outfit.bottom):''}${outfit.accessory==='acc-glasses'?itemLayer(outfit.accessory,`clip-path="url(#${uid}-glasses)"`):''}${itemLayer(outfit.hair)}${itemLayer(outfit.hat)}${outfit.accessory==='acc-bag'?`<g transform="translate(1024 0) scale(-1 1)">${itemLayer(outfit.accessory)}</g>`:outfit.accessory==='acc-glasses'?'':itemLayer(outfit.accessory)}</svg>`;
}
