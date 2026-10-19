import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const out=process.env.AUDIT_OUTPUT||'artifacts/browser-audit';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1536,height:1100},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const response=await page.goto(process.env.LAB_URL||'http://127.0.0.1:5173/');
const results={url:page.url(),status:response.status(),screens:[],accessibility:[],errors};
const names=['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector'];
for(const [device,width,height] of [['desktop',1536,1100],['tablet',820,1180],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  for(const name of names){
    await page.getByRole('tab',{name,exact:true}).click();
    for(const dimension of ['2D','3D']){
      await page.getByRole('button',{name:dimension,exact:true}).click();
      await page.evaluate(()=>document.fonts.ready);
      const slug=name.toLowerCase().replaceAll(' ','-');
      const screenshot=`${out}/${device}-${slug}-${dimension}.png`;
      await page.screenshot({path:screenshot,fullPage:true});
      await page.locator('.simulation-card').screenshot({path:`${out}/${device}-${slug}-${dimension}-scene.png`});
      const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,invalidSvg:[...document.querySelectorAll('.simulation-scene path,.graph path')].filter(p=>/NaN|Infinity/.test(p.getAttribute('d')||'')).length,clipped:[...document.querySelectorAll('.readout strong,.formula,.control-title,.graph-value')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))}));
      results.screens.push({device,name,dimension,screenshot,...layout});
    }
    if(device==='desktop'){
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      results.accessibility.push({name,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))});
    }
  }
}
await page.setViewportSize({width:1536,height:1100});
await page.getByRole('tab',{name:'Magnetic Fields',exact:true}).click();
for(const source of ['bar','wire','coil','solenoid','earth']){
  await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption(source);
  for(const mode of ['2D','3D']){await page.getByRole('button',{name:mode,exact:true}).click();await page.locator('.simulation-card').screenshot({path:`${out}/source-${source}-${mode}.png`});}
}
await page.getByRole('tab',{name:'Moving Charges',exact:true}).click();
for(const [variant,angle] of [['parallel',0],['helix',45],['antiparallel',180]]){
  await page.getByRole('spinbutton',{name:'Launch angle to B value'}).fill(String(angle));
  for(const mode of ['2D','3D']){await page.getByRole('button',{name:mode,exact:true}).click();await page.locator('.simulation-card').screenshot({path:`${out}/charge-${variant}-${mode}.png`});}
}
await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('positive');
await page.getByRole('spinbutton',{name:'Particle mass value'}).fill('20');await page.getByLabel('Magnetic analyser',{exact:true}).check();
for(const mode of ['2D','3D']){await page.getByRole('button',{name:mode,exact:true}).click();await page.locator('.simulation-card').screenshot({path:`${out}/selector-analyser-${mode}.png`});}
await fs.writeFile(`${out}/baseline.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({status:results.status,screens:results.screens.length,overflow:results.screens.filter(s=>s.scrollWidth>s.width),clipped:results.screens.filter(s=>s.clipped.length),axe:results.accessibility.map(a=>({name:a.name,violations:a.violations.map(v=>({id:v.id,count:v.nodes.length}))})),errors},null,2));
await browser.close();
