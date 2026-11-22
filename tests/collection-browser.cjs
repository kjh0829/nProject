const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const {emptyAvatar,grantAvatarReward}=await import('../docs/avatar-core.mjs');
 const wallet=grantAvatarReward(emptyAvatar(),{id:'journey:1',kind:'journey',amount:80}).value;
 const progress={version:1,records:{},slots:{}};
 for(let id=1;id<=4;id++)progress.records[id]={stars:3,score:300,moves:2};
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}:{})});
 try{for(const width of [360,390,1200]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({wallet,progress})=>{
   if(!localStorage.getItem('teum-avatar-v1'))localStorage.setItem('teum-avatar-v1',JSON.stringify(wallet));
   if(!localStorage.getItem('teum-journey-v1'))localStorage.setItem('teum-journey-v1',JSON.stringify(progress));
  },{wallet,progress});
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('teum-avatar-v1')));
  await page.goto('http://127.0.0.1:8000/#avatar');await page.waitForSelector('.avatar-item');
  await page.locator('[data-avatar-item="top-mint"]').click();
  await page.locator('[data-avatar-slot="hat"]').click();await page.locator('[data-avatar-item="hat-beret"]').click();
  await page.waitForSelector('#avatar-stage [data-item="top-mint"]',{state:'attached'});
  assert.equal(await page.locator('#avatar-stage [data-item="top-mint"]').count(),1);
  assert.match(await page.locator('#avatar-item-action').innerText(),/120 P/);
  assert.equal((await read()).spent,0);
  await page.locator('#avatar-item-action').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('teum-avatar-v1')).spent===120);
  assert.equal((await read()).equipped.hat,'hat-beret');assert.equal((await read()).equipped.top,'top-mint');
  await page.locator('.collection-looks>summary').click();await page.locator('#collection-look-name').fill('산책 코디');
  await page.locator('[data-save-look="0"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('teum-avatar-v1')).collection.looks[0]?.name==='산책 코디');
  await page.locator('#avatar-remove').click();assert.equal((await read()).equipped.hat,null);
  await page.locator('[data-load-look="0"]').click();assert.equal((await read()).equipped.hat,'hat-beret');assert.equal((await read()).spent,120);
  await page.reload();await page.waitForSelector('.avatar-item');assert.equal((await read()).collection.looks[0].name,'산책 코디');
  await page.locator('[data-avatar-slot="hair"]').click();await page.locator('[data-avatar-item="hair-silver"]').click();await page.locator('#avatar-wish').click();
  assert.equal((await read()).collection.wish,'hair-silver');
  await page.locator('.collection-prizes>summary').click();assert.equal(await page.locator('[data-background="citrus-lane"]').isDisabled(),true);
  await page.locator('header nav a[href="#home"]').click();
  assert.match(await page.locator('#home [data-wish-target]').innerText(),/60 P/);
  await page.waitForSelector('[data-home-avatar] [data-item="hat-beret"]',{state:'attached'});
  assert.equal(await page.locator('[data-home-avatar] [data-item="hat-beret"]').count(),1);
  await page.waitForSelector('[data-home-avatar] > canvas');
  assert.equal(await page.locator('[data-home-avatar] > canvas').getAttribute('data-avatar-frame'),'160 -100 700 1640');
  assert.equal(await page.locator('[data-home-avatar] svg').count(),0);
  await page.goto('http://127.0.0.1:8000/#challenge?journey=5');await page.waitForSelector('.puzzle-tile');
  for(let n=0;n<25&&await page.locator('#puzzle-result').isHidden();n++){
   const pair=await page.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-journey-v1')).slots[5].state).pair;});
   for(const at of pair)await page.locator(`[data-puzzle-index="${at}"]`).click();
   await page.waitForFunction(()=>!document.getElementById('puzzle-hint').disabled||!document.getElementById('puzzle-result').hidden);
  }
  assert.equal(await page.locator('#puzzle-region-prize').isVisible(),true);
  assert.match(await page.locator('#puzzle-region-prize').innerText(),/첫 편지 배달부/);
  assert.match(await page.locator('#puzzle-result [data-wish-target]').innerText(),/지금 구매/);
  await page.locator('#puzzle-region-prize a').click();await page.waitForSelector('[data-background="citrus-lane"]:enabled');
  await page.locator('[data-background="citrus-lane"]').click();
  assert.equal((await read()).collection.background,'citrus-lane');assert.equal((await read()).spent,120);
  assert.equal(await page.locator('.avatar-room').getAttribute('data-collection-background'),'citrus-lane');
  await page.locator('header nav a[href="#home"]').click();
  assert.equal(await page.locator('#home .avatar-entry').getAttribute('data-collection-background'),'citrus-lane');
  assert.match(await page.locator('#home-region-badge').innerText(),/첫 편지 배달부/);
  await page.screenshot({path:`test-results/collection-home-${width}.png`,fullPage:true});
  await page.locator('#home [data-wish-target] a').first().click();await page.waitForSelector('#avatar-stage [data-item="hair-silver"]',{state:'attached'});
  assert.match(await page.locator('#avatar-item-action').innerText(),/120 P/);
  assert.equal(await page.locator('#avatar-item-action').isEnabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
  console.log(width+'px wish/shortfall, multi-slot purchase/equip, look save/load/reload, full-body home and real region-clear background/badge/prop PASS');
 }
 const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
 const complete={version:1,records:{},slots:{}};
 for(let id=1;id<=20;id++)complete.records[id]={stars:3,score:300,moves:2};
 await page.addInitScript(progress=>localStorage.setItem('teum-journey-v1',JSON.stringify(progress)),complete);
 await page.goto('http://127.0.0.1:8000/#avatar');await page.waitForSelector('.avatar-item');
 await page.locator('.collection-prizes>summary').click();
 for(const id of ['citrus-lane','glass-garden','starlight-station','prism-workshop']){
  await page.locator('[data-background="'+id+'"]').click();
  assert.equal(await page.locator('.avatar-room').getAttribute('data-collection-background'),id);
  assert.equal(await page.locator('.avatar-room .collection-room-prop').isVisible(),true);
 }
 await page.locator('header nav a[href="#home"]').click();
 assert.match(await page.locator('#home-region-badge').innerText(),/빛의 장인/);
 await page.screenshot({path:'test-results/collection-starlight-home.png',fullPage:true});
 await page.evaluate(async()=>{
  const {emptyAvatar,grantAvatarReward,dressAvatar,wishAvatar}=await import('./avatar-core.mjs');
  let value=grantAvatarReward(emptyAvatar(),{id:'journey:20',kind:'journey',amount:80}).value;
  value=dressAvatar(value,{hat:'hat-beret'}).value;
  value=wishAvatar(value,'hat-wizard').value;
  localStorage.setItem('teum-avatar-v1',JSON.stringify(value));
 });
 await page.reload();await page.waitForSelector('#home [data-wish-target] a');
 assert.equal(await page.locator('#home [data-wish-target] a').first().getAttribute('href'),'#challenge?mode=score');
 await page.close();console.log('All four regional bundles, applied ornaments, home badge and repeatable point route after completion PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
