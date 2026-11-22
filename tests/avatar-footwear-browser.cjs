const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const engine=process.env.AVATAR_BROWSER||'chromium',base=process.env.AVATAR_BASE_URL||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await({chromium,webkit}[engine]).launch({headless:true});
 fs.mkdirSync('test-results',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#read');await page.waitForFunction(()=>localStorage.getItem('teum-avatar-v1'));
  const before=await page.evaluate(()=>localStorage.getItem('teum-avatar-v1'));
  const result=await page.evaluate(async()=>{
   const {renderAvatarCanvas,avatarCanvasStats}=await import('./avatar-canvas.mjs?renderer=20261122-detail2');
   const {avatarItems,starterOutfit,skins}=await import('./avatar-data.mjs');
   const {avatarLayers}=await import('./avatar-layers.mjs');
   const {shoeFitFor}=await import('./avatar-shoe-fit.mjs');
   const {inspectShoeFit}=await import('./avatar-qa-render.mjs?detail=4');
   const options={frame:[240,1280,510,256],width:510,height:256};
   function picture(c){const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return{data,pixel:(x,y)=>{const index=((Math.round(y)-1280)*510+Math.round(x)-240)*4;return[...data.slice(index,index+4)];}};}
   const gallery=document.createElement('main');gallery.style='display:grid;grid-template-columns:repeat(3,340px);gap:10px;padding:16px;background:#ecf1ed';
   const failures=[];let checked=0,legacy=false,rejected=false;
   for(const item of avatarItems.filter(i=>i.slot==='shoes'&&shoeFitFor(i.id,avatarLayers[i.id])))for(const bottom of avatarItems.filter(i=>i.slot==='bottom'))for(const skin of skins){
    const test={outfit:{...starterOutfit,shoes:item.id,bottom:bottom.id},look:{skin:skin.id,face:'smile'}};
    const c=await renderAvatarCanvas(test.look,{...options,outfit:test.outfit}),isolate=await renderAvatarCanvas(test.look,{...options,outfit:test.outfit,isolate:item.id});
    const full=picture(c),hole=picture(isolate),bad=await inspectShoeFit(test,full,hole);checked++;if(bad.length)failures.push({shoes:item.id,bottom:bottom.id,skin:skin.id,failures:bad.slice(0,5)});
    if(item.id==='shoes-canvas'&&bottom.id==='bottom-check'&&skin.id==='peach'){
     const registered=avatarLayers[item.id].footFit;try{delete avatarLayers[item.id].footFit;const old=await renderAvatarCanvas(test.look,{...options,outfit:test.outfit});const oldData=picture(old).data;legacy=full.data.every((v,i)=>v===oldData[i]);old.width=old.height=0;}finally{avatarLayers[item.id].footFit=registered;}
     const proto=CanvasRenderingContext2D.prototype,descriptor=Object.getOwnPropertyDescriptor(proto,'globalCompositeOperation');
     try{Object.defineProperty(proto,'globalCompositeOperation',{...descriptor,set(value){descriptor.set.call(this,value==='destination-out'?'source-over':value);}});const wrong=await renderAvatarCanvas(test.look,{...options,outfit:test.outfit,isolate:item.id});const invalid=await inspectShoeFit(test,full,picture(wrong));rejected=invalid.some(f=>f.rule==='shoe-interior-opens-around-foot');wrong.width=wrong.height=0;}finally{Object.defineProperty(proto,'globalCompositeOperation',descriptor);}
    }
    isolate.width=isolate.height=0;
    if(bottom.id==='bottom-check'&&skin.id==='peach'){const figure=document.createElement('figure');figure.style='margin:0;padding:8px;background:#fffaf4';const label=document.createElement('figcaption');label.textContent=item.name;label.style='font:14px sans-serif';c.style='width:320px;height:auto';figure.append(label,c);gallery.append(figure);}else c.width=c.height=0;
   }
   document.body.replaceChildren(gallery);document.body.style.margin='0';
   return{checked,failures,legacy,rejected,stats:avatarCanvasStats()};
  });
  assert.equal(result.checked,252);if(result.failures.length)console.error(JSON.stringify(result.failures.slice(0,4),null,2));assert.equal(result.failures.length,0,'Footwear pixel cases failed');assert.equal(result.legacy,true);assert.equal(result.rejected,true);
  assert(result.stats.texturePixels<=result.stats.limits.texturePixels);
  const detailCount=await page.evaluate(async()=>{
   const {buildAvatarQaPlan}=await import('./avatar-qa.mjs');
   const {inspectAvatarCase}=await import('./avatar-qa-render.mjs?detail=4');
   const ids=new Set(['bottom-overall','acc-cafe','hair-lilac','top-starlit','shoes-red','shoes-star','shoes-forest','shoes-coast']);
   const cases=buildAvatarQaPlan().cases.filter(test=>ids.has(test.isolate)||
    (test.groups.includes('top-bottom')&&test.outfit.top==='top-night'&&test.outfit.bottom==='bottom-overall'));
   for(const test of cases){
    const result=await inspectAvatarCase(test,'canvas');
    if(!result.passed)throw Error(test.id+' '+JSON.stringify(result.failures.slice(0,5)));
   }
   return cases.length;
  });
  assert.equal(detailCount,9);assert.deepEqual(errors,[]);
  console.log(engine+': visible straps, coat opening, cheek, cuffs, boot rims and shoe edges PASS');
  assert.equal(await page.evaluate(()=>localStorage.getItem('teum-avatar-v1')),before);
  await page.screenshot({path:`test-results/avatar-footwear-${engine}.png`,fullPage:true});
  console.log(`${engine}: 7 low shoes × 9 bottoms × 4 skin tones; filled heel cups, clear isolated openings, preserved front collars, contact shadows, legacy registry, rejected missing masks and wallet unchanged PASS`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
