import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1536,height:1100},reducedMotion:'reduce'}),page=await context.newPage();
await page.goto(process.env.LAB_URL||'http://127.0.0.1:5173/');
const results=[];
for(const name of ['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector']){
  await page.getByRole('tab',{name,exact:true}).click();
  if(name==='Magnetic Fields')await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('solenoid');
  await page.getByRole('button',{name:'Play simulation'}).click();
  const metrics=await page.evaluate(()=>new Promise(resolve=>{
    let previous=performance.now(),count=0;const deltas=[],longTasks=[];
    const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask',buffered:false});
    const tick=now=>{if(count>8)deltas.push(now-previous);previous=now;if(++count<100)requestAnimationFrame(tick);else{observer.disconnect();const sorted=[...deltas].sort((a,b)=>a-b);resolve({fps:1000/(deltas.reduce((a,b)=>a+b,0)/deltas.length),medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...deltas),longTasks});}};
    requestAnimationFrame(tick);
  }));
  await page.getByRole('button',{name:'Pause simulation'}).click();results.push({name,...metrics});
}
await fs.writeFile('artifacts/browser-audit/performance.json',JSON.stringify({environment:'Chromium headless; desktop 1536×1100; Vite development server; ~90 measured frames after warmup per scene',results},null,2));
console.log(JSON.stringify(results,null,2));await browser.close();
