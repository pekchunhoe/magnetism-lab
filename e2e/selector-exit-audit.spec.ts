import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const rows=[
  [100,3e-6,0,100000,0,0],
  [150,3.065068893095526e-6,.007007966231370241,96297.48856577389,-49862.72564831795,-.10690777348324616],
  [200,3.1220234698737194e-6,.00842413876156238,135445.26425638105,-93507.39672237333,-.14345734186357484],
  [240,3.1517756141498044e-6,.008100162407811851,177927.91660761886,-116306.66280654776,-.1357078824751509],
];
for(const device of ['desktop','mobile'])for(const theme of ['dark','light'])test(`exit aperture audit: four reference flights ${device} ${theme}`,async({page})=>{
  test.setTimeout(150000);const folder='artifacts/selector-ultra-narrow';await mkdir(folder,{recursive:true});
  await page.setViewportSize(device==='desktop'?{width:1536,height:1100}:{width:390,height:844});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  if(theme==='light')await page.getByRole('button',{name:'Switch color theme',exact:true}).click();
  const motion=page.locator('[data-motion="selector"]'),read=()=>motion.evaluate(el=>({...((el as HTMLElement).dataset)}));
  const evidence=[];
  for(const [speed,time,y,vx,vy,endY] of rows){
    await page.getByRole('button',{name:'3D',exact:true}).click();
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('button',{name:'Perspective',exact:true}).click();
    await page.getByRole('spinbutton',{name:'Particle speed value',exact:true}).fill(String(speed));
    await expect(page.getByLabel('Magnetic analyser',{exact:true})).not.toBeChecked();
    await page.getByLabel('Trail',{exact:true}).check();
    const initial=await read(),exit=JSON.parse(initial.selectorExit!);
    expect(exit.time).toBeCloseTo(time,17);expect(exit.position.y).toBeCloseTo(y,12);
    expect(exit.velocity.x).toBeCloseTo(vx,7);expect(exit.velocity.y).toBeCloseTo(vy,7);
    await expect(motion).toHaveAttribute('data-velocity-matched',String(speed===100));
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    await expect(motion).toHaveAttribute('data-complete','true',{timeout:20000});
    await expect(page.getByRole('status')).toContainText(speed===100?'selected velocity matched':'exit slit collision');
    const end=await read(),at=JSON.parse(end.position!),velocity=JSON.parse(end.velocity!);
    expect(at.x).toBeCloseTo(speed===100?.24:.0355,12);
    expect(at.y).toBeCloseTo(speed===100?endY:y+(.0355-.02)*vy/vx,12);
    expect(velocity.x).toBeCloseTo(vx,7);expect(velocity.y).toBeCloseTo(vy,7);
    expect(JSON.parse(end.force!)).toEqual({x:0,y:0,z:0});
    if(speed===100)expect(end.firstCollision).toBe('null');
    else{const hit=JSON.parse(end.firstCollision!);expect(hit.kind).toBe('slit');expect(hit.side).toBe('lower');expect(hit.position).toEqual(at);}
    for(const dimension of ['3D','2D']){
      await page.getByRole('button',{name:dimension,exact:true}).click();
      await expect(motion).toHaveAttribute('data-position',end.position!);
      await expect(motion).toHaveAttribute('data-velocity',end.velocity!);
      await page.getByLabel('Field lines',{exact:true}).uncheck();
      expect((await read()).position).toBe(end.position);
      await page.getByLabel('Field lines',{exact:true}).check();
      if(dimension==='2D'){
        await expect(page.locator('[data-selector-solid]')).toHaveCount(6);
        const ratios=await page.evaluate(()=>{
          const polygons=(kind:string)=>Array.from(document.querySelectorAll(`[data-selector-solid="${kind}"]`)).map(el=>{
            const pairs=Array.from(el.getAttribute('d')!.matchAll(/[ML]([^, ]+),([^ ]+)/g),m=>[Number(m[1]),Number(m[2])]);
            return {minY:Math.min(...pairs.map(p=>p[1])),maxY:Math.max(...pairs.map(p=>p[1])),width:Math.max(...pairs.map(p=>p[0]))-Math.min(...pairs.map(p=>p[0]))};
          });
          const gap=(kind:string)=>{const blocks=polygons(kind).sort((a,b)=>a.minY-b.minY);return blocks[1].minY-blocks[0].maxY;};
          const length=polygons('plate')[0].width;return {exit:gap('slit')/length,entrance:gap('entrance-wall')/length};
        });
        expect(ratios.exit).toBeCloseTo(.0001/.3,12);expect(ratios.entrance).toBeCloseTo(.028/.3,12);
      }
      await page.locator('.simulation-card').screenshot({path:`${folder}/matrix-${device}-${theme}-${speed}-${dimension}.png`});
    }
    await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
    expect((await read()).position).toBe(end.position);
    await expect(page.getByRole('button',{name:'Replay particle',exact:true})).toBeVisible();
    evidence.push({speed,initial,end});
  }
  expect(errors).toEqual([]);await writeFile(`${folder}/matrix-${device}-${theme}.json`,JSON.stringify({errors,evidence},null,2));
});

test('narrow slit preserves off-speed passage, finite-wall bypass and high-speed contact in both views',async({page})=>{
  test.setTimeout(120000);const folder='artifacts/selector-ultra-narrow';
  await page.goto('/');await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  for(const dimension of ['2D','3D'])for(const speed of [99.5,100.5,337,1000]){
    await page.getByRole('button',{name:dimension,exact:true}).click();
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('spinbutton',{name:'Particle speed value',exact:true}).fill(String(speed));
    if(speed===1000){
      await page.getByRole('spinbutton',{name:'Magnetic field value',exact:true}).fill('0');
      await page.getByRole('spinbutton',{name:'Electric field value',exact:true}).fill('1');
    }
    const motion=page.locator('[data-motion="selector"]');
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    await expect(motion).toHaveAttribute('data-complete','true',{timeout:20000});
    const end=await motion.evaluate(el=>({...((el as HTMLElement).dataset)})),at=JSON.parse(end.position!),exit=JSON.parse(end.selectorExit!);
    if(speed<101){
      await expect(page.getByRole('status')).toContainText('off-selected velocity');expect(end.firstCollision).toBe('null');
      expect(at.x).toBeCloseTo(.24,12);expect(at.y).toBeCloseTo(exit.position.y+(.24-.02)*exit.velocity.y/exit.velocity.x,12);
    }else if(speed===337){
      await expect(page.getByRole('status')).toContainText('bypassed exit wall');expect(end.firstCollision).toBe('null');
      expect(at.x).toBeCloseTo(.24,12);expect(at.y).toBeGreaterThan(.115);
    }else{
      await expect(page.getByRole('status')).toContainText('exit slit collision');expect(JSON.parse(end.firstCollision!).kind).toBe('slit');
      expect(at.x).toBeCloseTo(.0355,12);expect(at.y).toBeLessThan(-.00005);
    }
    await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
    await expect(motion).toHaveAttribute('data-position',end.position!);
    await page.locator('.simulation-card').screenshot({path:`${folder}/extra-${dimension}-${speed}.png`});
  }
});
