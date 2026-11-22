const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=process.env.AVATAR_BROWSER||'chromium';
const base=process.env.AVATAR_BASE_URL||'http://127.0.0.1:8000/';
(async()=>{
 const {avatarItems}=await import('../docs/avatar-data.mjs');
 const browser=await({chromium,webkit}[engine]).launch({headless:true});
 fs.mkdirSync('test-results',{recursive:true});
 try{for(const width of [360,390]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],crashes=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>crashes.push('renderer crashed'));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{localStorage.setItem('teum-fire-quick-v1','{"test":"preserve"}');});
  await page.goto(base+'#read');
  await page.waitForFunction(()=>localStorage.getItem('teum-avatar-v1'));
  assert.equal(await page.locator('canvas.avatar-raster').count(),0);
  assert.equal(requests.some(url=>url.includes('/avatar-canvas.mjs')||url.includes('/wardrobe-v1/')),false,'Direct records entry must not load avatar textures or renderer');
  const wallet=await page.evaluate(()=>localStorage.getItem('teum-avatar-v1'));
  const nav=view=>page.locator(`header nav a[href="#${view}"]`).click();
  await nav('avatar');await page.waitForSelector('#avatar-stage canvas');
  for(const slot of ['hair','hat','top','bottom','shoes','accessory']){
   await page.locator(`[data-avatar-slot="${slot}"]`).click();
   for(const item of avatarItems.filter(i=>i.slot===slot)){
    await page.locator(`[data-avatar-item="${item.id}"]`).click();
    await page.waitForSelector(`#avatar-stage [data-item="${item.id}"]`,{state:'attached'});
    const stats=await page.evaluate(async()=>{const {avatarCanvasStats}=await import('./avatar-canvas.mjs?renderer=20261122-detail1');const {avatarPreviewStats}=await import('./avatar-runtime.mjs?canvas=20261122-detail1');return{...avatarCanvasStats(),...avatarPreviewStats(),svg:document.querySelectorAll('#avatar-stage svg,#avatar-items svg').length};});
    assert.equal(stats.svg,0);assert(stats.texturePixels<=stats.limits.texturePixels);assert(stats.canvasPixels<4_000_000,'Visible preview buffers exceeded 16 MB');
   }
  }
  for(const skin of ['peach','honey','cocoa','rose'])for(const face of ['smile','sparkle','calm']){
   await page.evaluate(async({skin,face})=>{const {renderAvatarCanvas}=await import('./avatar-canvas.mjs?renderer=20261122-detail1');const c=await renderAvatarCanvas({skin,face},{width:400,height:900});const ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>180)opaque++;c.width=c.height=0;if(opaque<5000)throw Error('Empty native Canvas artwork');},{skin,face});
  }
  for(let n=0;n<12;n++){
   await nav('avatar');await page.waitForSelector('#avatar-stage canvas');
   await page.evaluate(async()=>{const image=document.querySelector('#avatar-stage canvas');const {navigateTo}=await import('./navigation.mjs');navigateTo('#read');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(image.width!==0||image.height!==0)throw Error('Hidden preview retained its backing buffer');});
   await nav('home');await page.waitForSelector('[data-home-avatar] canvas');await nav('arcade');
   assert.equal(await page.locator('canvas.avatar-raster').count(),0);
  }
  await nav('avatar');await page.waitForSelector('#avatar-stage canvas');
  await page.waitForFunction(async()=>!(await import('./avatar-canvas.mjs?renderer=20261122-detail1')).avatarCanvasStats().queued);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  assert.equal(await page.locator('canvas.avatar-raster').count(),0);
  assert.equal(await page.evaluate(async()=> (await import('./avatar-canvas.mjs?renderer=20261122-detail1')).avatarCanvasStats().texturePixels),0);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.waitForSelector('#avatar-stage canvas');
  await page.locator('#outfit-export-button').click();await page.waitForSelector('#outfit-export-preview img');
  assert.deepEqual(await page.locator('#outfit-export-preview img').evaluate(async image=>{await image.decode();return[image.naturalWidth,image.naturalHeight];}),[900,1200]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('teum-avatar-v1')),wallet);
  assert.equal(await page.evaluate(()=>localStorage.getItem('teum-fire-quick-v1')),'{"test":"preserve"}');
  assert.equal(requests.some(url=>url.includes('/avatar-art.mjs')),false,'Production must never import the recursive SVG renderer');
  assert.deepEqual(errors,[]);assert.deepEqual(crashes,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`test-results/avatar-canvas-${engine}-${width}.png`,fullPage:true});
  await context.close();console.log(`${engine} ${width}px DPR3: direct records, all 52 items/12 looks, bounded buffers, 12 navigation cycles, pagehide/restore and PNG; wallet unchanged PASS`);
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
