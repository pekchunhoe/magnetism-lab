import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const folder='artifacts/selector-fix';
const phase=process.argv[2]==='before'?'before':'after';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  const state=page.locator('[data-motion="selector"]');
  await state.waitFor();
  await page.getByRole('button',{name:'Play simulation',exact:true}).click();
  await page.waitForTimeout(1300);
  await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  await page.waitForTimeout(150);
  const before=await state.evaluate(el=>({...el.dataset}));
  await page.getByRole('spinbutton',{name:'Particle speed value',exact:true}).fill('500');
  await page.waitForTimeout(200);
  const after=await state.evaluate(el=>({...el.dataset}));
  await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-desktop-3d-reproduction.png`});
  await page.getByRole('button',{name:'2D',exact:true}).click();
  await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-desktop-2d-reproduction.png`});
  await writeFile(`${folder}/${phase}-state.json`,JSON.stringify({before,after},null,2));
  console.log(JSON.stringify({before,after},null,2));
  if(phase==='after'){
    const cases=[
      {name:'valid-loops',particle:'proton',speed:300,field:80,electric:8,steps:30},
      {name:'electric-only',particle:'proton',speed:100,field:0,electric:8,steps:30},
      {name:'magnetic-only-electron',particle:'electron',speed:1000,field:1,electric:0,steps:30}
    ];
    for(const scenario of cases){
      await page.getByRole('button',{name:'3D',exact:true}).click();
      await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(scenario.particle);
      for(const [label,value] of [['Particle speed',scenario.speed],['Magnetic field',scenario.field],['Electric field',scenario.electric]])await page.getByRole('spinbutton',{name:label+' value',exact:true}).fill(String(value));
      for(let i=0;i<scenario.steps;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
      await page.getByRole('button',{name:'Front',exact:true}).click();
      await page.locator('.simulation-card').screenshot({path:`${folder}/after-3d-${scenario.name}.png`});
      const spatial=await state.evaluate(el=>({...el.dataset}));
      await page.getByRole('button',{name:'2D',exact:true}).click();
      const planar=await page.locator('[data-motion="selector"]').evaluate(el=>({...el.dataset}));
      if(spatial.position!==planar.position||spatial.velocity!==planar.velocity)throw new Error('Renderer state mismatch');
      await page.locator('.simulation-card').screenshot({path:`${folder}/after-2d-${scenario.name}.png`});
      await writeFile(`${folder}/after-${scenario.name}.json`,JSON.stringify({scenario,spatial,planar},null,2));
    }
  }
} finally {await browser.close();}
