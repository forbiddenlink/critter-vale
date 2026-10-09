const {chromium}=require('/Users/elizabethstein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.REVIEW_URL||'http://127.0.0.1:5184';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const results=[];try{
for(const test of ['escape-trainer','capture-xp','accurate-healing','choose-lead']){
const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await c.newPage();
await p.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+'\nwindow.__regression={world,team,makeCritter,drawHud,persist};'});});
try{await p.goto(base);await p.locator('.starter').first().click();await p.locator('.title').waitFor({state:'detached'});
if(test==='escape-trainer'){
await p.evaluate(()=>__regression.world.onInteract({name:'Test Trainer',lines:['Ready to battle?'],challenge:{party:[{id:'mothbit',level:5}],winLine:'Good battle.'}}));await p.keyboard.press('Escape');await p.waitForTimeout(200);assert.equal(await p.locator('.battle').count(),0,'Escape should leave a trainer conversation without starting combat');
}else if(test==='choose-lead'){
await p.evaluate(()=>{__regression.team.push(__regression.makeCritter('tadmite',6,'none'));__regression.drawHud()});
assert.equal(await p.locator('.party-lead[data-index="1"]').count(),1,'A healthy partner needs a way to become the starting critter before a trial');await p.locator('.party-lead[data-index="1"]').click();assert.equal(await p.evaluate(()=>__regression.team[0].species.id),'tadmite');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('critter-vale-save-v1')).team[0].id),'tadmite');
}else{
await p.evaluate(async test=>{const {runBattle}=await import('/src/ui/battleUI.ts');__regression.world.active=false;window.__party=[__regression.makeCritter('emberpup',6,'none')];if(test==='capture-xp')Math.random=()=>0;else __party[0].hp-=5;window.__beforeXp=__party[0].xp;runBattle(__party,[__regression.makeCritter('mothbit',6,'none')],outcome=>window.__outcome=outcome,{bag:{'vale-ball':1,'dew-potion':1}});},test);
await p.locator('#bag').click();await p.locator(test==='capture-xp'?'[data-id="vale-ball"]':'[data-id="dew-potion"]').click();
if(test==='capture-xp'){await p.locator('.battle').waitFor({state:'detached'});assert.equal(await p.evaluate(()=>__outcome),'caught');assert(await p.evaluate(()=>__party[0].xp>__beforeXp),'A successful capture should award XP');}
else{assert.equal(await p.locator('#log').innerText(),'Emberpup recovered 5 HP!','Healing feedback must report the HP actually restored');}
}
results.push({test,status:'passed'});
}catch(e){results.push({test,status:'failed',message:e.message});await p.screenshot({path:`design-research/screenshots/gameplay/regression-${process.argv[2]||'before'}-${test}.png`,fullPage:true});}
await c.close();}
}finally{await b.close()}
fs.writeFileSync(`design-research/gameplay-regressions-${process.argv[2]||'before'}.json`,JSON.stringify(results,null,2));console.log(results);assert(results.every(r=>r.status==='passed'),'Playability regressions remain');})().catch(e=>{console.error(e.message);process.exitCode=1});
