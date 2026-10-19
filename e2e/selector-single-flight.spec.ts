import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const folder='artifacts/selector-single-flight';
const state=(page:Page)=>page.locator('[data-motion="selector"]');
const read=(page:Page)=>state(page).evaluate(el=>({...((el as HTMLElement).dataset)}));
const input=(page:Page,label:string)=>page.getByRole('spinbutton',{name:label+' value',exact:true});
type Frame=Record<string,string>;
async function record(page:Page,untilComplete:boolean):Promise<Frame[]>{
  const launchSpeed=Number(await input(page,'Particle speed').inputValue())*1000;
  const electric=Number(await input(page,'Electric field').inputValue())*1000,magnetic=Number(await input(page,'Magnetic field').inputValue())/1000;
  // In crossed fields |v(t)| <= |E/B| + |v0-E/B|. Electron gyromotion
  // can cycle many times between frames; endpoint speeds alone do not bound it.
  const speedBound=Math.abs(electric/magnetic)+Math.abs(launchSpeed-electric/magnetic);
  expect(Number.isFinite(speedBound)).toBe(true);
  return page.evaluate(({untilComplete,speedBound})=>new Promise<Frame[]>((resolve,reject)=>{
    const frames:Frame[]=[],start=performance.now();let finalFrames=0;
    function capture(){
      const element=document.querySelector<HTMLElement>('[data-motion="selector"]')!;
      const frame={...element.dataset,wall:String(performance.now()-start),speedBound:String(speedBound)} as Frame;frames.push(frame);
      if(frame.complete==='true')finalFrames++;
      if((untilComplete&&finalFrames>=20)||(!untilComplete&&frames.length>=10))resolve(frames);
      else if(performance.now()-start>15000)reject(new Error('Flight did not complete'));
      else requestAnimationFrame(capture);
    }
    requestAnimationFrame(capture);
  }),{untilComplete,speedBound});
}
function continuous(frames:Frame[]){
  for(let i=0;i<frames.length;i++){
    const frame=frames[i],at=JSON.parse(frame.position),head=JSON.parse(frame.trailEnd);
    for(const k of ['x','y','z'])expect(Math.abs(at[k]-head[k])).toBeLessThan(1e-7);
    if(!i)continue;
    const previous=frames[i-1],before=JSON.parse(previous.position),dt=Number(frame.time)-Number(previous.time);
    expect(dt).toBeGreaterThanOrEqual(0);expect(Number(frame.elapsed)).toBeGreaterThanOrEqual(Number(previous.elapsed));
    expect(Number(frame.trailCount)).toBeGreaterThanOrEqual(Number(previous.trailCount));
    expect(Math.hypot(at.x-before.x,at.y-before.y,at.z-before.z)).toBeLessThanOrEqual(Number(frame.speedBound)*dt+1e-7);
    if(previous.complete==='true')expect(frame.position).toBe(previous.position);
  }
}

