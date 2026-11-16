import {itemById,starterOutfit,skins,faces} from './avatar-data.mjs';
import {avatarAssetsRoot,avatarAtlases,avatarLayers,avatarFaceSources} from './avatar-layers.mjs';
import {avatarProfiles} from './avatar-profiles.mjs';
import {avatarFraming} from './avatar-rig.mjs';
import {avatarNeckOpening,avatarNeckSkin,fittedAvatarTop} from './avatar-neckline.mjs';
let serial=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const texture=(atlas,source,target)=>`<svg x="${target[0]}" y="${target[1]}" width="${target[2]}" height="${target[3]}" viewBox="${source.join(' ')}" preserveAspectRatio="none" overflow="hidden"><image href="${avatarAssetsRoot+atlas}.png" width="${avatarAtlases[atlas].width}" height="${avatarAtlases[atlas].height}"/></svg>`;
const group=(id,art,extra='')=>`<g data-item="${id}" data-layer="${itemById(id).slot}" ${extra}>${art}</g>`;
function itemLayer(id,extra=''){
 const a=avatarLayers[id];if(!a)return '';const profile=avatarProfiles[a.profile];
 if(profile.kind==='segments')return group(id,a.segments.map(segment=>texture(a.atlas,segment.source,segment.target)).join(''),extra);
 if(profile.kind==='waist'){
  const [sx,sy,sw,sh]=a.source,[x,y,w,h]=a.target,join=profile.waistJoin,cut=sh*(join-y)/h,lift=profile.waistLift;
  return group(id,texture(a.atlas,[sx,sy,sw,cut],[x,y-lift,w,join-y+lift+.5])+texture(a.atlas,[sx,sy+cut,sw,sh-cut],[x,join,w,y+h-join]),extra);
 }
 return group(id,texture(a.atlas,a.source,a.target),extra);
}
// Masks follow exposed anatomy. No broad rectangles through the torso/hips.
const bareArms='<path d="M335 350H432L415 450 350 570 297 710 295 820H205V700L280 500ZM610 360H680L815 700V820H725L690 620 620 470Z"/>';

