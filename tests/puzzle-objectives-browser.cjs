const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const core=await import('../docs/puzzle-core.mjs');
 const {puzzleObjectives,retryAdvice,objectiveHint}=await import('../docs/puzzle-objectives.mjs');
 const {createJourneyPuzzle,createScorePuzzle,applyMove,legalMoves,bestHint,validSnapshot}=core;
 function lose(id){
  let state=createJourneyPuzzle(id),undo=null;const path=[];
  while(state.status==='playing'){
   const choices=legalMoves(state.board).map(pair=>({pair,turn:applyMove(state,...pair)}));
   choices.sort((a,b)=>a.turn.state.collected-b.turn.state.collected||a.turn.state.cleared-b.turn.state.cleared||(a.turn.state.missionCount||0)-(b.turn.state.missionCount||0));
   undo=state;state=choices[0].turn.state;path.push({undo,state,pair:choices[0].pair});
  }
  assert.equal(state.status,'lost');assert(validSnapshot(state));return {state,undo,path};
 }
 const failed=lose(16),iceFailed=lose(19),comboFailed=lose(20);
 assert.deepEqual(puzzleObjectives(failed.state).map(g=>[g.id,g.complete]),[['collection',true],['mission',false]]);
 assert.match(retryAdvice(iceFailed.state),/얼음/);assert.match(retryAdvice(comboFailed.state),/특수 조각 두 개/);
 assert.deepEqual(puzzleObjectives(createScorePuzzle('objectives-score')),[]);
 const started=createJourneyPuzzle(16),hint=bestHint(started);assert.match(objectiveHint(started,hint),/번개 만들기/);
 const browser=await chromium.launch({headless:true});
 try {
  for(const [width,height,motion]of [[360,800,'no-preference'],[390,844,'reduce'],[844,390,'reduce']]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:motion}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const first=failed.path.find(step=>step.undo.moves===3),tail=failed.path.filter(step=>step.undo.moves<=3);
   await page.addInitScript(({state})=>{
    const records={};for(let i=1;i<16;i++)records[i]={stars:1,score:300,moves:8};
    if(!sessionStorage.getItem('objectives-fixture')){
     localStorage.setItem('teum-journey-v1',JSON.stringify({version:1,records,slots:{16:{state,undo:null,restart:null}}}));
     localStorage.setItem('teum-puzzle-guide-v1',JSON.stringify({move:true,specials:[],off:true}));
     sessionStorage.setItem('objectives-fixture','1');
    }
   },{state:first.undo});
   await page.goto('http://127.0.0.1:8000/#challenge?journey=16');await page.waitForSelector('.puzzle-tile');
   if(width===844)await page.locator('#challenge .focus-enter').click();
   assert.match(await page.locator('#puzzle-turn-note').innerText(),/남은 3수/);
   assert(await page.locator('#puzzle-moves').evaluate(el=>el.parentElement.hasAttribute('data-low-moves')));
   const wallet=await page.evaluate(()=>localStorage.getItem('teum-avatar-v1'));
   for(const step of tail){
    for(const at of step.pair)await page.locator(`[data-puzzle-index="${at}"]`).click();
    await page.waitForFunction(()=>!document.getElementById('puzzle-hint').disabled||!!document.querySelector('.puzzle-finale[open]'));
   }
   assert(await page.locator('.puzzle-finale').evaluate(el=>el.open));
   const rows=page.locator('#puzzle-result-objectives li');
   assert.equal(await rows.count(),2);assert.match(await rows.nth(0).innerText(),/완료/);assert.match(await rows.nth(1).innerText(),/1회 더/);
   assert.match(await page.locator('#puzzle-result-objectives p').innerText(),/같은 색 4개/);
   assert.equal(await page.locator('#puzzle-avatar-reward').isVisible(),false);
   assert.equal(await page.locator('#puzzle-turn-note').isVisible(),false);
   assert.equal(await page.locator('#puzzle-result-undo').getAttribute('class'),'primary');
   await page.screenshot({path:`test-results/objectives-result-${width}.png`,fullPage:true});
   // The result itself can recover the last move, and the closed dialog must not trap focus.
   await page.locator('#puzzle-result-undo').click();
   assert.equal(await page.locator('.puzzle-finale').evaluate(el=>el.open),false);
   assert.equal(await page.locator('#puzzle-result').isVisible(),false);
   assert.equal(await page.locator('#puzzle-moves').innerText(),'1');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('teum-journey-v1')).slots[16].state),failed.undo);
   assert.equal(await page.evaluate(()=>localStorage.getItem('teum-avatar-v1')),wallet);
   assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('teum-journey-v1')).records[16]),false);
   assert.equal(await page.locator('#puzzle-undo').isDisabled(),true);
   assert(await page.evaluate(()=>document.activeElement.hasAttribute('data-puzzle-index')));
   await page.reload();await page.waitForSelector('.puzzle-tile');assert.equal(await page.locator('#puzzle-moves').innerText(),'1');
   if(width===844)await page.locator('#challenge .focus-enter').click();
   assert.equal(await page.evaluate(()=>document.getElementById('challenge').scrollWidth>document.getElementById('challenge').clientWidth),false);
   // Fresh mission hint must describe the actual mission, and completions must reset on retry.
   await page.locator('#puzzle-restart').click();await page.locator('#puzzle-hint').click();
   assert.match(await page.locator('#puzzle-live').innerText(),/번개 만들기/);
   const pair=await page.evaluate(async()=>{const{bestHint}=await import('./puzzle-core.mjs');return bestHint(JSON.parse(localStorage.getItem('teum-journey-v1')).slots[16].state).pair;});
   for(const at of pair)await page.locator(`[data-puzzle-index="${at}"]`).click();
   await page.waitForFunction(()=>!document.getElementById('puzzle-hint').disabled);
   assert(await page.locator('#puzzle-mission').evaluate(el=>el.hasAttribute('data-complete')));
   await page.locator('#puzzle-restart').click();
   assert.equal(await page.locator('#puzzle-mission').evaluate(el=>el.hasAttribute('data-complete')),false);
   await page.goto('http://127.0.0.1:8000/#challenge?mode=score');await page.waitForSelector('.puzzle-tile');
   assert.equal(await page.locator('#puzzle-collection-goal').evaluate(el=>el.hasAttribute('data-complete')),false);
   assert.equal(await page.locator('#puzzle-turn-note').isVisible(),false);
   assert.equal(await page.locator('#puzzle-result-objectives').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);await context.close();
   console.log(`${width}px/${motion} exact goal deficits, last-three note, modal undo/resume without rewards, mission hint and retry reset PASS`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
