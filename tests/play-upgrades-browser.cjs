const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}:{})});
 try {
  for(const width of [360,390]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8000/#challenge?journey=1');await page.waitForSelector('.puzzle-tile');
   assert.equal(await page.locator('.puzzle-guide').isVisible(),true);
   const {pair,expected}=await page.evaluate(async()=>{
    const {legalMoves,applyMove}=await import('./puzzle-core.mjs');const state=JSON.parse(localStorage.getItem('teum-journey-v1')).slots[1].state;
    const pair=legalMoves(state.board).find(([a,b])=>b-a===6);return {pair,expected:applyMove(state,...pair).state};
   });
   assert(pair);
   await page.locator('#puzzle-board').scrollIntoViewIfNeeded();
   const a=await page.locator(`[data-puzzle-index="${pair[0]}"]`).boundingBox(),b=await page.locator(`[data-puzzle-index="${pair[1]}"]`).boundingBox();
   const cdp=await context.newCDPSession(page);
   const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
   await touch('touchStart',a.x+a.width/2,a.y+a.height/2);
   await touch('touchMove',a.x+a.width/2,b.y+b.height/2);
   await page.waitForSelector('.is-dragging');
   assert.match(await page.locator('.is-dragging').evaluate(el=>el.style.transform),/translate/);
   assert.equal(await page.locator('.drag-target').count(),1);
   assert.equal(await page.locator('#puzzle-moves').innerText(),'12');
   await touch('touchEnd',0,0);
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('teum-journey-v1')).slots[1].state.moves===11&&!document.getElementById('puzzle-hint').disabled);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('teum-journey-v1')).slots[1].state),expected);
   assert.equal(await page.locator('.is-dragging,.drag-target').count(),0);
   await page.reload();await page.waitForSelector('.puzzle-tile');
   assert(!(await page.locator('.puzzle-guide').innerText()).includes('빛나는 두 조각'));
   await page.goto('http://127.0.0.1:8000/#avatar');await page.waitForSelector('.avatar-item');
   await page.locator('#avatar-search').fill('민트');assert.equal(await page.locator('.avatar-item').count(),1);
   await page.locator('#avatar-search').fill('');await page.locator('#avatar-availability').selectOption('affordable');
   const ids=await page.locator('.avatar-item').evaluateAll(els=>els.map(el=>el.dataset.avatarItem));
   const expectedIds=await page.evaluate(async()=>{const{avatarItems}=await import('./avatar-data.mjs');const v=JSON.parse(localStorage.getItem('teum-avatar-v1'));const balance=v.welcome+v.earned-v.spent;return avatarItems.filter(i=>i.slot==='top'&&!v.owned.includes(i.id)&&i.price<=balance).map(i=>i.id);});
   assert.deepEqual(ids,expectedIds);
   await page.locator('#avatar-availability').selectOption('unowned');await page.locator('#avatar-sort').selectOption('price-up');
   const prices=await page.locator('.avatar-item small').allTextContents();const numbers=prices.map(t=>parseInt(t));assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
   await page.locator('#outfit-card-name').fill('나의 별빛');await page.locator('#outfit-export-button').click();
   await page.waitForSelector('#outfit-export-preview img');
   const size=await page.locator('#outfit-export-preview img').evaluate(async image=>{await image.decode();return [image.naturalWidth,image.naturalHeight]});assert.deepEqual(size,[900,1200]);
   const download=page.waitForEvent('download');await page.locator('#outfit-export-preview a[download]').click();assert.equal((await download).suggestedFilename(),'alchankki-outfit.png');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);await context.close();console.log(width+'px real touch drag, one move, first guide persistence, search/affordability/sort and 900×1200 PNG download PASS');
  }
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.addInitScript(()=>{
   const records={};for(let id=1;id<=15;id++)records[id]={stars:3,score:300,moves:2};
   localStorage.setItem('teum-journey-v1',JSON.stringify({version:1,records,slots:{}}));
   localStorage.setItem('teum-puzzle-guide-v1',JSON.stringify({move:true,specials:[],off:false}));
  });
  await page.goto('http://127.0.0.1:8000/#challenge?journey=16');await page.waitForSelector('.puzzle-tile');
  assert.match(await page.locator('#puzzle-mission').innerText(),/번개 만들기/);
  for(let n=0;n<16&&await page.locator('#puzzle-result').isHidden();n++){
   const pair=await page.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-journey-v1')).slots[16].state).pair;});
   for(const at of pair)await page.locator(`[data-puzzle-index="${at}"]`).click();
   await page.waitForFunction(()=>!document.getElementById('puzzle-hint').disabled||!document.getElementById('puzzle-result').hidden);
  }
  assert.match(await page.locator('#puzzle-mission').innerText(),/1 \/ 1/);
  assert.equal(await page.locator('#puzzle-next').getAttribute('href'),'#challenge?journey=17');
  await page.goto('http://127.0.0.1:8000/#home');
  await page.evaluate(()=>localStorage.setItem('teum-puzzle-score-v1',JSON.stringify({version:1,best:2500,history:[{seed:'score-c',score:2000},{seed:'score-b',score:2500},{seed:'score-a',score:1000}],run:null})));
  await page.goto('http://127.0.0.1:8000/#challenge?mode=score');await page.waitForSelector('.puzzle-tile');
  assert.match(await page.locator('#score-chase').innerText(),/2,500점/);
  await page.locator('header nav a[href="#read"]').click();
  const history=page.locator('#read .score-history-details');await history.locator('summary').click();
  assert.equal(await history.locator('li').count(),3);
  assert.deepEqual(await history.locator('li>span').allTextContents(),['1,000','2,500','2,000']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();console.log('New mission stage/unlock and honest baseline/recent history PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
