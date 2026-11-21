const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}: {})});try{const p=await b.newPage({viewport:{width:1600,height:2400}});await p.goto('http://127.0.0.1:8000/#avatar');await p.waitForSelector('#avatar-stage .avatar-raster');const before=await p.evaluate(()=>localStorage.getItem('teum-avatar-v1'));p.on('console',m=>{if(m.type()==='log'&&m.text().startsWith('Rendered waist frame'))console.log(m.text());});
const results=await p.evaluate(async()=>{
 const {avatarArt}=await import('./avatar-art.mjs'),cache=new Map();
 // Decode the actual SVG composition with inline copies of its local textures.
 // Canvas is read only: sample pixels, never modify or replace the source PNGs.
 async function render(outfit,look={},withoutNeckMask=false,solidTop=false,closedCuff=false,size=1024){
  const doc=new DOMParser().parseFromString(avatarArt({skin:'peach',face:'smile',...look},{outfit}).replace('160 -100 700 1640','0 0 1024 1536'),'image/svg+xml'),svg=doc.documentElement;
  if(closedCuff){const {avatarLayers}=await import('./avatar-layers.mjs');svg.querySelector('clipPath[id$="-cuff-opening"]').innerHTML=avatarLayers[outfit.top].cuffs.openings.map(([cx,cy,rx,ry,angle])=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${angle} ${cx} ${cy})"/>`).join('');}
  if(solidTop){const {avatarLayers}=await import('./avatar-layers.mjs'),[x,y,width,height]=avatarLayers[outfit.top].target,source=svg.querySelector('g[id$="-top-source"]'),rect=doc.createElementNS('http://www.w3.org/2000/svg','rect');for(const [key,value]of Object.entries({x,y,width,height,fill:'#183048',opacity:.992,filter:`url(#${svg.querySelector('filter[id$="-fabric-alpha"]').id})`}))rect.setAttribute(key,value);source.replaceChildren(rect);const top=svg.querySelector(`[data-item="${outfit.top}"]`);for(const child of [...svg.children])if(child.tagName!=='defs'&&child!==top)child.remove();}
  if(withoutNeckMask)for(const node of svg.querySelectorAll('[mask]'))node.removeAttribute('mask');
  svg.setAttribute('width',String(size));svg.setAttribute('height',String(size*1.5));
  for(const node of svg.querySelectorAll('image')){const href=node.getAttribute('href');if(!cache.has(href)){const blob=await(await fetch(href)).blob();cache.set(href,await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);}));}node.setAttribute('href',cache.get(href));}
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size*1.5;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,size,size*1.5).data;return{svg,pixel:(x,y)=>{const i=(Math.round(y*size/1024)*size+Math.round(x*size/1024))*4;return [...data.slice(i,i+4)]}};}finally{URL.revokeObjectURL(url);}
 }
 const basic={hair:'hair-cocoa',hat:null,top:'top-stripe',bottom:'bottom-denim',shoes:'shoes-canvas',accessory:null},checks=[];
 const expect=(ok,message)=>{if(!ok)throw Error(message);};
 for(const top of ['top-stripe','top-mint','top-coral','top-night'])for(const bottom of ['bottom-denim','bottom-lilac','bottom-check','bottom-overall']){
  const {svg,pixel}=await render({...basic,top,bottom});
  for(let x=490;x<=620;x+=10)for(let y=620;y<=710;y+=10)expect(pixel(x,y)[3]>170,`${top}/${bottom}: transparent waist at ${x},${y}`);
  for(const [x,y]of [[311,600],[300,620],[290,640],[279,660],[271,680],[265,700],[255,720],[714,600],[724,640],[737,660],[747,680],[755,700],[767,720]])expect(pixel(x,y)[3]>150,`${top}/${bottom}: broken sleeve/hand at ${x},${y}`);
  if(bottom==='bottom-overall'){expect(svg.querySelectorAll('[data-item="bottom-overall"]').length===1,'Overalls must remain one continuous garment');if(top!=='top-night'){const layers=[...svg.children].map(n=>n.getAttribute('data-item'));expect(layers.indexOf(bottom)>layers.indexOf(top),'Overall waist must cover the tucked shirt hem');}}
  checks.push(top+'/'+bottom);
 }
 const basicRender=await render(basic);
 expect(basicRender.pixel(387,700)[3]<20,'Stray dark body fragment beside left hip');
 const coral=await render({...basic,top:'top-coral'});expect(coral.pixel(430,670)[3]>200,'Gap between knit hem and denim waistband');
 const coat=await render({...basic,top:'top-night'});expect(coat.pixel(485,500)[3]<40,'Undershirt protrudes into coat armpit cut-out');
 for(const hair of ['hair-cocoa','hair-peach','hair-lilac','hair-silver']){const {pixel}=await render({...basic,hair});expect(pixel(520,55)[3]>180,'Uncovered crown: '+hair);if(hair==='hair-lilac'){const [r,,blue]=pixel(445,85);expect(blue>r,'Bald scalp showing beside lilac crown');}}
 for(const face of ['smile','sparkle','calm'])for(const hat of [null,'hat-beret','hat-sprout','hat-wizard']){const {pixel}=await render({...basic,hair:'hair-silver',hat},{face});const [r,,blue,a]=pixel(520,180);expect(a>200&&r>blue+25,`Moon ponytail crosses the cheek/nose: ${face}/${hat}`);}
 for(const shoes of ['shoes-canvas','shoes-red','shoes-lilac','shoes-star']){
  const reference=await render({...basic,shoes,bottom:'bottom-lilac'});
  for(const bottom of ['bottom-denim','bottom-lilac','bottom-check','bottom-overall']){
   const {pixel}=await render({...basic,shoes,bottom});for(const x of [330,595])for(let y=1320;y<=1380;y+=5)expect(pixel(x,y)[3]>150,`Detached ankle: ${bottom}/${shoes} ${x},${y}`);
   if(['shoes-red','shoes-star'].includes(shoes))for(const [x,y]of [[330,1360],[590,1360],[600,1400]]){const expected=reference.pixel(x,y),actual=pixel(x,y);expect(actual.every((v,i)=>Math.abs(v-expected[i])<5),`Trousers cover the boot front: ${bottom}/${shoes} ${x},${y}`);}
  }
 }
 const {avatarItems}=await import('./avatar-data.mjs');
 const neckReference=(await render(basic)).pixel(495,253);let rejected=0;
 for(const top of avatarItems.filter(i=>i.slot==='top')){
  const good=(await render({...basic,top:top.id})).pixel(495,253),broken=(await render({...basic,top:top.id},{},true)).pixel(495,253);
  expect(good.every((v,i)=>Math.abs(v-neckReference[i])<5),'Neck covered by '+top.id);
  if(broken.some((v,i)=>Math.abs(v-neckReference[i])>20))rejected++;
 }
 expect(rejected>=4,'Neck regression no longer rejects opaque collar fixtures');
 const {avatarLayers}=await import('./avatar-layers.mjs'),mintCuffs=structuredClone(avatarLayers['top-mint'].cuffs);
 const goodWrist=(await render({...basic,top:'top-mint'})).pixel(265,715);
 let badWrist;try{Object.assign(avatarLayers['top-mint'].cuffs,{scale:1,rightShift:0});badWrist=(await render({...basic,top:'top-mint'})).pixel(265,715);}finally{avatarLayers['top-mint'].cuffs=mintCuffs;}
 expect(goodWrist[0]>goodWrist[2]+25,'Sleeve covers the left palm');
 expect(badWrist.some((v,i)=>Math.abs(v-goodWrist[i])>30),'Regression did not reject the old sleeve length');
 const openHand=await render({...basic,top:'top-mint'}),closedHand=await render({...basic,top:'top-mint'},{},false,false,true);let blocked=0;
 for(const[cx,cy,,,angle]of avatarLayers['top-mint'].cuffs.openings){const a=angle*Math.PI/180;for(const u of [-6,0,6])for(let v=0;v<=12;v+=2){const x=Math.round(cx+u*Math.cos(a)-v*Math.sin(a)),y=Math.round(cy+u*Math.sin(a)+v*Math.cos(a)),good=openHand.pixel(x,y),bad=closedHand.pixel(x,y);if(bad.some((value,i)=>Math.abs(value-good[i])>20))blocked++;}}
 expect(blocked>0,'Regression did not reject a hole cut through the cuff front');const front=openHand.pixel(275,672),wrong=closedHand.pixel(275,672);expect(front[1]>front[0]&&wrong[0]>wrong[1]+20,'Cuff front/back occlusion regression');
 const solid=(await render({...basic,top:'top-mint'},{},false,true));
 for(let x=390;x<=680;x+=3)for(let y=420;y<=690;y+=3)expect(solid.pixel(x,y)[3]>=250,`Fabric mesh seam: ${x},${y}`);
 // Whole-body depth and colour contracts, including intentionally broken fixtures.
 const {avatarQaPixels,inspectAvatarCase}=await import('./avatar-qa-render.mjs'),{buildAvatarQaPlan}=await import('./avatar-qa.mjs');
 const plan=buildAvatarQaPlan(),bagCase={...plan.cases.find(c=>c.isolate==='acc-bag'),outfit:{...basic,hair:'hair-lilac',accessory:'acc-bag'}},bootCase=plan.cases.find(c=>c.isolate==='shoes-red'),legCase=plan.cases.find(c=>c.isolate==='bottom-denim');
 expect((await inspectAvatarCase(bagCase)).passed,'Bag attachment/depth check');
 async function brokenSvg(test,mutate,rule){const parse=DOMParser.prototype.parseFromString;DOMParser.prototype.parseFromString=function(text,type){const doc=parse.call(this,text,type);mutate(doc.documentElement);return doc;};try{const result=await inspectAvatarCase(test);expect(result.failures.some(f=>f.rule===rule),'Fixture did not reject '+rule);}finally{DOMParser.prototype.parseFromString=parse;}}
 await brokenSvg(bagCase,svg=>{let node=svg.querySelector('[data-item="acc-bag"]');while(node.parentElement!==svg)node=node.parentElement;svg.append(node);},'bag-strap-behind-hair');
 await brokenSvg(bagCase,svg=>svg.querySelector('[mask$="-shoulder)"]').removeAttribute('mask'),'bag-shoulder-clipping');
 await brokenSvg(bootCase,svg=>svg.querySelector('[data-item="shoes-red"]')?.removeAttribute('mask'),'boot-leg-insertion');
 const fittedLegs=structuredClone(avatarLayers['bottom-denim'].legFit);try{avatarLayers['bottom-denim'].legFit.shifts=[0,0];expect((await inspectAvatarCase(legCase)).failures.some(f=>f.rule==='hem-ankle-alignment'),'Fixture did not reject displaced trouser hems');}finally{avatarLayers['bottom-denim'].legFit=fittedLegs;}
 const waistCase=plan.cases.find(c=>c.groups.includes('top-bottom')&&c.outfit.top==='top-forest'&&c.outfit.bottom==='bottom-denim');
 for(const [part,rule]of [['waist','waist-frame:bottom:front'],['sleeve','waist-frame:top:front']])await brokenSvg(waistCase,svg=>{for(const node of svg.querySelectorAll('g[clip-path] > use[transform]'))if(node.parentElement.getAttribute('clip-path').includes('-'+part+'-'))node.removeAttribute('transform');},rule);
 const badAnchor=structuredClone(avatarLayers['bottom-lilac'].waist);
 try{avatarLayers['bottom-lilac'].waist.points[0]=[432,628];expect((await inspectAvatarCase(plan.cases.find(c=>c.isolate==='bottom-lilac'))).failures.some(f=>f.rule==='waist-fabric-landmark:bottom:left'),'Copied waist landmark on empty atlas background was accepted');}finally{avatarLayers['bottom-lilac'].waist=badAnchor;}
 // Actual small UI scale: a flat fabric source makes clipping seams measurable.
 const minFabric=picture=>{let min=255;for(let x=440;x<=650;x+=4)for(let y=420;y<=670;y+=4)min=Math.min(min,picture.pixel(x,y)[3]);return min;};
 const small=await render({...basic,top:'top-mint'},{},false,true,false,176),goodAlpha=minFabric(small);
 expect(goodAlpha>=253,'Small-scale fabric mesh has pale seams: '+goodAlpha);
 const parse=DOMParser.prototype.parseFromString;let oldAlpha;
 DOMParser.prototype.parseFromString=function(text,type){const doc=parse.call(this,text,type);doc.documentElement.querySelector('[data-layer="top"]').removeAttribute('filter');return doc;};
 try{oldAlpha=minFabric(await render({...basic,top:'top-mint'},{},false,true,false,176));}finally{DOMParser.prototype.parseFromString=parse;}
 expect(oldAlpha<goodAlpha-2,'Regression did not reject uncompensated mesh alpha at mobile scale: '+oldAlpha+'/'+goodAlpha);
 console.log('Rendered waist frame rejects missing top/bottom fitting; mobile fabric alpha '+goodAlpha+' vs uncompensated mesh '+oldAlpha);
 const {skins}=await import('./avatar-data.mjs');
 for(const outfit of [{...basic,bottom:'bottom-check'},{...basic,top:'top-night',bottom:'bottom-check'}]){
  const reference=await render(outfit,{skin:'peach'});
  for(const skin of skins){const current=await render(outfit,{skin:skin.id});for(const[x,y]of [[350,1000],[590,1000],[320,1348],...(outfit.top==='top-night'?[[620,450],[620,600]]:[])])expect(current.pixel(x,y).every((v,i)=>Math.abs(v-reference.pixel(x,y)[i])<3),'Skin setting recoloured clothing '+skin.id+' @ '+x+','+y);}
 }
 let html='';for(const top of ['top-stripe','top-mint','top-coral','top-night'])for(const bottom of ['bottom-denim','bottom-lilac','bottom-check','bottom-overall'])html+=`<figure style="margin:0;height:600px"><figcaption style="font:14px sans-serif">${top} / ${bottom}</figcaption>${avatarArt({},{outfit:{...basic,top,bottom}})}</figure>`;
 document.body.innerHTML='<main style="display:grid;grid-template-columns:repeat(4,400px);width:1600px;background:#e8f5f6">'+html+'</main>';document.body.style.margin='0';return checks;
});assert.equal(results.length,16);await p.screenshot({path:'test-results/avatar-fit-matrix.png',fullPage:true});assert.equal(await p.evaluate(()=>localStorage.getItem('teum-avatar-v1')),before);console.log('Rendered pixel regression: 16 waists, body fragments, coat lining, continuous overalls, 4 crowns, 12 moon hair/face/hat fits and 16 trouser/shoe pairs, all top necks and rejected opaque-collar fixtures; original wallet unchanged PASS');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