const hands='<rect x="190" y="650" width="140" height="180"/><rect x="710" y="650" width="120" height="180"/>';
// Follow the actual coat opening; the armpit cut-outs must stay empty.
const coatLining='<path d="M450 280H540L588 300 650 410 647 500 647 740H518L500 620 515 500 520 400 450 280Z"/>';
export function avatarArt(value={},options={}){
 const outfit={...starterOutfit};for(const slot of Object.keys(outfit)){const id=(options.outfit||value.equipped||starterOutfit)[slot];if(itemById(id)?.slot===slot)outfit[slot]=id;else if(['hat','accessory'].includes(slot))outfit[slot]=null;}
 const skin=skins.some(s=>s.id===value.skin)?value.skin:'peach',face=faces.some(f=>f.id===value.face)?value.face:'smile',uid='avatar-art-'+(++serial),top=itemById(outfit.top),bottom=itemById(outfit.bottom),framing=options.framing||'full';
 const viewBox=framing==='slot'?avatarFraming(options.focusSlot,avatarProfiles[avatarLayers[outfit[options.focusSlot]]?.profile]?.framing||itemById(outfit[options.focusSlot])?.style):framing==='portrait'?avatarFraming('portrait'):'160 -100 700 1640';
 const tone={peach:[1,1,1],honey:[.87,.73,.62],cocoa:[.64,.49,.43],rose:[1,.99,1.04]}[skin];
 const filter=`<filter id="${uid}-skin" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${tone[0]}"/><feFuncG type="linear" slope="${tone[1]}"/><feFuncB type="linear" slope="${tone[2]}"/></feComponentTransfer></filter>`;
 const neckTexture=`${texture('faces',avatarFaceSources[face],[432,39,159,244])}<g mask="url(#${uid}-neck-blend)" clip-path="url(#${uid}-extended-neck)"><g transform="translate(0 -36.75) scale(1 1.15)">${texture('faces',avatarFaceSources[face],[432,39,159,244])}</g></g>`;
 const topFit=avatarProfiles[avatarLayers[outfit.top].profile],bottomFit=avatarProfiles[avatarLayers[outfit.bottom].profile],shoeFit=avatarProfiles[avatarLayers[outfit.shoes].profile],accessoryFit=outfit.accessory?avatarProfiles[avatarLayers[outfit.accessory].profile]:null;
 const longBottom=!!bottomFit.longLegs,legStart=bottomFit.legStart;
 const bodyClip=(topFit.bareArms?bareArms:hands)+(topFit.lining?coatLining:'')+(!longBottom?`<rect x="0" y="${legStart}" width="1024" height="${1390-legStart}"/>`:'')+'<rect x="280" y="1340" width="100" height="50"/><rect x="550" y="1340" width="100" height="50"/>';
 const legClip=longBottom&&shoeFit.boot?`clip-path="url(#${uid}-boot-tuck)"`:'';
 const bibOnTop=!!bottomFit.overTop&&!topFit.outer;
 // Overalls are one continuous foreground garment, never a separately cropped bib.
 const lower=bibOnTop?'':itemLayer(outfit.bottom,legClip);
 const fitted=fittedAvatarTop(avatarLayers[outfit.top],uid,texture);
 const topArt=group(outfit.top,`<g mask="url(#${uid}-neck-mask)">${fitted.art}</g>`,bibOnTop?`clip-path="url(#${uid}-tucked)"`:'');
 const label='내 캐릭터 · '+Object.values(outfit).map(id=>itemById(id)?.name).filter(Boolean).join(', ');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="avatar-sprite avatar-raster" data-avatar-style="raster-b-v1" data-pose="idle" data-framing="${esc(framing)}" data-skin="${skin}" data-face="${face}" viewBox="${viewBox}" ${options.decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`}><defs>${filter}${fitted.defs}<linearGradient id="${uid}-neck-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="242" y2="252"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><mask id="${uid}-neck-blend" maskUnits="userSpaceOnUse" x="430" y="240" width="170" height="75"><rect x="430" y="240" width="170" height="75" fill="url(#${uid}-neck-fade)"/></mask><clipPath id="${uid}-extended-neck"><path d="M430 240H600V315H430Z"/></clipPath><filter id="${uid}-black-neck" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.01 0"/></filter><clipPath id="${uid}-neck-opening"><path d="${avatarNeckOpening(avatarLayers[outfit.top].neckline)}"/></clipPath><mask id="${uid}-neck-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-head)"><g clip-path="url(#${uid}-neck-opening)" filter="url(#${uid}-black-neck)">${neckTexture}</g></g>${avatarLayers[outfit.top].cuffs?`<g filter="url(#${uid}-black-neck)" clip-path="url(#${uid}-cuff-opening)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g>`:''}</mask><clipPath id="${uid}-cuff-opening">${(avatarLayers[outfit.top].cuffs?.openings||[]).map(([cx,cy,rx,ry,angle])=>`<path d="M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0V36H${-rx}Z" transform="translate(${cx} ${cy}) rotate(${angle})"/>`).join('')}</clipPath><clipPath id="${uid}-boot-tuck"><rect width="1024" height="1240"/><path d="M270 1235H415L365 1294 358 1350V1410H302V1320L300 1294ZM530 1235H720L624 1302V1410H566V1302Z"/></clipPath><clipPath id="${uid}-lining">${coatLining}</clipPath><clipPath id="${uid}-body">${bodyClip}</clipPath><clipPath id="${uid}-glasses"><path d="M455 128H530L580 139 598 146V190H455Z"/></clipPath><clipPath id="${uid}-head"><path d="${avatarNeckSkin}"/></clipPath><clipPath id="${uid}-tucked"><rect width="1024" height="540"/><path d="M430 530H740L705 600 690 620 660 660 650 850H450L435 650 420 600Z"/><path d="M0 530H415L400 560 385 580 370 600 355 620 345 640 335 660 330 680 310 700 305 750V850H0ZM685 530H1024V850H745V720L737 700 715 680 708 660 692 640 685 620Z"/></clipPath></defs><g data-layer="base" filter="url(#${uid}-skin)" clip-path="url(#${uid}-body)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g><g data-layer="face" filter="url(#${uid}-skin)" clip-path="url(#${uid}-head)">${neckTexture}</g>${topFit.lining?`<g filter="url(#${uid}-skin)" clip-path="url(#${uid}-lining)"><image href="${avatarAssetsRoot}base.png" width="1024" height="1536"/></g>`:''}${lower}${topArt}${bibOnTop?itemLayer(outfit.bottom,legClip):''}${itemLayer(outfit.shoes)}${accessoryFit?.behindHair?itemLayer(outfit.accessory,accessoryFit.faceClip?`clip-path="url(#${uid}-glasses)"`:''):''}${itemLayer(outfit.hair)}${itemLayer(outfit.hat)}${accessoryFit?.mirror?`<g transform="translate(1024 0) scale(-1 1)">${itemLayer(outfit.accessory)}</g>`:accessoryFit?.behindHair?'':itemLayer(outfit.accessory)}</svg>`;
}
