const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}: {})});try{const p=await b.newPage({viewport:{width:1600,height:2400}});await p.goto('http://127.0.0.1:8000/#avatar');await p.waitForSelector('#avatar-stage .avatar-raster');const before=await p.evaluate(()=>localStorage.getItem('teum-avatar-v1'));
const results=await p.evaluate(async()=>{
 const {avatarArt}=await import('./avatar-art.mjs'),cache=new Map();
 // Decode the actual SVG composition with inline copies of its local textures.
 // Canvas is read only: sample pixels, never modify or replace the source PNGs.
 async function render(outfit,look={},withoutNeckMask=false){
  const doc=new DOMParser().parseFromString(avatarArt({skin:'peach',face:'smile',...look},{outfit}).replace('160 -100 700 1640','0 0 1024 1536'),'image/svg+xml'),svg=doc.documentElement;
  if(withoutNeckMask)for(const node of svg.querySelectorAll('[mask]'))node.removeAttribute('mask');
  svg.setAttribute('width','1024');svg.setAttribute('height','1536');
  for(const node of svg.querySelectorAll('image')){const href=node.getAttribute('href');if(!cache.has(href)){const blob=await(await fetch(href)).blob();cache.set(href,await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);}));}node.setAttribute('href',cache.get(href));}
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return{svg,pixel:(x,y)=>[...ctx.getImageData(x,y,1,1).data]};}finally{URL.revokeObjectURL(url);}
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
 let html='';for(const top of ['top-stripe','top-mint','top-coral','top-night'])for(const bottom of ['bottom-denim','bottom-lilac','bottom-check','bottom-overall'])html+=`<figure style="margin:0;height:600px"><figcaption style="font:14px sans-serif">${top} / ${bottom}</figcaption>${avatarArt({},{outfit:{...basic,top,bottom}})}</figure>`;
 document.body.innerHTML='<main style="display:grid;grid-template-columns:repeat(4,400px);width:1600px;background:#e8f5f6">'+html+'</main>';document.body.style.margin='0';return checks;
});assert.equal(results.length,16);await p.screenshot({path:'test-results/avatar-fit-matrix.png',fullPage:true});assert.equal(await p.evaluate(()=>localStorage.getItem('teum-avatar-v1')),before);console.log('Rendered pixel regression: 16 waists, body fragments, coat lining, continuous overalls, 4 crowns, 12 moon hair/face/hat fits and 16 trouser/shoe pairs, all top necks and rejected opaque-collar fixtures; original wallet unchanged PASS');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
