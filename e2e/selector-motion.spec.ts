import { test, expect, type Page } from '@playwright/test';

const state=(page:Page)=>page.locator('[data-motion="selector"]');
const input=(page:Page,label:string)=>page.getByRole('spinbutton',{name:label+' value',exact:true});
async function motion(page:Page){return state(page).evaluate(el=>({...((el as HTMLElement).dataset)}));}
async function finiteAndJoined(page:Page){
  const s=await motion(page),position=JSON.parse(s.position!),head=JSON.parse(s.trailEnd!);
  for(const key of ['position','velocity','force','electric','magnetic'])expect(Object.values(JSON.parse(s[key]!)).every(v=>Number.isFinite(v))).toBe(true);
  for(const key of ['x','y','z'])expect(Math.abs(position[key]-head[key])).toBeLessThan(1e-7);
  expect(Number(s.trailCount)).toBeGreaterThan(0);
}
async function atSource(page:Page){
  await expect(state(page)).toHaveAttribute('data-time','0');
  expect(JSON.parse((await motion(page)).position!)).toEqual({x:-.28,y:0,z:0});
  expect(Number((await motion(page)).trailCount)).toBeLessThanOrEqual(2);
}

for(const [device,width,height] of [['desktop',1536,1100],['tablet',820,1180],['mobile',390,844]] as const){
  test(`selector ${device}: live parameter sweeps, renderer parity, playback and camera`,async({page},testInfo)=>{
    test.setTimeout(180000);
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height});await page.goto('/');
    await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
    await expect(page.locator('[data-gl-stats]')).toHaveAttribute('data-ready','true');
    await expect(state(page)).toHaveAttribute('data-time','0');
    for(const dimension of ['3D','2D']){
      await page.getByRole('button',{name:dimension,exact:true}).click();
      for(const particle of ['proton','electron']){
        await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(particle);
        await page.getByRole('button',{name:'Play simulation',exact:true}).click();
        // Actual slider input events, emitted successively while playback runs.
        for(const [label,values] of [['Particle speed',[0,500,1000,100]],['Magnetic field',[0,100,200,80]],['Electric field',[0,20,40,8]]] as const){
          const slider=page.getByRole('slider',{name:label,exact:true});
          for(const value of values){
            await slider.fill(String(value));
            await expect(input(page,label)).toHaveValue(String(value));
            await finiteAndJoined(page);
          }
        }
        await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
        // Paused edits must restart exactly, including rapid successive edits.
        for(const [label,value] of [['Particle speed',200],['Magnetic field',100],['Electric field',10]] as const){
          await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
          expect(Number((await motion(page)).time)).toBeGreaterThan(0);
          await input(page,label).fill(String(value));await atSource(page);
        }
        // A blur that republishes the same value must preserve the paused phase.
        await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
        const paused=await motion(page);await page.waitForTimeout(120);expect((await motion(page)).position).toBe(paused.position);
        await input(page,'Electric field').focus();await input(page,'Electric field').blur();expect((await motion(page)).time).toBe(paused.time);
        // Balanced proton and electron with an analyser: field transition parity.
        await input(page,'Particle speed').fill('100');await input(page,'Magnetic field').fill('80');await input(page,'Electric field').fill('8');
        await page.getByLabel('Magnetic analyser',{exact:true}).check();await atSource(page);
        for(let i=0;i<24;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
        await finiteAndJoined(page);
        const before=await motion(page),readouts=await page.locator('.readout-grid').innerText();
        await page.getByRole('button',{name:dimension==='3D'?'2D':'3D',exact:true}).click();
        await expect(state(page)).toHaveAttribute('data-time',before.time!);
        for(const key of ['position','velocity','force','electric','magnetic'])expect((await motion(page))[key]).toBe(before[key]);
        expect(await page.locator('.readout-grid').innerText()).toBe(readouts);
        await page.getByRole('button',{name:dimension,exact:true}).click();
        if(dimension==='3D'){
          for(const preset of ['Top','Side','Front','Perspective']){
            await page.getByRole('button',{name:preset,exact:true}).click();
            expect((await motion(page)).position).toBe(before.position);await finiteAndJoined(page);
          }
        }
        await page.locator('.simulation-card').screenshot({path:`artifacts/selector-fix/after-${device}-${dimension.toLowerCase()}-${particle}.png`});
        // Next emission clears the old trail instead of joining it to the source.
        let last=Number((await motion(page)).trailCount),wrapped=false;
        for(let i=0;i<25;i++){
          await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
          const count=Number((await motion(page)).trailCount);if(count<last)wrapped=true;last=count;
        }
        expect(wrapped).toBe(true);await finiteAndJoined(page);
        await page.getByRole('button',{name:'Reset experiment',exact:true}).click();await atSource(page);
      }
    }
    expect(errors).toEqual([]);await testInfo.attach('browser-errors',{body:JSON.stringify(errors),contentType:'application/json'});
  });
}

test('selector generic mass and charge edits clear the 3D trail; speed control preserves phase',async({page})=>{
  await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  await expect(state(page)).toHaveAttribute('data-time','0');
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('positive');
  for(const [label,value] of [['Particle mass',100],['Charge',5]] as const){
    await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();await input(page,label).fill(String(value));await atSource(page);
  }
  await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();const before=await motion(page);
  await page.locator('.speed-button').click();expect((await motion(page)).time).toBe(before.time);
  await page.getByRole('button',{name:'Play simulation',exact:true}).click();await page.waitForTimeout(300);
  await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  const slow=Number((await motion(page)).time);expect(slow).toBeGreaterThan(Number(before.time));
  await page.locator('.speed-button').click();
  await page.getByRole('button',{name:'Play simulation',exact:true}).click();await page.waitForTimeout(300);
  await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  expect(Number((await motion(page)).time)-slow).toBeGreaterThan(slow-Number(before.time));
});
