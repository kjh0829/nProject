const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-results',{recursive:true});
 try{
  for(const width of [360,390]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8000/#read');await page.waitForFunction(()=>document.body.dataset.view==='read');
   assert.equal(await page.locator('#legacy-archive,#read-archive,#daily-home,#external-feeds,#daily-note').count(),0);
   const previousDaily=JSON.stringify({version:1,days:{'2026-11-19':{note:'보존 확인용 이전 일기'}}});
   await page.evaluate(v=>localStorage.setItem('teum-daily-v1',v),previousDaily);await page.reload();await page.waitForFunction(()=>document.body.dataset.view==='read');
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-daily-v1')),previousDaily);
   const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(await overflow(),false,`${width}px read overflow`);
   await page.screenshot({path:`test-results/read-${width}.png`,fullPage:true});
   for(const id of ['fire','play','community']){
    await page.evaluate(id=>location.hash=id,id);await page.waitForFunction(x=>!document.getElementById(x).hidden,id);assert.equal(await overflow(),false,`${width}px ${id} overflow`);assert.equal(await page.locator('#read').isVisible(),false);
   }
   await page.evaluate(()=>location.hash='play');await page.waitForSelector('#board');assert.equal(await page.locator('#board button').count(),49);assert.equal(await page.locator('#board').evaluate(x=>getComputedStyle(x).touchAction),'manipulation');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('teum-game-finished',{detail:{score:600}})));assert.equal(await page.evaluate(()=>localStorage.getItem('teum-daily-v1')),previousDaily);await page.screenshot({path:`test-results/game-${width}.png`,fullPage:true});
   await page.evaluate(()=>location.hash='community');await page.waitForSelector('#open-compose');await page.locator('#open-compose').click();await page.locator('#post-author').fill('QA');await page.locator('#post-title').fill('오늘의 작은 실천');await page.locator('#post-body').fill('함께 가는 작은 자유');await page.locator('#post-form button[type=submit]').click();assert.equal(await page.locator('#detail-title').textContent(),'오늘의 작은 실천');
   await page.goto('http://127.0.0.1:8000/#fire');await page.locator('#fire-advanced').evaluate(e=>e.open=true);await page.waitForSelector('#goal-form');await page.locator('#assets').fill('10000');await page.locator('#saving').fill('150');await page.locator('#expense').fill('200');await page.locator('#rate').fill('4');await page.locator('#goal-form button[type=submit]').click();assert.equal(await page.locator('#target').textContent(),'6억 원');
   await page.goBack();await page.waitForFunction(()=>document.body.dataset.view==='community');assert.deepEqual(errors,[],`Browser errors at ${width}px`);await context.close();console.log(`${width}px: no overflow; removed archive, unchanged legacy notes, tabs, direct legacy game/community and calculator passed`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