for(const dimension of ['2D','3D'])test(`single particle ${dimension}: complete proton/electron flights, replay and intentional edits only`,async({page},testInfo)=>{
  test.setTimeout(120000);await mkdir(folder,{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  await page.getByRole('button',{name:dimension,exact:true}).click();
  if(dimension==='3D'){
    await expect(page.locator('[data-renderer="webgl"] canvas')).toHaveCount(1);
    await page.getByRole('combobox',{name:'3D quality',exact:true}).selectOption('Economy');
  }
  await page.getByLabel('Field lines',{exact:true}).uncheck();await page.getByLabel('Trail',{exact:true}).check();
  await expect(state(page)).toHaveAttribute('data-time','0');await page.waitForTimeout(120);
  await expect(state(page)).toHaveAttribute('data-time','0');await expect(page.getByRole('button',{name:'Play simulation',exact:true})).toBeVisible();
  for(const particle of ['proton','electron']){
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(particle);
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    const frames=await record(page,true);continuous(frames);
    expect(new Set(frames.map(f=>f.position)).size).toBeGreaterThan(15);
    const end=await read(page);expect(end.complete).toBe('true');expect(Number(end.elapsed)).toBe(10/3);
    expect(JSON.parse(end.position).x).toBeCloseTo(.24,12);
    await expect(page.getByRole('status')).toContainText('Detected after selector');
    await expect(page.getByRole('button',{name:'Replay particle',exact:true})).toBeVisible();
    await page.waitForTimeout(450);expect((await read(page)).position).toBe(end.position);expect((await read(page)).elapsed).toBe(end.elapsed);
    await page.locator('.simulation-card').screenshot({path:`${folder}/after-${dimension}-${particle}-completed.png`});
    await writeFile(`${folder}/after-${dimension}-${particle}-frames.json`,JSON.stringify(frames,null,2));
    await testInfo.attach(`${dimension}-${particle}-frames`,{body:JSON.stringify(frames),contentType:'application/json'});
    await page.getByRole('button',{name:'Replay particle',exact:true}).click();
    expect(Number((await read(page)).elapsed)).toBeLessThan(.2);expect(Number((await read(page)).trailCount)).toBeLessThan(Number(end.trailCount));
    const replayFrames=await record(page,false);continuous(replayFrames);expect(replayFrames.at(-1)!.complete).toBe('false');
    await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
    for(const [label,value] of [['Particle speed',200],['Electric field',16],['Magnetic field',160]] as const){
      await input(page,label).fill(String(value));await expect(state(page)).toHaveAttribute('data-time','0');
      expect(JSON.parse((await read(page)).position)).toEqual({x:-.28,y:0,z:0});
      expect(Number((await read(page)).trailCount)).toBeLessThanOrEqual(2);
      await page.getByRole('button',{name:'Play simulation',exact:true}).click();const editFrames=await record(page,false);continuous(editFrames);
      expect(Number(editFrames.at(-1)!.elapsed)).toBeGreaterThan(Number(editFrames[0].elapsed));
      await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
      const paused=await read(page);await page.getByLabel('Labels',{exact:true}).uncheck();await page.getByLabel('Labels',{exact:true}).check();
      expect((await read(page)).elapsed).toBe(paused.elapsed);
      await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();expect(Number((await read(page)).elapsed)).toBeGreaterThan(Number(paused.elapsed));
    }
  }
  expect(errors).toEqual([]);
});

test('single flights hold collision and return boundaries and preserve genuine cycloidal loops',async({page})=>{
  test.setTimeout(90000);await mkdir(folder,{recursive:true});await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  for(const dimension of ['2D','3D']){
    await page.getByRole('button',{name:dimension,exact:true}).click();await page.getByLabel('Field lines',{exact:true}).uncheck();
    for(const scenario of ['plate','return','loops']){
      await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
      if(scenario==='plate')await input(page,'Magnetic field').fill('0');
      if(scenario==='return'){await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('electron');await input(page,'Particle speed').fill('1000');}
      if(scenario==='loops')await input(page,'Particle speed').fill('300');
      for(let i=0;i<30;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
      if(scenario==='loops'){
        const turning=await read(page);expect(JSON.parse(turning.velocity).x).toBeLessThan(0);expect(turning.complete).toBe('false');
        await page.locator('.simulation-card').screenshot({path:`${folder}/after-${dimension}-valid-loops-fields-off.png`});
        await page.getByLabel('Field lines',{exact:true}).check();expect((await read(page)).position).toBe(turning.position);
        await page.getByLabel('Field lines',{exact:true}).uncheck();
      }
      for(let i=0;i<15;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
      await expect(state(page)).toHaveAttribute('data-complete','true');const end=await read(page);
      await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();expect((await read(page)).position).toBe(end.position);
      if(scenario==='plate'){expect(Math.abs(JSON.parse(end.position).y)).toBe(.115);await expect(page.getByRole('status')).toHaveText('Plate collision');}
      if(scenario==='return'){expect(JSON.parse(end.position).x).toBe(-.28);await expect(page.getByRole('status')).toHaveText('Returned through entrance');}
    }
  }
});
