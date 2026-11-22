const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:8000/';
const renderer='**/avatar-canvas.mjs?renderer=20261122-shoes1';

(async()=>{
 const {emptyAvatar,dressAvatar}=await import('../docs/avatar-core.mjs');
 const wallet=dressAvatar(emptyAvatar(),{hat:'hat-beret'}).value;
 const progress={version:1,records:{},slots:{}};
 const saved={'teum-avatar-v1':JSON.stringify(wallet),'teum-journey-v1':JSON.stringify(progress),'teum-fire-quick-v1':'{"test":"untouched"}'};
 const browser=await chromium.launch({headless:true});
 async function open(width){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(records=>{for(const[key,value]of Object.entries(records))if(localStorage.getItem(key)===null)localStorage.setItem(key,value);},saved);
  return{context,page,errors};
 }
 const records=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(saved));
 const nav=(page,view)=>page.locator(`header nav a[href="#${view}"]`).click();
 try{
  for(const width of [360,390])for(const fault of ['legacy-registry','blocked-renderer','throwing-renderer']){
   const {context,page,errors}=await open(width);
   if(fault==='legacy-registry')await page.route('**/avatar-layers.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('docs/avatar-layers.mjs','utf8')+'\nfor(const layer of Object.values(avatarLayers)){delete layer.waist;delete layer.footFit;}'}));
   if(fault==='blocked-renderer')await page.route(renderer,route=>route.fulfill({status:503,contentType:'text/javascript',body:'Unavailable'}));
   if(fault==='throwing-renderer')await page.route(renderer,route=>route.fulfill({contentType:'text/javascript',body:'export function renderAvatarCanvas(){throw Error("broken optional artwork");}'}));
   await page.goto(base+'#home');
   if(fault==='legacy-registry')await page.waitForSelector('[data-home-avatar] > canvas');
   else await page.waitForSelector('#avatar-render-notice');
   assert.equal(await page.locator('#avatar-stage canvas,#avatar-items canvas,[data-avatar-mini] canvas').count(),0,'Hidden wardrobe and journey must not render on home');
   assert.deepEqual(await records(page),saved,'Loading artwork must preserve every saved record');
   await nav(page,'avatar');
   if(fault==='legacy-registry'){
    await page.waitForSelector('#avatar-stage > canvas');
    assert.equal(await page.locator('#avatar-stage [data-item="hat-beret"]').count(),1);
    await page.waitForSelector('.avatar-item:enabled');
   }else{
    await page.waitForSelector('#avatar-stage [data-avatar-render-state="failed"]');
    assert.equal(await page.locator('.avatar-item:enabled').count(),0,'Never purchase without an available preview');
    await page.locator('#outfit-export-button').click();
    await page.waitForFunction(()=>!document.querySelector('#outfit-export-button').disabled);
    assert.equal(await page.locator('#outfit-export-preview img').count(),0,'Never export fallback markup as outfit art');
    assert.match(await page.locator('#outfit-export-status').innerText(),/다시 불러온 뒤/);
   }
   await nav(page,'read');assert.equal(await page.locator('#read').isVisible(),true);
   await nav(page,'arcade');
   assert.equal(await page.locator('#avatar-stage canvas,#avatar-items canvas,[data-home-avatar] canvas').count(),0,'Release hidden artwork after navigation');
   assert.deepEqual(await records(page),saved);
   await page.evaluate(async()=>{(await import('./navigation.mjs')).navigateTo('#challenge?journey=1');});
   await page.waitForSelector('.puzzle-tile');
   for(let n=0;n<12&&await page.locator('#puzzle-result').isHidden();n++){
    const pair=await page.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-journey-v1')).slots[1].state).pair;});
    for(const at of pair)await page.locator(`[data-puzzle-index="${at}"]`).click();
    await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled||!document.querySelector('#puzzle-result').hidden);
   }
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('teum-avatar-v1')).earned===80);
   const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('teum-avatar-v1')));
   assert.equal(result.spent,wallet.spent);assert.deepEqual(result.owned,wallet.owned);assert.deepEqual(result.equipped,wallet.equipped);
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-fire-quick-v1')),saved['teum-fire-quick-v1']);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);
   await context.close();
   console.log(`${width}px ${fault}: home/navigation, saved outfit, real game completion/reward, fallback/export isolation and no overflow PASS`);
  }
  const {context,page,errors}=await open(390);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route(renderer,async route=>{await gate;await route.continue();});
  try{
   await page.goto(base+'#avatar?item=top-mint',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#avatar-stage [data-avatar-render-state="loading"]');
   assert.equal(await page.locator('#avatar-item-action').isDisabled(),true);
   assert.equal(await page.locator('.avatar-item:enabled').count(),0);
   await nav(page,'arcade');assert.deepEqual(await records(page),saved);
   assert.equal(await page.locator('#avatar-stage canvas,#avatar-items canvas').count(),0);
   release();await page.waitForFunction(async()=> (await import('./avatar-runtime.mjs?canvas=20261122-shoes1')).isAvatarArtReady());
   assert.equal(await page.locator('#avatar-stage canvas,#avatar-items canvas').count(),0,'Late loading must not recreate hidden wardrobe');
   await nav(page,'avatar');await page.waitForSelector('.avatar-item:enabled');
   await page.locator('[data-avatar-item="top-mint"]').click();
   await page.waitForSelector('#avatar-stage [data-item="top-mint"]',{state:'attached'});
   assert.deepEqual(await records(page),saved,'Preview is not a purchase');
   assert.deepEqual(errors,[]);
   console.log('Delayed artwork: immediate navigation, blocked blind purchase, late hidden render avoided and preview recovery PASS');
  }finally{release();await context.close();}
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
