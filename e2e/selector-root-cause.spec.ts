import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const folder='artifacts/selector-root-cause';
const state=(page:Page)=>page.locator('[data-motion="selector"]');
const read=(page:Page)=>state(page).evaluate(el=>({...((el as HTMLElement).dataset)}));
const set=(page:Page,label:string,value:number)=>page.getByRole('spinbutton',{name:label+' value',exact:true}).fill(String(value));

for(const device of ['desktop','mobile'])for(const theme of ['dark','light'])
  test(`selector independent reference, full flights and visibility: ${device} ${theme}`,async({page})=>{
    test.setTimeout(180000);await mkdir(folder,{recursive:true});
    await page.setViewportSize(device==='desktop'?{width:1536,height:1100}:{width:390,height:844});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
    if(theme==='light')await page.getByRole('button',{name:'Switch color theme',exact:true}).click();
    const cases=[];
    for(const [name,speed,particle] of [['below',50,'proton'],['selected',100,'proton'],['above',150,'proton'],['negative-above',150,'negative']] as const){
      await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
      await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(particle);
      await set(page,'Particle speed',speed);
      // One small step, paused: compare position AND velocity to a separately
      // written closed-form reference rather than importing application physics.
      await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
      const start=await read(page),t=Number(start.time),q=(particle==='negative'?-1:1)*1.602176634e-19,m=1.67262192369e-27;
      const w=q*.08/m,dv=speed*1000-100000;
      const expectedPosition={x:-.28+100000*t+dv*Math.sin(w*t)/w,y:dv*(1-Math.cos(w*t))/w,z:0};
      const expectedVelocity={x:100000+dv*Math.cos(w*t),y:dv*Math.sin(w*t),z:0};
      for(const key of ['x','y','z'] as const){
        expect(JSON.parse(start.position!)[key]).toBeCloseTo(expectedPosition[key],11);
        expect(JSON.parse(start.velocity!)[key]).toBeCloseTo(expectedVelocity[key],7);
      }
      for(const dimension of ['2D','3D']){
        await page.getByRole('button',{name:dimension,exact:true}).click();
        if(dimension==='3D')await page.getByRole('button',{name:'Front',exact:true}).click();
        await expect(state(page)).toHaveAttribute('data-time',start.time!);
        expect((await read(page)).position).toBe(start.position);
        for(const fields of [true,false]){
          await page.getByLabel('Field lines',{exact:true}).setChecked(fields);
          await page.getByLabel('Vectors',{exact:true}).uncheck();
          const visible=await read(page);
          for(const key of ['position','velocity','force','electric','magnetic','time'])expect(visible[key]).toBe(start[key]);
          if(dimension==='2D')await expect(page.locator('[data-vector="E"]')).toHaveCount(fields?1:0);
          await page.locator('.simulation-card').screenshot({path:`${folder}/after-${device}-${theme}-${dimension}-${name}-fields-${fields?'on':'off'}-initial.png`});
        }
      }
      // Genuine animation frames through completion; inspect every frame and
      // retain a hold period after the endpoint to expose former restart bugs.
      await page.getByRole('button',{name:'Play simulation',exact:true}).click();
      const frames=await page.evaluate(()=>new Promise<Record<string,string>[]>((resolve,reject)=>{
        const frames:Record<string,string>[]=[],begin=performance.now();let held=0;
        function capture(){const el=document.querySelector<HTMLElement>('[data-motion="selector"]')!,s={...el.dataset,wall:String(performance.now()-begin)} as Record<string,string>;frames.push(s);
          held=s.complete==='true'?held+1:0;
          if(held>=20)resolve(frames);else if(performance.now()-begin>20000)reject(new Error('Flight never completed'));else requestAnimationFrame(capture);
        }requestAnimationFrame(capture);
      }));
      for(let i=1;i<frames.length;i++){
        const a=frames[i-1],b=frames[i],dt=Number(b.time)-Number(a.time),at=JSON.parse(a.position),next=JSON.parse(b.position),head=JSON.parse(b.trailEnd);
        expect(dt).toBeGreaterThanOrEqual(0);expect(Number(b.elapsed)).toBeGreaterThanOrEqual(Number(a.elapsed));
        expect(Math.hypot(next.x-at.x,next.y-at.y)).toBeLessThanOrEqual((100000+Math.abs(dv))*dt+1e-7);
        expect(Math.hypot(next.x-head.x,next.y-head.y)).toBeLessThan(1e-7);
        expect(Number(b.trailCount)).toBeGreaterThanOrEqual(Number(a.trailCount));
        if(a.complete==='true')expect(b.position).toBe(a.position);
      }
      await expect(page.getByRole('button',{name:'Replay particle',exact:true})).toBeVisible();
      const end=await read(page);
      for(const dimension of ['3D','2D']){
        await page.getByRole('button',{name:dimension,exact:true}).click();
        await expect(state(page)).toHaveAttribute('data-position',end.position!);
        for(const fields of [true,false]){
          await page.getByLabel('Field lines',{exact:true}).setChecked(fields);
          await page.locator('.simulation-card').screenshot({path:`${folder}/after-${device}-${theme}-${dimension}-${name}-fields-${fields?'on':'off'}-completed.png`});
        }
      }
      cases.push({name,parameters:{speed:speed*1000,electric:8000,field:.08,charge:q,mass:m},expectedPosition,expectedVelocity,frames});
    }
    expect(errors).toEqual([]);
    await writeFile(`${folder}/matrix-${device}-${theme}.json`,JSON.stringify({errors,cases},null,2));
  });

test('finite aperture slabs stop entrance and grazing exit impacts in both renderers',async({page})=>{
  await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  for(const dimension of ['2D','3D'])for(const name of ['entrance','grazing']){
    await page.getByRole('button',{name:dimension,exact:true}).click();
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await set(page,'Magnetic field',0);await set(page,'Electric field',name==='entrance'?40:.028);
    await set(page,'Particle speed',name==='entrance'?1:100);
    for(let i=0;i<43;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
    const end=await read(page),position=JSON.parse(end.position!);
    expect(end.complete).toBe('true');expect(Math.abs(position.y)).toBeCloseTo(.014,12);
    expect(position.x).toBeGreaterThan(name==='entrance'?-.28:.0355);
    expect(position.x).toBeLessThan(name==='entrance'?-.2755:.0445);
    await expect(page.getByRole('status')).toContainText(name==='entrance'?'entrance wall collision':'exit slit collision');
    await page.locator('.simulation-card').screenshot({path:`${folder}/after-${dimension}-${name}-impact.png`});
    await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();expect((await read(page)).position).toBe(end.position);
  }
});

test('a rounded mass display cannot reset a flight on focus/blur',async({page})=>{
  await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('positive');
  for(const [index,dimension] of ['2D','3D'].entries()){
    await page.getByRole('button',{name:dimension,exact:true}).click();
    await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
    await expect(state(page)).toHaveAttribute('data-elapsed',String(.08*(index+1)));
    const before=await read(page);
    for(let i=0;i<3;i++){
      const mass=page.getByRole('spinbutton',{name:'Particle mass value',exact:true});await mass.focus();await mass.blur();
      expect((await read(page)).time).toBe(before.time);expect((await read(page)).position).toBe(before.position);
    }
  }
});
