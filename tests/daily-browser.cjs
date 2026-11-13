const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-results',{recursive:true});
 try{
  for(const width of [360,390]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8000/#read');await page.waitForFunction(()=>document.querySelector('#daily-title').textContent!=='하루 한 가지, 작은 자유를 쌓아요.');
   const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(await overflow(),false,`${width}px read overflow`);
   await page.locator('#read-done').click();await page.locator('#mission-done').click();await page.locator('#quiz-options button').first().click();assert.equal(await page.locator('#quiz-options button:disabled').count(),3);
   await page.locator('#mode-evening').click();await page.locator('#daily-note').fill('오늘은 내 시간을 위해 산책했어요.');await page.locator('#journal-form button').click();await page.reload();await page.waitForFunction(()=>document.querySelector('#daily-note').value.length>0);assert.equal(await page.locator('#daily-note').inputValue(),'오늘은 내 시간을 위해 산책했어요.');assert(await page.locator('#daily-complete').textContent().then(t=>t.includes('모두')));
   await page.screenshot({path:`test-results/read-${width}.png`,fullPage:true});
   for(const id of ['fire','play','community']){
    await page.evaluate(id=>location.hash=id,id);await page.waitForFunction(x=>!document.getElementById(x).hidden,id);assert.equal(await overflow(),false,`${width}px ${id} overflow`);assert.equal(await page.locator('#read').isVisible(),false);
   }
   await page.evaluate(()=>location.hash='play');await page.waitForSelector('#board');assert.equal(await page.locator('#board button').count(),49);assert.equal(await page.locator('#board').evaluate(x=>getComputedStyle(x).touchAction),'manipulation');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('teum-game-finished',{detail:{score:600}})));await page.waitForFunction(()=>document.querySelector('#daily-game-goal').textContent.includes('600점'));await page.screenshot({path:`test-results/game-${width}.png`,fullPage:true});
   await page.evaluate(()=>location.hash='community');await page.waitForSelector('#open-compose');await page.locator('#open-compose').click();await page.locator('#post-author').fill('QA');await page.locator('#post-title').fill('오늘의 작은 실천');await page.locator('#post-body').fill('함께 가는 작은 자유');await page.locator('#post-form button[type=submit]').click();assert.equal(await page.locator('#detail-title').textContent(),'오늘의 작은 실천');
   await page.goto('http://127.0.0.1:8000/#fire');await page.waitForSelector('#goal-form');await page.locator('#assets').fill('10000');await page.locator('#saving').fill('150');await page.locator('#expense').fill('200');await page.locator('#rate').fill('4');await page.locator('#goal-form button').click();assert.equal(await page.locator('#target').textContent(),'6억 원');
   await page.goBack();await page.waitForFunction(()=>document.body.dataset.view==='community');assert.deepEqual(errors,[],`Browser errors at ${width}px`);await context.close();console.log(`${width}px: no overflow; daily completion, quiz lock, saved note, tabs, game goal, community and calculator passed`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
