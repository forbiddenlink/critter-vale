const {chromium}=require('./pw.cjs');
const {AxeBuilder}=require('./tooling/node_modules/@axe-core/playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:5174';
const fs=require('node:fs');const assert=require('node:assert/strict');
const intersects=(a,b)=>!!a&&!!b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const probeEngineScroll=async p=>{await p.evaluate(()=>{const d=document.createElement('div');d.id='scroll-probe';d.tabIndex=0;d.style.cssText='position:fixed;left:0;top:0;width:20px;height:20px;overflow-y:auto;z-index:99999';d.innerHTML='<div style="height:200px"></div>';document.body.appendChild(d);d.focus();});await p.keyboard.press('ArrowDown');await p.waitForTimeout(300);const scrolled=await p.evaluate(()=>{const d=document.getElementById('scroll-probe');const v=d.scrollTop>0;d.remove();return v});return scrolled;};
(async()=>{
 const phase=process.argv[2]||'after';const b=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{
  for(const [name,width,height] of [['touch-portrait',390,844],['touch-landscape',844,390],['touch-landscape-small',667,375],['touch-small',320,568]]){
   const c=await b.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nwindow.__review={world,team,makeCritter,drawHud};'});});
   await p.goto(base);await p.locator('.starter').first().tap();await p.locator('.title').waitFor({state:'detached'});
   await p.evaluate(()=>{for(const id of ['tadmite','leaflet','emberwulf','torretoad','thornmaw'])__review.team.push(__review.makeCritter(id,20));__review.drawHud();__review.world.setPos(-4,3);});
   await p.locator('.prompt').waitFor({state:'visible'});await p.waitForTimeout(250);
   await p.screenshot({path:`design-research/screenshots/integration/followup-${phase}-${name}.png`});
   const hud=await p.locator('.hud').boundingBox();const pad=await p.locator('.dpad').boundingBox();const prompt=await p.locator('.prompt').boundingBox();const tools=await p.locator('.game-tools').boundingBox();
   const collisions={hudOverlapsMovement:intersects(hud,pad),promptOverlapsTools:intersects(prompt,tools),promptOverlapsHud:intersects(prompt,hud),hudOverlapsTools:intersects(hud,tools)};
   const box=await p.locator('[data-key="d"]').boundingBox();const start=await p.evaluate(()=>__review.world.getPos());
   // Real touch hold needs CDP (Chromium only). Other engines fall back to a held mouse press: same pointer events, pointerType mouse.
   if(process.env.BROWSER&&process.env.BROWSER!=='chromium'){await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up();}
   else{const session=await c.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await p.waitForTimeout(350);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   const moved=await p.evaluate(()=>__review.world.getPos());await p.waitForTimeout(200);const stopped=await p.evaluate(()=>__review.world.getPos());assert(moved.x>start.x);assert(Math.abs(stopped.x-moved.x)<0.3);
   await p.locator('.hud-party').evaluate(el=>{el.scrollTop=0;el.focus()});const beforeScroll=await p.evaluate(()=>__review.world.getPos());await p.keyboard.press('ArrowDown');await p.waitForTimeout(300);
   // Playwright WebKit does not run the default arrow-key scroll even on a bare scrollable div, so probe the engine first.
   let keyboardScrollNote='passed without moving player';
   if(!await p.locator('.hud-party').evaluate(el=>el.scrollTop>0)){const probe=await probeEngineScroll(p);if(probe){assert.fail('party must scroll with keyboard');}keyboardScrollNote='party scroll not asserted: this engine does not scroll on synthesized arrow keys (probe div also stayed at 0); player did not move';}assert.deepEqual(await p.evaluate(()=>__review.world.getPos()),beforeScroll,'scrolling party must not move the player');
   await p.locator('.hud-critter').last().scrollIntoViewIfNeeded();await p.screenshot({path:`design-research/screenshots/integration/followup-${phase}-${name}-party-bottom.png`});
   const audit=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await p.bringToFront();
   await p.locator('.guidebtn').tap();await p.keyboard.press('Shift+Tab');assert(await p.locator('.guide-return').evaluate(el=>el===document.activeElement));await p.keyboard.press('Tab');assert(await p.locator('.guide-close').evaluate(el=>el===document.activeElement));await p.keyboard.press('Escape');
   results.push({violations:audit.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),name,viewport:{width,height},...collisions,touchHoldAndRelease:'passed',guideFocusWrap:'passed',keyboardPartyScroll:keyboardScrollNote,lastPartyMember:'reachable',errors});await c.close();
  }
 }finally{await b.close();}
 fs.writeFileSync(`design-research/followup-${phase}.json`,JSON.stringify(results,null,2));console.log(results);
 for(const row of results){assert(!row.hudOverlapsMovement,`${row.name}: HUD covers movement controls`);assert(!row.promptOverlapsTools,`${row.name}: interaction prompt covered by game tools`);assert(!row.promptOverlapsHud,`${row.name}: interaction prompt overlaps HUD`);assert(!row.hudOverlapsTools,`${row.name}: HUD overlaps game tools`);assert.equal(row.errors.length,0);assert.equal(row.violations.length,0,`${row.name}: accessibility violations`);}
})().catch(e=>{console.error(e);process.exit(1)});
