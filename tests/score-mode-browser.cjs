const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}: {})});try{
 for(const width of [320,390,1200]){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8000/#home');await page.waitForSelector('#home [data-menu-score-action]');
 await page.screenshot({path:`test-results/play-choice-home-${width}.png`,fullPage:true});
 await page.locator('#home [data-menu-score-action]').click();await page.waitForSelector('.puzzle-tile');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('teum-puzzle-score-v1')));
 const initial=await saved();assert.equal(initial.run.state.moves,20);assert.equal(await page.locator('#puzzle-title').textContent(),'랜덤 한 판');
 async function move(){const pair=await page.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-puzzle-score-v1')).run.state).pair;});await page.locator(`[data-puzzle-index="${pair[0]}"]`).click();await page.locator(`[data-puzzle-index="${pair[1]}"]`).click();await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled||!document.querySelector('#puzzle-result').hidden);}
 await move();assert.equal((await saved()).run.state.moves,19);await page.locator('#puzzle-undo').click();assert.equal((await saved()).run.state.moves,20);
 await move();const resumed=(await saved()).run.state;
 const journeyBefore=await page.evaluate(()=>localStorage.getItem('teum-journey-v1'));
 await page.locator('header nav a[href="#home"]').click();
 assert.match(await page.locator('#home [data-menu-score-label]').innerText(),/이어하기/);
 assert.match(await page.locator('#home [data-menu-score-summary]').innerText(),/19수/);
 await page.locator('header nav a[href="#arcade"]').click();
 const stageCard=await page.locator('#arcade [data-menu-journey-action]').boundingBox(),randomCard=await page.locator('#arcade [data-menu-score-action]').boundingBox();
 assert(Math.abs(stageCard.y-randomCard.y)<2);assert(Math.abs(stageCard.width-randomCard.width)<2);
 assert(stageCard.y<600&&randomCard.y<600);
 await page.screenshot({path:`test-results/play-choice-games-${width}.png`,fullPage:true});
 await page.locator('#arcade [data-menu-score-action]').click();
 assert.deepEqual((await saved()).run.state,resumed);
 assert.equal(await page.evaluate(()=>localStorage.getItem('teum-journey-v1')),journeyBefore);
 await page.reload();await page.waitForSelector('.puzzle-tile');assert.deepEqual((await saved()).run.state,resumed);
 await page.locator('#puzzle-restart').click();assert.equal((await saved()).run.state.moves,20);await page.reload();await page.waitForSelector('#puzzle-cancel-restart');await page.locator('#puzzle-cancel-restart').click();assert.equal((await saved()).run.state.moves,19);
 for(let i=0;i<19;i++)await move();const final=await saved();assert.equal(final.run.state.status,'won');assert.equal(final.run.state.turns.length,20);assert.equal(final.best,final.run.state.score);assert.equal(await page.locator('#puzzle-next').textContent(),'다음 랜덤 판 →');assert.equal(await page.locator('#puzzle-stars').textContent(),'');
 await page.reload();await page.waitForSelector('#puzzle-next');assert.equal((await saved()).history.length,1);await page.locator('#puzzle-retry').click();assert.equal((await saved()).run.baseline,final.best);assert.equal((await saved()).run.state.moves,20);await page.locator('#puzzle-cancel-restart').click();assert.equal((await saved()).run.state.moves,0);await page.screenshot({path:`test-results/score-mode-${width}.png`,fullPage:true});
 await page.locator('#puzzle-next').click();const next=await saved();assert.notEqual(next.run.state.seed,initial.run.state.seed);assert.equal(next.run.state.moves,20);assert.equal(next.best,final.best);assert.equal(next.run.baseline,final.best);
 // A completed round opens a new random board from either entry screen; reloads and stale links keep active play.
 await page.locator('header nav a[href="#home"]').click();
 await page.evaluate(value=>{localStorage.setItem('teum-puzzle-score-v1',JSON.stringify(value));window.dispatchEvent(new Event('teum-run-saved'));},final);
 assert.match(await page.locator('#home [data-menu-score-label]').innerText(),/새 랜덤 판/);
 assert.match(await page.locator('#home [data-menu-score-action]').getAttribute('href'),/round=new/);
 await page.locator('#home [data-menu-score-action]').click();
 assert.notEqual((await saved()).run.state.seed,final.run.state.seed);
 assert.equal(await page.evaluate(()=>location.hash),'#challenge?mode=score');
 const fresh=(await saved()).run.state;await page.reload();await page.waitForSelector('.puzzle-tile');assert.deepEqual((await saved()).run.state,fresh);
 await move();const active=(await saved()).run.state;
 await page.goto('http://127.0.0.1:8000/#challenge?mode=score&round=new');await page.waitForSelector('.puzzle-tile');assert.deepEqual((await saved()).run.state,active);
 assert.equal(await page.evaluate(()=>location.hash),'#challenge?mode=score');
 await page.goto('http://127.0.0.1:8000/#challenge?stage=1');await page.waitForSelector('.puzzle-tile');assert.equal(await page.locator('#puzzle-moves').textContent(),'12');assert.equal((await saved()).best,final.best);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(width+'px score mode PASS');}
 const normal=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'no-preference'}),n=await normal.newPage();await n.goto('http://127.0.0.1:8000/#challenge?mode=score');await n.waitForSelector('.puzzle-tile');const pair=await n.evaluate(async()=>{const {bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-puzzle-score-v1')).run.state).pair;});await n.locator(`[data-puzzle-index="${pair[0]}"]`).click();await n.locator(`[data-puzzle-index="${pair[1]}"]`).click();n.once('dialog',d=>d.dismiss());await n.locator('#puzzle-new-round').click();await n.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled);assert.equal(await n.locator('#puzzle-moves').textContent(),'19');const oldSeed=await n.evaluate(()=>JSON.parse(localStorage.getItem('teum-puzzle-score-v1')).run.state.seed);n.once('dialog',d=>d.accept());await n.locator('#puzzle-new-round').click();assert.equal(await n.locator('#puzzle-moves').textContent(),'20');assert.notEqual(await n.evaluate(()=>JSON.parse(localStorage.getItem('teum-puzzle-score-v1')).run.state.seed),oldSeed);await normal.close();
 const context=await browser.newContext(),page=await context.newPage();await page.addInitScript(()=>{localStorage.setItem('teum-puzzle-score-v1','{broken');localStorage.setItem('teum-goal','{"assets":12345}');});await page.goto('http://127.0.0.1:8000/#challenge?mode=score');await page.waitForSelector('.puzzle-tile');assert((await page.locator('#puzzle-save-status').textContent()).includes('저장하지 못'));assert.equal(await page.evaluate(()=>localStorage.getItem('teum-puzzle-score-v1')),'{broken');assert.equal(await page.evaluate(()=>localStorage.getItem('teum-goal')),'{"assets":12345}');await context.close();
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
