import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const require = createRequire('C:/Users/HML/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({headless:true, executablePath:'C:/Users/HML/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const page = await browser.newPage({viewport:{width:1200,height:1500}});
page.on('pageerror', e => console.log('ERROR',e.message));
for (const file of process.argv.slice(2)) {
  await page.goto(pathToFileURL(`${process.cwd()}/${file}`).href);
  await page.waitForFunction(() => !document.querySelector('#__bundler_loading'));
  const name = file.replaceAll(/[\\/.]/g, '-');
  await page.locator('#a4c').screenshot({path:`tmp/${name}.png`});
  fs.writeFileSync(`tmp/${name}-dom.html`,await page.content());
  console.log(file, await page.evaluate(() => {
    const svg=document.querySelector('#treeSvg'), leaves=[...document.querySelectorAll('.project-chip')];
    if (!svg) return {title:document.title};
    const outside=[];
    [...document.querySelectorAll('.project-card')].forEach((card,i)=>{
      const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const text=walker.currentNode; if(!text.textContent.trim())continue;
        const range=document.createRange();range.selectNodeContents(text);
        for(const box of range.getClientRects()) for(const [x,y] of [[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom]]) {
          const point=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());
          if(!leaves[i].isPointInFill(point))outside.push({text:text.textContent,point:{x:point.x,y:point.y},leaf:i});
        }
      }
    });
    return {title:document.title,labels:svg.querySelectorAll('.skill-label').length,outside:outside.slice(0,20),outsideCount:outside.length};
  }));
}
await browser.close();
