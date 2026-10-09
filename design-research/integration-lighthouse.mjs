import lighthouse from './tooling/node_modules/lighthouse/core/index.js';
import {launch} from './tooling/node_modules/chrome-launcher/dist/index.js';
import fs from 'node:fs';
import desktopConfig from './tooling/node_modules/lighthouse/core/config/desktop-config.js';
const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of ['mobile','desktop']){
  const {lhr,report}=await lighthouse('http://127.0.0.1:4184/',{port:chrome.port,output:['json','html'],onlyCategories:['performance','accessibility','best-practices','seo']},device==='desktop'?desktopConfig:undefined);
  fs.writeFileSync(`design-research/integration-lighthouse-${device}.json`,report[0]);fs.writeFileSync(`design-research/integration-lighthouse-${device}.html`,report[1]);
  console.log(device,JSON.stringify({scores:Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,v.score])),metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift'].map(k=>[k,lhr.audits[k].displayValue])),failures:Object.values(lhr.audits).filter(a=>a.score!==null&&a.score<1&&a.details?.type==='table').map(a=>({id:a.id,title:a.title,display:a.displayValue}))}));
 }
}finally{await chrome.kill();}
