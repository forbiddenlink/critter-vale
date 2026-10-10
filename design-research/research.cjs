const {chromium}=require('./pw.cjs');
const fs=require('fs');
const sources=[
 ['bruno','https://www.awwwards.com/sites/bruno-simon-portfolio'],
 ['kepler','https://www.siteinspire.com/website/11541-kepler-interactive'],
 ['annapurna','https://www.siteinspire.com/website/11459-annapurna'],
 ['goodfit','https://www.siteinspire.com/website/10503-goodfit'],
 ['lepuzz','https://www.siteinspire.com/website/10463-le-puzz'],
 ['interface','https://www.siteinspire.com/website/9438-interface-in-game'],
 ['toca','https://www.siteinspire.com/website/5288-toca-boca'],
 ['memory','https://www.siteinspire.com/website/5421-read-only-memory'],
 ['fieldwork','https://land-book.com/websites/100496-fieldwork-where-inner-work-meets-outer-exploration'],
 ['nossara','https://land-book.com/websites/100924-nossara-imabari-towels-made-in-japan'],
 ['exemplar','https://land-book.com/websites/100501-exemplar-a-new-typeface-by-letters-from-sweden'],
 ['tekt','https://land-book.com/websites/100499-modular-reimagined-tekt'],
 ['godly','https://godly.website']];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
for(let i=0;i<sources.length;i+=3){await Promise.all(sources.slice(i,i+3).map(async([id,url])=>{const page=await browser.newPage({viewport:{width:1440,height:960}});const rec={id,source:url};try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(1000);rec.title=await page.title();rec.links=await page.locator('a').evaluateAll(a=>a.map(x=>({text:x.textContent.trim().slice(0,100),url:x.href})).filter(x=>x.url.startsWith('http')));fs.writeFileSync(`design-research/${id}-source.txt`,await page.locator('body').innerText());}catch(e){rec.error=e.message}records.push(rec);await page.close()}));}
fs.writeFileSync('design-research/source-index.json',JSON.stringify(records,null,2));await browser.close();})()
