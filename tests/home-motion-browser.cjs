const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE_PATH
  ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']} : {})});
 try {
  for (const width of [360,390,1200]) {
   const context = await browser.newContext({viewport:{width,height:844},reducedMotion:'no-preference'});
   const page = await context.newPage();
   const errors = [];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:8000/');
   await page.waitForSelector('#home[data-demo-playing]');
   assert.equal(await page.locator('.soft-preview .soft-piece').count(),36);
   // Let two complete cycles run without pressing the preview button.
   for (let cycle = 0; cycle < 2; cycle++) {
    await page.waitForFunction(()=>!document.getElementById('home').hasAttribute('data-demo-playing'));
    await page.waitForSelector('#home[data-demo-playing]');
   }
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-journey-v1')),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-puzzle-score-v1')),null);
   const control = page.locator('.home-demo-control');
   await control.click();
   await page.waitForTimeout(2300);
   assert.equal(await page.locator('#home[data-demo-playing]').count(),0);
   assert.match(await control.innerText(),/재생/);
   await control.click();
   await page.waitForSelector('#home[data-demo-playing]');
   // Leaving during the gap between cycles must also cancel the next cycle.
   await page.waitForFunction(()=>!document.getElementById('home').hasAttribute('data-demo-playing'));
   await page.locator('header nav a[href="#read"]').click();
   await page.waitForTimeout(1300);
   assert.equal(await page.locator('#home[data-demo-playing]').count(),0);
   await page.locator('header nav a[href="#home"]').click();
   await page.waitForSelector('#home[data-demo-playing]');
   await page.locator('#home [data-menu-journey-action]').click();
   await page.waitForSelector('#puzzle-board button');
   assert.equal(await page.locator('#home[data-demo-playing]').count(),0);
   const saved = await page.evaluate(()=>localStorage.getItem('teum-journey-v1'));
   await page.locator('header nav a[href="#home"]').click();
   await page.waitForSelector('#home[data-demo-playing]');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>!document.getElementById('home').hasAttribute('data-demo-playing'));
   assert.equal(await control.isVisible(),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-journey-v1')),saved);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.waitForSelector('#home[data-demo-playing]');
   await page.setViewportSize({width,height:300});
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   await page.waitForFunction(()=>!document.getElementById('home').hasAttribute('data-demo-playing'));
   await page.waitForTimeout(1300);
   assert.equal(await page.locator('#home[data-demo-playing]').count(),0);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.setViewportSize({width,height:844});
   await page.waitForSelector('#home[data-demo-playing]');
   assert.deepEqual(errors,[]);
   await context.close();
   console.log(width+'px repeated autoplay, pause/resume, route and offscreen cancellation, immediate play and reduced-motion changes PASS');
  }
  const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.addInitScript(()=>{
   localStorage.setItem('teum-home-demo-seen-v1','1');
   localStorage.setItem('teum-journey-v1',JSON.stringify({version:1,records:{1:{stars:3,score:100,moves:3}},slots:{}}));
  });
  await page.goto('http://127.0.0.1:8000/');
  await page.waitForSelector('.soft-preview .soft-piece');
  assert.equal(await page.locator('.home-demo-control').isVisible(),false);
  assert.equal(await page.locator('#home [data-menu-journey-action]').getAttribute('href'),'#challenge?journey=2');
  assert.equal(await page.locator('#home[data-demo-playing]').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForSelector('#home[data-demo-playing]');
  await page.reload();
  await page.waitForSelector('#home[data-demo-playing]');
  await page.close();
  console.log('Returning visitors autoplay; reduced-motion entry remains still PASS');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
