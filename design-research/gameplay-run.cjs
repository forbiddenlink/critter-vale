// Fresh-save play audit. Instrumentation reads state; all gameplay writes use browser inputs.
const {chromium}=require('./pw.cjs');
const fs=require('node:fs');
const base=process.env.REVIEW_URL||'http://127.0.0.1:5184';
(async()=>{
 const previous=process.env.RESUME==='1'?JSON.parse(fs.readFileSync('design-research/gameplay-run.json')):null;
 const resume=previous?JSON.parse(fs.readFileSync('design-research/gameplay-run-save.json')):null;
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const p=await context.newPage();const started=Date.now()-(previous?.events.at(-1)?.seconds||0)*1000;const events=previous?.events||[];const errors=[];let battleCount=events.filter(e=>e.kind==='battle-start').length;let turns=events.filter(e=>e.kind==='battle-end').at(-1)?.turns||0;let catches=0;let goal='Bex';let requiredLevel=8;let failures={};
 const record=async(kind,data={})=>{const state=await p.evaluate(()=>__audit.state());const row={seconds:Math.round((Date.now()-started)/1000),kind,...data,state};events.push(row);fs.writeFileSync('design-research/gameplay-run.json',JSON.stringify({method:'Fresh isolated browser save. Normal RNG, stats, XP, currency, movement and battle timers. Source instrumentation reads state only; navigation uses known coordinates and combat uses available moves. No paid API calls.',events,errors},null,2));fs.writeFileSync('design-research/gameplay-run-save.json',JSON.stringify(state.save,null,2));console.log(JSON.stringify({kind,seconds:row.seconds,battles:battleCount,turns,party:state.team.map(m=>`${m.id} ${m.level} ${m.hp}/${m.maxHp}`),crests:state.save?.crests,...data}));};
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/summon*',route=>route.abort());
 await p.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+'\nwindow.__audit={state:()=>({pos:world.getPos(),team:team.map(m=>({id:m.species.id,element:m.species.element,level:m.level,hp:m.hp,maxHp:m.maxHp,xp:m.xp,quirk:m.quirk})),save:JSON.parse(localStorage.getItem("critter-vale-save-v1"))})};'});});
 const battleRead=()=>p.evaluate(()=>{const hp=side=>({hp:Number(document.querySelector('.'+side+' .hpbar').getAttribute('aria-valuenow')),maxHp:Number(document.querySelector('.'+side+' .hpbar').getAttribute('aria-valuemax')),id:document.querySelector('.'+side+' .mon').getAttribute('src').split('/').pop().replace('.png',''),element:document.querySelector('.'+side+' .nameplate').textContent.match(/Ember|Aqua|Leaf/)[0]});const title=document.querySelector('.battle-heading h2').textContent;return {active:hp('ally'),foe:hp('foe'),trainer:title.startsWith('Trial')?title:null};});
 if(resume)await context.addInitScript(save=>localStorage.setItem('critter-vale-save-v1',JSON.stringify(save)),resume);
 await p.goto(base);await p.waitForLoadState('networkidle');await p.screenshot({path:previous?`design-research/screenshots/gameplay/resume-${events.length}.png`:'design-research/screenshots/gameplay/01-title.png'});if(await p.locator('.starter').count()){await p.locator('.starter[data-id="emberpup"]').click();await record('starter');}else await record('resume-natural-save');
 const release=async()=>{for(const k of ['w','a','s','d'])await p.keyboard.up(k);};
 const has=sel=>p.locator(sel).count();
 async function walk(x,z){
  for(let i=0;i<160;i++){
   if(await has('.battle,.dialog,.faint,.victory')){await release();return false;}
   const pos=await p.evaluate(()=>__audit.state().pos);const dx=x-pos.x,dz=z-pos.z;
   if(Math.hypot(dx,dz)<.7){await release();return true;}
   const key=Math.abs(dx)>Math.abs(dz)?dx>0?'d':'a':dz>0?'s':'w';
   await p.keyboard.down(key);await p.waitForTimeout(Math.min(170,Math.max(40,Math.max(Math.abs(dx),Math.abs(dz))/9*1000)));await p.keyboard.up(key);
  }
  throw Error('Navigation stalled');
 }
 const target={Bex:[4,-6],Fern:[-14,14],Pyra:[-14,-12],Marlow:[16,8],Sol:[0,-16]};
 let grassEnd=false;let healing=false;let currentBattle=false;let shots=0;
 while(Date.now()-started<45*60*1000){
  if(await has('.victory')){await p.screenshot({path:'design-research/screenshots/gameplay/champion.png'});await p.locator('.victory-btn').click();await record('champion-complete',{battleCount,turns,catches});break;}
  if(await has('.faint')){failures[goal]=(failures[goal]||0)+1;requiredLevel=Math.max(requiredLevel,(await p.evaluate(()=>__audit.state())).team[0].level+1);await record('whiteout',{goal,requiredLevel});await p.screenshot({path:`design-research/screenshots/gameplay/whiteout-${battleCount}.png`});await p.locator('.faint-btn').click();healing=false;continue;}
  if(await has('.dialog')){await p.keyboard.press('Space');await p.waitForTimeout(80);continue;}
  if(await has('.battle')){
   if(!currentBattle){currentBattle=true;battleCount++;shots=0;await record('battle-start',{battle:await battleRead()});if(battleCount<=3||(await battleRead()).trainer)await p.screenshot({path:`design-research/screenshots/gameplay/battle-${battleCount}.png`});}
   if(await has('.switch-menu')){
    const choices=p.locator('.switch-menu button[data-i]:not(.sw-cancel)');if(await choices.count()){const st=await p.evaluate(()=>__audit.state());const foe=(await battleRead()).foe;const beats={Ember:'Leaf',Leaf:'Aqua',Aqua:'Ember'};const counter=st.team.findIndex(m=>m.hp>0&&beats[m.element]===foe.element);const preferred=p.locator(`.switch-menu [data-i="${counter}"]`);await (counter>=0&&await preferred.count()?preferred:choices.first()).click();await p.waitForTimeout(100);continue;}
   }
   const moves=p.locator('.move');if(!await moves.first().isEnabled({timeout:250}).catch(()=>false)){await p.waitForTimeout(150);continue;}
   const b=await battleRead();const st=await p.evaluate(()=>__audit.state());
   const wantsCatch=!b.trainer&&st.team.length<4&&!st.team.some(m=>m.element===b.foe.element);
   const beats={Ember:'Leaf',Leaf:'Aqua',Aqua:'Ember'};
   if(beats[b.active.element]!==b.foe.element){
    const counter=st.team.findIndex(m=>m.hp>m.maxHp*.35&&beats[m.element]===b.foe.element);
    if(counter>=0&&await p.locator('#switch').isVisible()&&await p.locator('#switch').isEnabled()){await p.locator('#switch').click();await p.locator(`.switch-menu [data-i="${counter}"]`).click();turns++;continue;}
    if(!b.trainer&&counter<0){await p.locator('#run').click();await p.waitForTimeout(250);continue;}
   }
   const balls=(st.save?.bag?.['vale-ball']||0);
   if(wantsCatch&&balls>0&&b.foe.hp/b.foe.maxHp<=.42&&shots<5){await p.locator('#bag').click();await p.locator('[data-id="vale-ball"]').click();shots++;catches++;}
   else if(b.active.hp/b.active.maxHp<.5&&b.trainer&&await p.locator('#bag').isVisible()&&(st.save?.bag?.['dew-potion']||0)>0){await p.locator('#bag').click();await p.locator('[data-id="dew-potion"]').click();}
   else if(b.trainer&&st.team.some(m=>m.hp===0)&&await p.locator('#bag').isVisible()&&(st.save?.bag?.revive||0)>0){await p.locator('#bag').click();await p.locator('[data-id="revive"]').click();await p.locator('.switch-menu button[data-i]:not(.sw-cancel)').first().click();}
   else {const own=await moves.first().innerText();await moves.nth(own.includes('Resisted')?1:0).click();}
   turns++;await p.waitForTimeout(160);continue;
  }
  if(currentBattle){currentBattle=false;await record('battle-end',{turns});await p.waitForTimeout(100);}
  const state=await p.evaluate(()=>__audit.state());
  if(state.save?.champion){await record('champion-complete',{battleCount,turns,catches});break;}
  if(state.team.some(m=>m.hp<m.maxHp*.6))healing=true;
  if(healing){if(await walk(-10,1)&&await walk(-10,5)){healing=false;await record('healer-visit');}continue;}
  const beaten=state.save?.beaten||[];
  if(!beaten.includes('Ranger Bex'))goal=state.team[0].level<requiredLevel?'train':'Bex';
  else if(state.team[0].level<Math.max(12,requiredLevel))goal='train';
  else if(!state.save.crests.includes('Leaf'))goal='Fern';
  else if(!state.save.crests.includes('Ember'))goal='Pyra';
  else if(!state.save.crests.includes('Aqua'))goal='Marlow';else goal='Sol';
  if(goal==='Sol'&&((state.save.bag?.['dew-potion']||0)<3||(state.save.bag?.revive||0)<2)&&state.save.sprigs>=60){if(await walk(-6,14.75)){await p.keyboard.press('e');for(const [id,count] of [['dew-potion',3],['revive',2]]){const n=state.save.bag?.[id]||0;for(let i=n;i<count;i++){const buy=p.locator(`.shop-buy[data-id="${id}"]`);if(await buy.count()&&await buy.isEnabled())await buy.click();}}await p.keyboard.press('Escape');await record('restocked-champion-medicine');}continue;}
  if((state.save?.bag?.['vale-ball']||0)<2&&state.team.length<3&&(state.save?.sprigs||0)>=80){
   if(await walk(-6,14.75)){await p.keyboard.press('e');if(await p.locator('.shop-buy[data-id="vale-ball"]').count()){for(let n=0;n<3;n++){const buy=p.locator('.shop-buy[data-id="vale-ball"]');if(await buy.isEnabled())await buy.click();}await p.keyboard.press('Escape');await record('restocked-balls');}}continue;
  }
  if(goal==='train'){
   if(await walk(-10,grassEnd?14:9))grassEnd=!grassEnd;
  }else{
   if(await walk(...target[goal])){await p.keyboard.press('e');await p.waitForTimeout(150);}
  }
 }
 await release();await record('run-ended',{battleCount,turns,catches,goal});await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
