import lighthouse from './tooling/node_modules/lighthouse/core/index.js';
import {launch} from './tooling/node_modules/chrome-launcher/dist/index.js';
import desktopConfig from './tooling/node_modules/lighthouse/core/config/desktop-config.js';
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('/Users/elizabethstein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const chrome=await launch({chromeFlags:['--headless','--mute-audio','--no-sandbox','--disable-dev-shm-usage']});
try{const browser=await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);const page=await browser.contexts()[0].newPage();await page.goto('http://127.0.0.1:4184');await page.locator('.starter').first().click();await page.locator('.title').waitFor({state:'detached'});
for(const device of ['mobile','desktop']){const {lhr,report}=await lighthouse('http://127.0.0.1:4184/',{port:chrome.port,disableStorageReset:true,output:['json','html'],onlyCategories:['performance','accessibility','best-practices']},device==='desktop'?desktopConfig:undefined);fs.writeFileSync(`design-research/gameplay-lighthouse-overworld-${device}.json`,report[0]);fs.writeFileSync(`design-research/gameplay-lighthouse-overworld-${device}.html`,report[1]);console.log(device,Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,v.score])));}
}finally{await chrome.kill()}
