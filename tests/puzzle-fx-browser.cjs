const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {solvePuzzle}=await import('./puzzle-solver.mjs');
 const {createPuzzle,applyMove,legalMoves}=await import('../docs/puzzle-core.mjs');
 const solution=solvePuzzle(1);assert(solution);
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}: {})});
 try{for(const width of [320,390,1200])for(const reduced of [false,true]){
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/#challenge?stage=1');await page.waitForSelector('.puzzle-tile');
  assert.equal(await page.locator('#puzzle-sound').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#puzzle-board').evaluate(el=>getComputedStyle(el).touchAction),'manipulation');
  await page.locator('#puzzle-sound').click();assert.equal(await page.locator('#puzzle-sound').getAttribute('aria-pressed'),'true');await page.locator('#puzzle-sound').click();
  // A horizontal drag takes exactly one legal move, with no trailing click selecting a tile.
  const initial=createPuzzle(1),pair=legalMoves(initial.board).find(([a,b])=>Math.abs(a-b)===1);assert(pair);
  await page.locator('#puzzle-board').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const a=await page.locator(`[data-puzzle-index="${pair[0]}"]`).boundingBox(),b=await page.locator(`[data-puzzle-index="${pair[1]}"]`).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#puzzle-moves').textContent==='11'&&!document.querySelector('#puzzle-hint').disabled);
  assert.equal(await page.locator('.puzzle-tile.selected').count(),0);
  if(reduced)assert.equal(await page.locator('.puzzle-particle').count(),0);
  await page.locator('#puzzle-undo').click();assert.equal(await page.locator('#puzzle-moves').textContent(),'12');
  // Animation uses the same deterministic result as the engine.
  let expected=initial;
  for(const [a,b]of solution.path){expected=applyMove(expected,a,b).state;await page.locator(`[data-puzzle-index="${a}"]`).click();await page.locator(`[data-puzzle-index="${b}"]`).click();await page.waitForFunction(()=>!document.querySelector('#puzzle-hint').disabled||!document.querySelector('#puzzle-result').hidden);}
  assert.equal(await page.locator('#puzzle-score').textContent(),expected.score+'점');assert.equal(await page.locator('#puzzle-result').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===390&&!reduced){await page.screenshot({path:'test-results/puzzle-fx-win-390.png',fullPage:true});}
  await page.locator('header nav a[href="#home"]').click();assert.equal(await page.locator('.puzzle-particle').count(),0);assert.equal(await page.locator('.puzzle-burst').textContent(),'');
  assert.deepEqual(errors,[]);await context.close();console.log(`FX ${width}px reduced=${reduced} PASS`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
