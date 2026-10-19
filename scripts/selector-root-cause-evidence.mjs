import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase=process.argv[2]||'after',folder='artifacts/selector-root-cause';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch();
const evidence=[];
try {
  const page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  for(const dimension of ['2D','3D']) {
    await page.getByRole('button',{name:dimension,exact:true}).click();
    if(dimension==='3D')await page.getByRole('button',{name:'Front',exact:true}).click();
    for(const [name,speed,particle,field,electric] of [
      ['below',50,'proton',80,8],['selected',100,'proton',80,8],['above',150,'proton',80,8],
      ['negative-above',150,'negative',80,8],['loops',300,'proton',80,8],
      ['electric-only',100,'proton',0,8],['magnetic-only',100,'proton',80,0],
      ['entrance-wall',1,'proton',0,40],['zero-force',100,'proton',0,0],
    ]) {
      await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
      await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(particle);
      for(const [label,value] of [['Particle speed',speed],['Magnetic field',field],['Electric field',electric]])
        await page.getByRole('spinbutton',{name:label+' value',exact:true}).fill(String(value));
      const initial=await page.locator('[data-motion="selector"]').evaluate(el=>({...el.dataset}));
      await page.getByRole('button',{name:'Play simulation',exact:true}).click();
      const frames=await page.evaluate(()=>new Promise(resolve=>{
        const frames=[],start=performance.now();let held=0;
        function capture(){const el=document.querySelector('[data-motion="selector"]');
          const frame={wall:performance.now()-start,...el.dataset};frames.push(frame);
          held=frame.complete==='true'?held+1:0;
          if(held>=12||performance.now()-start>14000)resolve(frames);else requestAnimationFrame(capture);
        }requestAnimationFrame(capture);
      }));
      await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-${dimension}-${name}.png`});
      evidence.push({dimension,name,parameters:{speed:speed*1000,field:field/1000,electric:electric*1000,particle},initial,frames});
    }
  }
  await writeFile(`${folder}/${phase}-frames.json`,JSON.stringify({errors,evidence},null,2));
  const numerical=await page.evaluate(async()=>{
    const {selectorState,defaults,vec,cross,add,scale}=await import('/src/lib/physics/magnetism/core.ts');
    const rows=[];let maxPositionError=0,maxVelocityError=0,maxAccelerationError=0;
    for(const [name,speed,charge] of [['A',1,1],['B',1.5,1],['C',.5,1],['D',1.5,-1]]){
      const p={...defaults('selector'),speed,charge,mass:1,electric:1,field:1},t=Math.PI/2,s=selectorState(p,t),h=1e-5;
      const acceleration=scale(add(selectorState(p,t+h).velocity,scale(selectorState(p,t-h).velocity,-1)),1/(2*h));
      rows.push({name,parameters:p,time:t,...s,acceleration});
      for(let i=0;i<=1000;i++){
        const t=i/1000*6*Math.PI,w=charge,dv=speed-1,s=selectorState(p,t);
        const position=vec(t+dv*Math.sin(w*t)/w,dv*(1-Math.cos(w*t))/w),velocity=vec(1+dv*Math.cos(w*t),dv*Math.sin(w*t));
        maxPositionError=Math.max(maxPositionError,...['x','y'].map(k=>Math.abs(s.position[k]-position[k])));
        maxVelocityError=Math.max(maxVelocityError,...['x','y'].map(k=>Math.abs(s.velocity[k]-velocity[k])));
        const derivative=scale(add(selectorState(p,t+h).velocity,scale(selectorState(p,t-h).velocity,-1)),1/(2*h));
        const expected=scale(add(vec(0,-1),cross(s.velocity,vec(0,0,-1))),charge);
        maxAccelerationError=Math.max(maxAccelerationError,...['x','y'].map(k=>Math.abs(derivative[k]-expected[k])));
      }
    }
    return {rows,maxPositionError,maxVelocityError,maxAccelerationError};
  });
  await writeFile(`${folder}/${phase}-numerical.json`,JSON.stringify(numerical,null,2));
  console.log(JSON.stringify({phase,errors,cases:evidence.map(e=>({dimension:e.dimension,name:e.name,frames:e.frames.length,complete:e.frames.at(-1).complete,position:JSON.parse(e.frames.at(-1).position)}))}));
} finally {await browser.close();}
