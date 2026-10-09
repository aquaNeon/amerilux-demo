import puppeteer from 'puppeteer-core';
const [,, url, out, w='1800', h='1200'] = process.argv;
const b = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage(); await p.setViewport({width:+w,height:+h,deviceScaleFactor:+(process.env.DPR||1)});
p.on('console',m=>console.log('[page]',m.text())); p.on('pageerror',e=>console.log('[err]',e.message));
await p.goto(url,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,+(process.env.WAIT||1500)));
if (process.env.GO) { await p.evaluate(i=>document.querySelector('[data-amx-root]').amerilux.go(+i), process.env.GO); await new Promise(r=>setTimeout(r,+(process.env.SETTLE||2200))); }
if (process.env.CLIP) { const [x,y,w,h]=process.env.CLIP.split(',').map(Number); await p.screenshot({path:out,clip:{x,y,width:w,height:h}}); await b.close(); process.exit(0); }
await p.screenshot({path:out}); await b.close();
