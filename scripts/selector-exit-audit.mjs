import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase=process.argv[2]||'after',folder=process.argv[3]||'artifacts/selector-exit-audit';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.LAB_URL||'http://127.0.0.1:5173');
  await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  await page.getByRole('button',{name:'3D',exact:true}).click();
  await page.getByRole('button',{name:'Perspective',exact:true}).click();
  const rows=[];
  for(const speed of [100,150,200,240]){
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('spinbutton',{name:'Particle speed value',exact:true}).fill(String(speed));
    await page.getByLabel('Trail',{exact:true}).check();
    const numerical=await page.evaluate(async(speed)=>{
      const {defaults,selectorState}=await import('/src/lib/physics/magnetism/core.ts');
      const {selectorTrajectory,SELECTOR}=await import('/src/lib/physics/magnetism/trajectories.ts');
      const {selectorResult}=await import('/src/lib/physics/magnetism/visualization.ts');
      const p={...defaults('selector'),speed:speed*1000},beam=selectorTrajectory(p);
      const w=p.charge*p.field/p.mass,vs=p.electric/p.field,dv=p.speed-vs,T=2*Math.PI/w;
      // Independent textbook formula and first-forward crossing search.
      const exact=t=>({position:{x:SELECTOR.entrance+vs*t+dv*Math.sin(w*t)/w,y:dv*(1-Math.cos(w*t))/w,z:0},velocity:{x:vs+dv*Math.cos(w*t),y:dv*Math.sin(w*t),z:0}});
      let lo=0,hi=T/1000;
      while(exact(hi).position.x<SELECTOR.exit){lo=hi;hi+=T/1000;}
      for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(exact(mid).position.x>=SELECTOR.exit)hi=mid;else lo=mid;}
      const fieldExit=exact(hi),vx=fieldExit.velocity.x,vy=fieldExit.velocity.y;
      const planes=[SELECTOR.slitX-SELECTOR.wallThickness/2,SELECTOR.slitX,SELECTOR.slitX+SELECTOR.wallThickness/2,.24].map(x=>({x,y:fieldExit.position.y+(x-SELECTOR.exit)*vy/vx,z:0,time:hi+(x-SELECTOR.exit)/vx}));
      const samples=Array.from({length:17},(_,i)=>{const t=hi*i/16;return {time:t,analytical:exact(t),numerical:selectorState(p,t)};});
      return {speed:p.speed,selectedVelocity:vs,entryForce:p.charge*(p.speed*p.field-p.electric),T,drift:vs*T,geometry:SELECTOR,parameters:p,fieldExit:{time:hi,...fieldExit},planes,angleDegrees:Math.atan2(vy,vx)*180/Math.PI,minimumClearance:SELECTOR.slitHalfHeight-Math.max(...planes.slice(0,3).map(s=>Math.abs(s.y))),beam:{passes:beam.passes,termination:beam.termination,duration:beam.duration,selectorEnd:beam.selectorEnd,gap:beam.samples.find(s=>s.stage==='gap'),end:beam.samples.at(-1),status:selectorResult(beam)},samples};
    },speed);
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    await page.locator('[data-motion="selector"]').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.querySelector('[data-motion="selector"]')?.dataset.complete==='true',null,{timeout:20000});
    const frames=[];
    for(const dimension of ['3D','2D']){
      await page.getByRole('button',{name:dimension,exact:true}).click();
      await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-${speed}-${dimension}.png`});
      frames.push({dimension,state:await page.locator('[data-motion="selector"]').evaluate(el=>({...el.dataset}))});
    }
    await page.getByRole('button',{name:'3D',exact:true}).click();
    rows.push({...numerical,frames});
  }
  await writeFile(`${folder}/${phase}.json`,JSON.stringify({phase,errors,rows},null,2));
  console.log(JSON.stringify({phase,errors,rows:rows.map(({speed,fieldExit,planes,minimumClearance,angleDegrees,beam})=>({speed,fieldExit,planes,minimumClearance,angleDegrees,beam}))},null,2));
} finally {await browser.close();}
