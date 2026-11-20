const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}: {})});
 try{for(const width of [320,360,390,1200]){
  const page=await browser.newPage({viewport:{width,height:850}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/');
  await page.waitForFunction(()=>document.querySelector('[data-menu-reward]').textContent.includes('80'));
  const expected=['#home','#arcade','#avatar','#read'];
  for(const nav of ['header nav','.bottom-nav'])assert.deepEqual(await page.locator(nav+' a').evaluateAll(a=>a.map(x=>x.getAttribute('href'))),expected);
  assert.equal(await page.locator('#home .hub-card,#home #meal-feed,#home a[href="#cart"],#home a[href="#fire"]').count(),0);
  assert.equal(await page.locator('#home .home-game-paths .avatar-entry').count(),1);
  assert.equal(await page.locator('#home [data-menu-journey-action]').getAttribute('href'),'#challenge?journey=1');
  for(const route of ['home','arcade']){
   assert.deepEqual(await page.locator('#'+route+' .play-mode-card>strong').allTextContents(),['스테이지','랜덤 한 판']);
   assert.equal(await page.locator('#'+route+' [data-menu-score-action]').getAttribute('href'),'#challenge?mode=score');
   assert.equal(await page.locator('#'+route+' .play-mode-grid').evaluate(el=>!!el.closest('details')),false);
  }
  assert.equal(await page.locator('#meal-feed-grid .meal-card').count(),0);
  assert.equal(await page.locator('.hero,.strip,.meal-hero-visual,.meal-bottom-banner').count(),0);
  const nav=width<700?'.bottom-nav':'header nav';
  for(const a of await page.locator(nav+' a').all()){const box=await a.boundingBox();assert(box.width>=43.9&&box.height>=43.9);}
  await page.screenshot({path:`test-results/review-home-${width}.png`,fullPage:true});
  for(const route of ['arcade','avatar','read','home']){
   await page.locator(nav+` a[href="#${route}"]`).click();
   await page.waitForFunction(route=>document.body.dataset.view===route,route);
   assert.equal(await page.locator(nav+` a[href="#${route}"]`).getAttribute('aria-current'),'page');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow '+width);
  }
  // Actually play one move; returning home must resume without changing any save.
  await page.locator('#home [data-menu-journey-action]').click();await page.waitForSelector('.puzzle-tile');
  const pair=await page.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-journey-v1')).slots[1].state).pair;});
  for(const i of pair)await page.locator(`[data-puzzle-index="${i}"]`).click();
  await page.waitForFunction(()=>!document.getElementById('puzzle-hint').disabled);
  const saved=await page.evaluate(()=>localStorage.getItem('teum-journey-v1'));
  await page.locator(nav+' a[href="#home"]').click();
  assert((await page.locator('#home [data-menu-journey-action]').textContent()).includes('이어하기'));
  await page.locator(nav+' a[href="#read"]').click();
  assert((await page.locator('[data-menu-progress]').textContent()).includes('현재 스테이지 1'));
  assert.equal(await page.locator('#life-tools').getAttribute('open'),null);
  assert.equal(await page.locator('#legacy-archive,#food-tools-archive,#read-archive,#prototype-archive,#daily-home,#external-feeds').count(),0);
  assert.equal(await page.locator('#read a[href="#saved-meals"],#read a[href="#community"],#read a[href="#play"]').count(),0);
  await page.locator('#life-tools>summary').click();
  await page.locator('#life-tools a[href="#fire"]').click();
  assert.equal(await page.locator(nav+' a[href="#read"]').getAttribute('aria-current'),'page');
  await page.locator(nav+' a[href="#read"]').click();
  await page.locator('#life-tools a[data-journal-target]').click();
  await page.waitForFunction(()=>document.querySelector('#life-journal').getBoundingClientRect().top<innerHeight);
  await page.locator('#life-start').click();
  assert(await page.locator('#life-stage').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.top<innerHeight}));
  assert.equal(await page.evaluate(()=>localStorage.getItem('teum-journey-v1')),saved);
  await page.locator(nav+' a[href="#read"]').click();await page.screenshot({path:`test-results/review-records-${width}.png`,fullPage:true});
  // Existing direct addresses continue to resolve and select their new parent tab.
  for(const [route,tab]of [['fire-life','read'],['cart','read'],['avatar?view=reference','avatar'],['journey','arcade']]){
   await page.goto('http://127.0.0.1:8000/#'+route);await page.waitForFunction(v=>document.body.dataset.view===v,route.split('?')[0]);
   assert.equal(await page.locator(nav+` a[href="#${tab}"]`).getAttribute('aria-current'),'page');
  }
  assert.equal(await page.locator('#avatar-reference-menu').getAttribute('open'),'');
  assert.deepEqual(errors,[]);await page.close();
  console.log(width+'px four tabs, real resume, secondary tools, removed archive, old links, save preservation and touch targets PASS');
 }
 // Returning after a clear should enter the next unlocked level without rewriting saves.
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:8000/');
 const progress=JSON.stringify({version:1,records:{1:{stars:3,score:500,moves:3}},slots:{}});
 await page.evaluate(v=>localStorage.setItem('teum-journey-v1',v),progress);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#home [data-menu-journey-action]').getAttribute('href')==='#challenge?journey=2');
 assert((await page.locator('#home [data-menu-reward]').textContent()).includes('스테이지 2'));
 await page.locator('.bottom-nav a[href="#read"]').click();assert((await page.locator('[data-menu-progress]').textContent()).includes('1개 클리어 · 별 3개'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('teum-journey-v1')),progress);
 await page.close();console.log('Returning cleared stage selects next unlocked stage and preserves save PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
