import {itemById,skins,starterOutfit} from './avatar-data.mjs';
import {avatarRig,avatarLayerOrder,avatarFraming,avatarCoverage} from './avatar-rig.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ink='#453849';
const tone=(hex,amount)=>{const n=parseInt(hex.slice(1),16),target=amount>0?255:0,a=Math.abs(amount);return '#'+[n>>16,n>>8&255,n&255].map(c=>Math.round(c+(target-c)*a).toString(16).padStart(2,'0')).join('');};
const p=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const shape=(d,fill,extra='')=>p(d,fill,`stroke="${ink}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" ${extra}`);
const line=(d,color=ink,width=1.5)=>p(d,'none',`stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`);
const ellipse=(cx,cy,rx,ry,fill,extra='')=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const star=(x,y,r,color)=>p(`M${x} ${y-r}l${r*.28} ${r*.66} ${r*.7} ${r*.34}-${r*.7} ${r*.28}-${r*.28} ${r*.72}-${r*.3}-${r*.72}-${r*.7}-${r*.28} ${r*.7}-${r*.34}Z`,color);
const group=(name,art,extra='')=>`<g data-layer="${name}" ${extra}>${art}</g>`;
function hairParts(item){
 const c=item?.color||'#664b45',dark=tone(c,-.2),light=tone(c,.24);let back='',front='';
 if(item?.style==='bob'){
  back=shape('M118 57Q106 77 111 115L105 129Q124 137 139 125L170 127Q190 126 193 112L186 66Z',dark)+p('M116 80Q108 104 116 122L126 125 121 84Z',c)+p('M178 80L183 123Q192 118 186 90Z',c);
  front=shape('M115 86Q101 52 121 38Q144 21 168 37Q191 46 188 77L181 100 175 92 178 65Q163 66 153 49Q143 69 120 75L124 98 116 108Z',c)+p('M116 58Q125 36 144 37Q139 52 120 66Z',light)+p('M157 39Q177 38 183 56L179 68Q173 51 157 39Z',light)+line('M149 45Q141 66 121 72M158 48Q166 63 178 64',dark,1.4);
 }else if(item?.style==='wave'){
  back=shape('M116 63Q100 80 112 101Q94 116 105 135Q96 155 114 165Q106 184 124 191L135 178 174 184Q195 185 190 166Q209 153 196 135Q208 119 192 103L186 65Z',dark)+p('M117 79Q107 107 118 119Q103 139 119 151Q109 167 126 179L132 164 126 126Z',c)+p('M178 79Q195 95 183 111Q204 131 184 143Q198 159 184 175L175 160Z',c)+line('M115 122Q129 132 119 146M184 117Q173 135 185 146',light,3);
  front=shape('M112 91Q99 74 111 51Q119 29 146 30Q177 25 191 53Q199 74 181 96L176 85Q189 65 171 52Q162 78 135 82L123 96 120 77Z',c)+p('M115 57Q127 34 149 35Q145 54 121 68Z',light)+p('M160 35Q181 35 187 55L181 60Q176 45 160 35Z',light)+line('M165 46Q155 70 133 77M125 46Q117 56 117 67',dark);
 }else if(item?.style==='ponytail'){
  back=`<g class="avatar-hair-tail">${shape('M176 56Q205 44 210 73Q220 101 203 123Q197 143 208 156Q185 151 185 129Q170 117 187 93Q193 72 176 70Z',dark)}${p('M191 60Q207 59 205 80Q211 98 196 117Q188 133 199 146Q183 127 197 104Q202 86 191 60Z',c)}${line('M197 71Q210 92 193 115',light,3)}</g>`;
  front=shape('M114 91Q104 72 116 47Q130 26 155 33Q183 30 188 58L180 92 174 87 178 62Q156 62 145 46Q139 66 121 73L123 96Z',c)+p('M120 54Q130 36 148 37Q144 50 125 62Z',light)+p('M157 38Q178 35 181 56L173 53Z',light)+shape('M177 57Q190 49 191 63L183 74Z','#b68aaf');
 }else{
  back=shape('M117 58Q105 82 118 107L127 104 176 108Q193 90 185 62Z',dark);
  front=shape('M116 96L111 80Q105 64 116 48L111 45Q127 29 147 34Q159 26 175 38Q191 43 188 65L193 70 182 94 176 88 177 65Q165 70 153 49Q148 71 129 69L123 84 122 100Z',c)+p('M119 51Q130 37 146 38L137 53 120 64Z',light)+p('M158 38Q180 39 181 56L173 59Z',light)+line('M153 43Q158 59 172 63M132 45L123 60',dark);
 }
 return {back,front};
}
function lowerClothes(item){const c=item?.color||'#7c94ad',d=tone(c,-.18),h=tone(c,.18);
 const pants=shape('M122 231Q148 239 177 230L184 260 167 345 173 437 166 478 153 479 154 437 146 355 139 292 134 350 144 438 141 476 126 477 122 437 118 348 113 265Z',c)+p('M147 256L153 281 157 343 164 431 159 471 153 476 154 437 146 355 139 292Z',d)+p('M121 260L128 257 127 343 135 428 131 457 126 432 122 345Z',h)+line('M121 251Q126 267 137 267M159 267Q172 267 177 250M145 247L146 269M126 350L133 348M158 349L166 347',d)+shape('M120 235Q147 242 179 235L180 247Q147 253 118 246Z',d);
 if(item?.style==='pants'||item?.style==='overall')return pants;
 if(item?.style==='shorts')return shape('M122 232Q149 240 176 232L182 282 152 286 145 266 140 286 112 281Z',c)+p('M145 247L152 266 156 283 178 280 177 286 152 290 145 270 140 289 113 285 112 278 137 282Z',d)+p('M119 245Q127 253 138 249L138 257Q124 264 118 254Z',h)+line('M145 244L145 264M157 246L173 244M121 239L173 239',d);
 return shape('M124 231Q150 239 175 231L190 291Q151 308 107 290Z',c)+p('M143 240L138 294 151 297 155 241Z',d)+p('M171 238L176 294 185 290Z',d)+p('M125 243L117 286 129 291 135 242Z',h)+line('M116 263Q150 274 182 261M110 280Q151 295 187 279M132 241L124 292M165 240L168 296','#ebc9ca',2)+line('M122 236Q150 243 177 236',d,3);
}
function shoeArt(item){const c=item?.color||'#ded9ce',d=tone(c,-.23),h=tone(c,.22),boot=['boots','star'].includes(item?.style);
 let art='';for(const [x,mirror]of [[134,false],[166,true]]){
  if(boot){art+=shape(`M${x-8} 437Q${x} 442 ${x+9} 437L${x+9} 479Q${x+10} 487 ${x+17} 493Q${x+22} 502 ${x+14} 505H${x-11}Q${x-16} 500 ${x-12} 490Z`,c)+p(`M${x+3} 443L${x+8} 442 ${x+7} 481 ${x+15} 494 ${x+9} 498 ${x+1} 484Z`,d)+shape(`M${x-13} 499Q${x+4} 502 ${x+18} 498L${x+18} 505Q${x+2} 510 ${x-13} 505Z`,'#4c3e51')+line(`M${x-9} 450L${x+8} 452M${x-10} 477L${x+8} 478`,h,3)+shape(`M${x-6} 449h8v7h-8Z`,'none');if(item.style==='star')art+=star(x,464,7,'#f8df9e');
  }else{art+=shape(`M${x-8} 476Q${x} 481 ${x+8} 477L${x+10} 488 ${x+19} 494Q${x+25} 503 ${x+15} 506H${x-11}Q${x-16} 501 ${x-13} 493Z`,c)+p(`M${x+3} 481L${x+9} 482 ${x+11} 492 ${x+18} 497 ${x+11} 500 ${x+2} 490Z`,d)+shape(`M${x-13} 500Q${x+6} 502 ${x+21} 499L${x+20} 505Q${x+7} 511 ${x-13} 506Z`,'#f3e9d4')+line(`M${x-4} 484L${x+5} 485M${x-4} 489L${x+7} 490`,'#fff4df',2);if(item?.style==='sneakers')art+=line(`M${x-8} 493L${x+1} 493 ${x+5} 498`,'#f3e9d4',3);}
 }return art;
}
function topArt(item){const c=item?.color||'#f2e8ca',d=tone(c,-.16),h=tone(c,.17);let art='';
 const body='M113 147L135 136Q149 144 165 136L184 147 179 189Q176 213 181 241Q151 252 120 241L126 195Z';
 if(item?.style==='coat')return shape('M115 146L135 134 151 146 166 135 185 146 180 195 191 287 164 296 151 243 138 295 110 286 123 197Z',c)+shape('M135 141L165 141 173 226 129 226Z','#f4e6d5')+p('M116 150L127 153 131 194 121 279 112 283 126 197Z',h)+p('M175 151L183 151 177 197 187 280 177 288 165 238Z',d)+shape('M132 138L151 147 142 171 128 153Z','#d7bfce')+shape('M168 138L151 147 158 171 177 153Z','#d7bfce')+line('M143 172L138 217M159 174L164 220',d)+line('M128 235L139 237M166 237L178 233','#e6cda3',2)+ellipse(155,191,2.6,2.6,'#e7c175')+ellipse(156,211,2.6,2.6,'#e7c175');
 art=shape(body,c)+p('M172 151L182 151 176 190 175 224 180 238 168 242 163 212Z',d)+p('M118 156L127 156 135 178 128 212 124 231 121 239 127 191Z',h);
 if(item?.style==='hoodie')art+=shape('M126 143Q123 125 139 125L163 126Q177 129 177 144L165 157 136 157Z',d)+shape('M134 139Q147 148 167 137L160 150 140 150Z',h)+shape('M136 201L163 201 168 216Q151 226 131 216Z',d)+line('M140 151L138 177M160 151L162 176','#f6e9ce',2.5)+p('M121 232Q153 243 180 231L180 241Q153 252 120 242Z',d);
 else if(item?.style==='knit')art+=shape('M135 135Q150 141 166 134L169 144Q151 151 132 144Z',d)+line('M133 161L140 168 147 162 154 169 161 162 168 168','#f5d5bd',2.4)+line('M135 181L141 186 148 181 155 187 162 181','#f4c8b1',1.8)+p('M120 231Q151 241 179 232L181 241Q150 253 120 242Z',d)+line('M134 137L134 143M140 139V145M147 140V146M155 139V146M162 137V144',h);
 else art+=shape('M135 138Q150 146 166 137L166 145Q149 153 133 145Z',d)+p('M122 164Q150 176 181 162L180 170Q152 184 123 172Z','#9caaa1')+p('M125 193Q151 204 177 193L177 201Q151 212 123 201Z','#9caaa1')+p('M121 224Q152 235 178 224L179 231Q151 243 121 232Z','#9caaa1');
 return art;
}
function arms(top,skin){const c=top?.color||'#f2e8ca',d=tone(c,-.18),skinD=tone(skin,-.16),long=top?.style!=='stripe';
 const leftUpper=shape('M112 148Q101 144 97 160L88 208 103 215 121 171Z',skin)+p('M94 181L91 207 98 211 107 179Z',skinD);
 const rightUpper=shape('M183 149Q195 144 201 161L213 210 198 217 180 173Z',skin)+p('M198 174L207 208 211 208 201 173Z',skinD);
 const leftSleeve=shape(long?'M113 145Q99 141 94 162L88 207Q96 216 108 213L122 170Z':'M113 145Q99 140 94 162L92 179Q103 187 115 182L122 170Z',c)+p(long?'M103 155L98 199 89 206 97 211 109 175Z':'M96 163L94 176 102 181 108 165Z',d);
 const rightSleeve=shape(long?'M182 146Q196 141 203 162L214 209Q207 218 195 213L179 171Z':'M182 146Q196 141 203 161L208 179Q198 188 186 182L179 171Z',c)+p(long?'M198 162L210 207 205 213 194 183Z':'M200 164L205 177 200 182 194 166Z',d);
 const leftFore=shape('M90 204Q101 203 105 212L94 267Q89 275 81 268L82 251Z',skin)+p('M96 214L87 262 90 268 95 257 104 216Z',skinD);
 const rightFore=shape('M198 209Q206 202 214 211L225 263Q222 274 213 270L204 248Z',skin)+p('M211 216L223 260 218 269 214 245Z',skinD);
 const leftCuff=long?shape('M89 208Q98 216 107 211L99 255Q91 261 82 254Z',c)+p('M99 220L96 249 99 254 105 216Z',d)+shape('M82 250Q91 256 100 251L99 263Q90 269 80 260Z',d):'';
 const rightCuff=long?shape('M197 211Q207 216 214 208L224 252Q215 262 206 256Z',c)+p('M208 217L218 249 223 251 214 215Z',d)+shape('M206 252Q215 259 224 250L227 261Q217 270 208 263Z',d):'';
 const leftHand=shape('M82 263L94 267 94 277Q99 287 95 289L90 282 88 295Q86 301 83 297L82 289Q82 301 79 298L77 287Q77 298 74 294L74 280 77 272Z',skin)+line('M80 275L84 280M84 284L84 291',skinD);
 const rightHand=shape('M211 266L224 262 229 275 230 288Q228 294 225 285L225 297Q222 302 220 294L218 286 219 299Q216 304 213 295L210 281 205 288Q201 287 205 279Z',skin)+line('M218 278L222 274M215 285L216 294',skinD);
 const left=`<g class="avatar-rig-arm-left" data-rig="left-shoulder">${long?'':leftUpper}${leftSleeve}<g class="avatar-rig-forearm-left" data-rig="left-elbow">${long?ellipse(99,210,9,9,c):leftFore}${leftCuff}${leftHand}</g></g>`;
 const right=`<g class="avatar-rig-arm-right" data-rig="right-shoulder">${long?'':rightUpper}${rightSleeve}<g class="avatar-rig-forearm-right" data-rig="right-elbow">${long?ellipse(202,211,9,9,c):rightFore}${rightCuff}${rightHand}</g></g>`;
 return {left,right};
}
function faceArt(skin,face){const sd=tone(skin,-.17),sl=tone(skin,.15);
 const silhouette=shape('M120 63Q119 43 147 42Q178 42 181 67L178 93Q173 111 152 122Q133 118 122 103L117 84Z',skin)+p('M171 53Q182 67 175 94L165 112 151 120 158 108 167 94Z',sd)+p('M124 69Q126 53 143 50L138 72Z',sl)+shape('M117 81Q109 76 111 88Q112 99 121 98Z',skin)+line('M114 84L117 91',sd)+shape('M181 81Q189 78 187 88Q186 97 178 98Z',skin);
 let eyes='';
 if(face==='calm')eyes=line('M126 86Q133 91 140 86M158 87Q165 92 173 86',ink,2)+line('M126 86L124 84M172 86L175 84',ink,1.5);
 else{
 eyes=shape('M125 82Q132 77 141 83L138 91Q131 95 125 88Z','#fff8ef')+shape('M157 83Q165 77 174 82L173 89Q164 95 159 91Z','#fff8ef')+ellipse(134,86,4.2,6.2,'#96745f')+ellipse(166,86,4.5,6.1,'#96745f')+ellipse(134,87,2.1,4.4,ink)+ellipse(166,87,2.2,4.3,ink)+ellipse(135,83.5,1.6,2,'#fffdf3')+ellipse(167,83,1.7,2,'#fffdf3')+line('M124 81Q132 77 142 82M156 82Q165 76 175 81',ink,2.2)+line('M125 82L122 79M173 81L176 78',ink,1.5);
 if(face==='sparkle')eyes+=star(132,89,2.8,'#ffe4a5')+star(164,89,2.8,'#ffe4a5');
 }
 return silhouette+line('M127 73Q133 70 139 74M159 74Q165 70 171 72',ink,1.4)+`<g class="avatar-eyes-open" data-rig="eyes">${eyes}</g><g class="avatar-eyes-closed">${line('M125 86Q133 92 141 86M157 86Q165 92 174 86',ink,2)}</g>`+p('M149 89L146 98 151 99',sd)+ellipse(127,98,5.5,2.4,'#d78e83','opacity=".32"')+ellipse(171,98,5.5,2.4,'#d78e83','opacity=".32"')+(face==='calm'?line('M146 108Q150 110 155 107','#a36868',1.5):shape('M145 106Q152 110 159 105Q155 115 150 113Z','#ad6b72','stroke-width="1"'));
}
function hatArt(item){if(!item)return '';const c=item.color,d=tone(c,-.2),h=tone(c,.2);
 if(item.style==='beret')return shape('M110 49Q106 29 135 23Q165 16 184 34Q192 47 176 52L120 59Z',c)+p('M113 43Q144 50 182 36Q187 49 173 52L119 57Z',d)+shape('M118 51Q150 53 178 45L178 55Q145 63 118 60Z',d)+shape('M149 24Q147 12 154 13L157 24Z',d)+p('M119 34Q134 23 149 25L138 35Z',h);
 if(item.style==='sprout')return shape('M108 72Q103 37 131 26Q166 19 188 44L188 80 180 81 177 55Q152 44 121 58L118 81Z',c)+p('M110 56Q113 36 134 31L126 45Z',h)+p('M179 44L183 72 188 75 187 45Z',d)+shape('M148 28Q146 13 153 5Q159 16 153 28Z','#698f68')+shape('M148 24Q128 26 128 14Q143 10 151 22Z','#87a477')+line('M111 71Q104 106 117 116M185 73Q193 105 181 117',d,3);
 return shape('M104 55Q117 49 125 31L142 4 156 14 171 42Q179 54 196 57Q182 70 109 66Z',c)+p('M142 7L146 27 164 52 181 59 188 57 169 43 156 15Z',d)+shape('M119 47Q151 57 179 49L184 59Q154 69 113 59Z','#c8a66e')+star(150,32,8,'#f8dda0')+line('M127 33L138 14',h,2);
}
function accessories(item){if(!item)return {body:'',head:'',friend:''};const c=item.color,d=tone(c,-.2);
 if(item.style==='glasses')return {body:'',friend:'',head:`<g fill="none" stroke="${c}" stroke-width="1.9"><ellipse cx="134" cy="87" rx="12" ry="11"/><ellipse cx="166" cy="87" rx="12" ry="11"/><path d="M146 85Q150 82 154 85M122 83L116 80M178 82L182 79"/></g>`};
 if(item.style==='bird')return {body:'',head:'',friend:`<g class="avatar-friend">${shape('M69 144Q56 140 63 122Q70 109 83 117Q95 114 99 128Q103 141 91 147Q82 151 69 144Z',c)}${p('M63 132Q74 126 82 139Q77 148 66 142Z',d)}${ellipse(90,125,2.2,2.7,ink)}${ellipse(91,124, .8,1,'#fff')}${shape('M98 127L108 132 98 134Z','#c18a58')}${line('M75 146L74 151M86 146L86 151',ink,1.6)}</g>`};
 return {head:'',friend:'',body:shape('M123 145Q153 174 194 231L189 239Q148 178 118 150Z','#a9785b')+shape('M180 226Q199 218 217 231L213 277Q190 291 174 277Z',c)+p('M204 233L214 232 210 276 201 281Z',d)+shape('M179 228Q194 223 217 230L215 245Q193 252 177 243Z',tone(c,.13))+star(195,258,8,'#f6d698')+line('M180 270Q195 279 209 270',d)};
}
export function avatarArt(value,{outfit=value?.equipped||starterOutfit,decorative=false,pose='idle',framing='full',focusSlot=null}={}){
 const skin=skins.find(s=>s.id===value?.skin)?.color||skins[0].color,face=value?.face||'smile',get=slot=>itemById(outfit[slot]),hair=get('hair'),hat=get('hat'),top=get('top'),bottom=get('bottom'),shoes=get('shoes'),acc=get('accessory'),hp=hairParts(hair),arm=arms(top,skin),accessory=accessories(acc),coverage=avatarCoverage(top?.style);
 const legsColor=['shorts','skirt'].includes(bottom?.style)?'#554b61':skin;
 const legs=shape('M121 245Q139 243 146 260L139 345 146 431 140 481 126 482 121 432 116 348 113 266Z',legsColor)+p('M136 264L132 344 140 433 134 478 140 478 146 431 139 345 146 264Z',tone(legsColor,-.13))+shape('M153 256Q165 243 181 252L174 341 169 420 174 480 158 481 153 425 155 343 145 275Z',legsColor)+p('M170 267L164 342 163 422 169 479 174 478 169 420 174 341 181 260Z',tone(legsColor,-.13));
 const torso=shape('M134 133L136 114 163 114 167 135 183 148 173 201 179 237Q150 252 120 237L128 196 115 149Z',skin)+p('M154 116L160 116 161 135 168 140 158 146 148 137Z',tone(skin,-.17));
 let overall='';if(bottom?.style==='overall'&&coverage.showOverallBib){const c=bottom.color;overall=shape('M123 145L131 145 137 200 163 200 170 145 177 145 171 217 176 245Q150 256 123 245L126 214Z',c)+shape('M135 212H164V231Q150 238 136 232Z',tone(c,-.12))+ellipse(134,204,2.5,2.5,'#9c8050')+ellipse(166,204,2.5,2.5,'#9c8050')+line('M128 151L135 193M172 151L166 193',tone(c,.2),2);}
 const neck=shape('M136 114L163 113 165 136Q151 149 133 136Z',skin)+p('M137 115Q149 126 163 115L163 128Q150 135 136 125Z',tone(skin,-.17));
 const head=`<g class="avatar-rig-head" data-rig="head">${group('face',faceArt(skin,face))}${group('hair-front',hp.front)}${group('hat',hatArt(hat))}${group('glasses',accessory.head)}</g>`;
 const poseName=avatarRig.poses.includes(pose)?pose:'idle';const anchorStyle=Object.entries(avatarRig.anchors).map(([key,[x,y]])=>{const name=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());return `--rig-${name}-x:${x}px;--rig-${name}-y:${y}px`;}).join(';');
 const label='나의 2D 캐릭터 · '+Object.values(outfit).filter(Boolean).map(id=>itemById(id)?.name).filter(Boolean).join(', ');
 const box=framing==='slot'?avatarFraming(focusSlot,get(focusSlot)?.style):framing==='portrait'?avatarFraming('portrait'):avatarRig.viewBox;
 const layers={
 'rear-cloth':'',legs:['shorts','skirt'].includes(bottom?.style)?legs:'', 'lower-garment':lowerClothes(bottom),shoes:shoeArt(shoes),
 'hair-back':`<g class="avatar-rig-head">${hp.back}</g>`,'left-arm':arm.left,'right-arm':arm.right,torso,top:topArt(top),overalls:overall,neck,head,hat:'',accessory:accessory.body+accessory.friend};
 const lower=['rear-cloth','legs','lower-garment','shoes'].map(name=>group(name,layers[name])).join('');
 const upper=avatarLayerOrder.filter(name=>!['rear-cloth','legs','lower-garment','shoes','hat'].includes(name)).map(name=>group(name,layers[name])).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" data-avatar-style="${avatarRig.version}" style="${anchorStyle}" data-pose="${poseName}" data-framing="${framing==='full'?'full':framing==='slot'?'slot':'portrait'}" ${decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`} class="avatar-sprite avatar-cel avatar-pose-${poseName}">${ellipse(151,516,46,6,'#7e658d','opacity=".14"')}<g class="avatar-sprite-body">${lower}<g class="avatar-rig-upper" data-rig="upper">${upper}</g></g></svg>`;
}
