import lighthouse from './tooling/node_modules/lighthouse/core/index.js';
import {launch} from './tooling/node_modules/chrome-launcher/dist/index.js';
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('/Users/elizabethstein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
for(const [name,port,round] of [['baseline',4185,1],['updated',4184,1],['updated',4184,2],['baseline',4185,2]]){
 const chrome=await launch({chromeFlags:['--headless','--mute-audio','--no-sandbox','--disable-dev-shm-usage']});
 try{
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);const page=await browser.contexts()[0].newPage();
  const url=`http://127.0.0.1:${port}/`;await page.goto(url);await page.locator('.starter').first().click();await page.locator('.title').waitFor({state:'detached'});await page.close();
  const {lhr}=await lighthouse(url,{port:chrome.port,disableStorageReset:true,output:'json',onlyCategories:['performance','accessibility','best-practices']});
  fs.writeFileSync(`design-research/gameplay-lighthouse-matched-${name}-${round}.json`,JSON.stringify(lhr,null,2));
  console.log(name,round,Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,v.score])),lhr.audits['total-blocking-time'].numericValue);
 }finally{await chrome.kill();}
}
