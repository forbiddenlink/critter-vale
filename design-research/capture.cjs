const { chromium } = require('./pw.cjs');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const phase = process.argv[2] || 'before';
 const log=[];
 for (const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]) {
  const context=await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>log.push({device,error:e.message}));
  await page.route('**/src/main.ts*',async route=>{
   const r=await route.fetch();
   await route.fulfill({response:r,body:(await r.text())+'\nwindow.__review={world,team,openShop,showInterior,showFaintScreen,showVictory,drawHud,makeCritter,openSummonLab,openFusionLab,onSummoned,onFused,seen,caughtIds};'});
  });
  await page.goto('http://127.0.0.1:5174');
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:`design-research/screenshots/${phase}/title-${device}.png`,fullPage:true});
  await page.locator('.starter').first().click(); await page.waitForTimeout(700);
  const shot=async(name)=>{await page.waitForTimeout(180);await page.screenshot({path:`design-research/screenshots/${phase}/${name}-${device}.png`,fullPage:true});};
  await shot('overworld');
  await page.locator('.dexbtn').click();await shot('dex');await page.keyboard.press('Escape');
  await page.evaluate(()=>{__review.world.active=false;__review.openShop()});await shot('shop');await page.locator('.io-close').click();
  for(const [kind,name,color] of [['home',"Tamer's Home",0xe8695f],['lab','Critter Lab',0x5b8fd8]]){
   await page.evaluate(({kind,name,color})=>{__review.world.active=false;__review.showInterior({kind,name,color})},{kind,name,color});await shot(kind);await page.locator('.io-close').click();
  }
  await page.evaluate(()=>__review.openSummonLab(()=>{}));await shot('summon');await page.locator('.summon-go').click();await shot('summon-error');await page.keyboard.press('Escape');
  await page.evaluate(()=>__review.openFusionLab({party:__review.team,sprigs:120,cost:80,onFused:()=>{}}));await shot('fusion-empty');await page.keyboard.press('Escape');
  await page.evaluate(()=>__review.openFusionLab({party:[...__review.team,__review.makeCritter('tadmite',6)],sprigs:120,cost:80,onFused:()=>{}}));await shot('fusion');await page.keyboard.press('Escape');
  await page.evaluate(()=>__review.world.onInteract({name:'Prof. Hollis',lines:['Welcome to Sprout Hollow, tamer. Your adventure starts here.']}));await shot('dialog');await page.keyboard.press('Space');
  await page.evaluate(async()=>{__review.world.active=false;const {runBattle}=await import('/src/ui/battleUI.ts');runBattle(__review.team,[__review.makeCritter('leaflet',5)],()=>{}, {bag:{'dew-potion':2,'vale-ball':4}})});await page.waitForTimeout(700);await shot('battle');
  await page.locator('#bag').click();await shot('battle-bag');await page.locator('.sw-cancel').click();
  await page.evaluate(()=>__review.showFaintScreen(()=>{}));await shot('faint');await page.locator('.faint-btn').click();
  await page.evaluate(()=>__review.showVictory());await shot('victory');
  await context.close();
 }
 fs.writeFileSync(`design-research/${phase}-capture-log.json`,JSON.stringify(log,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
