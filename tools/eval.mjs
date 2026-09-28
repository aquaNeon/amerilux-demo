import puppeteer from 'puppeteer-core';
const [,, url, expr] = process.argv;
const b = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1512,height:940});
p.on('pageerror',e=>console.log('[err]',e.message));
await p.goto(url,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,2500));
console.log(await p.evaluate(expr)); await b.close();
