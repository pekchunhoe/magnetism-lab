import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const root='artifacts/browser-audit',names=['magnetic-fields','resultant-fields','moving-charges','motor-effect','parallel-wires','velocity-selector'];
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1800,height:1100}});
for(const device of ['desktop','tablet','mobile'])for(const mode of ['2D','3D']){
  const tiles=[];for(const name of names){const data=(await fs.readFile(`${root}/${device}-${name}-${mode}-scene.png`)).toString('base64');tiles.push(`<section><p>${device} / ${name} / ${mode}</p><img src="data:image/png;base64,${data}"></section>`);}
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#0b1018;color:#d8e1ed;display:grid;grid-template-columns:repeat(3,600px);font:13px sans-serif}section{height:550px;padding:10px}p{margin:0 0 10px}img{width:580px;height:510px;object-fit:contain;object-position:top}</style>${tiles.join('')}`);
  await page.screenshot({path:`${root}/${device}-${mode}-contact.png`,fullPage:true});
}
await browser.close();
