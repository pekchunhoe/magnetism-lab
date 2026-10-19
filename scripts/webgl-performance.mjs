import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const tabs=['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector'];
const browser=await chromium.launch({headless:true});
const report={environment:'Chromium headless, 1536 × 1100, DPR 1, local Vite development server; 120 requestAnimationFrame intervals after warmup, sequential runs; WebGL High and Economy quality',results:[],stability:[],errors:[]};
await fs.mkdir('artifacts/webgl',{recursive:true});
for(const renderer of ['svg','webgl','webgl-economy']){
  const page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:5173/${renderer==='svg'?'?renderer=svg':''}`);
  if(renderer!=='svg'){await page.waitForSelector('[data-gl-stats][data-ready=true]',{state:'attached'});await page.getByRole('combobox',{name:'3D quality'}).selectOption(renderer==='webgl-economy'?'Economy':'High');report.gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});}
  for(const name of tabs){
    await page.getByRole('tab',{name,exact:true}).click();
    if(name==='Magnetic Fields')await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('solenoid');
    if(name==='Moving Charges')await page.getByRole('spinbutton',{name:'Launch angle to B value'}).fill('45');
    if(name==='Velocity Selector'){await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('positive');await page.getByRole('spinbutton',{name:'Particle mass value'}).fill('20');await page.getByLabel('Magnetic analyser',{exact:true}).check();}
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();await page.waitForTimeout(700);
    const timing=await page.evaluate(()=>new Promise(resolve=>{const values=[],longTasks=[];let last;const obs=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({type:'longtask'});const tick=now=>{if(last!==undefined)values.push(now-last);last=now;if(values.length<120)requestAnimationFrame(tick);else{obs.disconnect();const sorted=[...values].sort((a,b)=>a-b);resolve({fps:1000*values.length/values.reduce((a,b)=>a+b,0),medianMs:sorted[60],p95Ms:sorted[114],maxMs:sorted.at(-1),longTasks});}};requestAnimationFrame(tick);}));
    const diagnostics=renderer!=='svg'?await page.locator('[data-gl-stats]').evaluate(n=>({...n.dataset})):null;report.results.push({renderer,name,...timing,diagnostics});console.log(renderer,name,timing.fps.toFixed(1),'fps');await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  }
  if(renderer!=='svg'){
    for(let cycle=0;cycle<4;cycle++){for(const name of tabs)await page.getByRole('tab',{name,exact:true}).click();await page.getByRole('tab',{name:'Magnetic Fields',exact:true}).click();await page.getByRole('button',{name:'Play simulation',exact:true}).click();await page.waitForTimeout(600);report.stability.push({renderer,cycle,...await page.locator('[data-gl-stats]').evaluate(n=>({...n.dataset})),canvasCount:await page.locator('canvas').count(),overlayCount:await page.locator('.gl-overlay>div').count()});await page.getByRole('button',{name:'Pause simulation',exact:true}).click();}
  }
  await page.close();
}
await fs.writeFile('artifacts/webgl/performance.json',JSON.stringify(report,null,2));await browser.close();
if(report.errors.length)throw new Error(report.errors.join('\n'));
