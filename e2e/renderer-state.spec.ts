import { test, expect } from '@playwright/test';
test('renderer switches preserve particle phase and spatial probe state',async({page})=>{
  await page.goto('/');await expect(page.locator('[data-gl-stats]')).toHaveAttribute('data-ready','true');
  const probe=page.getByRole('slider',{name:'Field probe P',exact:true});await probe.press('PageUp');
  const readouts=await page.locator('.readout-grid').innerText(),graph=await page.locator('.graph').innerHTML();
  await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.getByText(/2D projects x–y/)).toBeVisible();expect(await page.locator('.readout-grid').innerText()).toBe(readouts);expect(await page.locator('.graph').innerHTML()).toBe(graph);
  await page.getByRole('button',{name:'3D',exact:true}).click();await expect(probe).toHaveAttribute('aria-valuetext',/z 0.005 m/);
  await page.getByRole('tab',{name:'Moving Charges',exact:true}).click();await expect(page.locator('[data-motion="charges"]')).toHaveAttribute('data-time',/./);
  await page.getByRole('button',{name:'Play simulation',exact:true}).click();await expect.poll(async()=>Number(await page.locator('[data-motion="charges"]').getAttribute('data-time'))).toBeGreaterThan(0);await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  await page.waitForTimeout(100);const before=Number(await page.locator('[data-motion="charges"]').getAttribute('data-time'));
  await page.getByRole('button',{name:'2D',exact:true}).click();await expect.poll(async()=>Math.abs(Number(await page.locator('[data-particle="charge"]').getAttribute('data-time'))-before)).toBeLessThan(1e-14);
  await page.getByRole('button',{name:'3D',exact:true}).click();await expect.poll(async()=>Math.abs(Number(await page.locator('[data-motion="charges"]').getAttribute('data-time'))-before)).toBeLessThan(1e-14);
});
test('zero physical vectors hide their spatial HTML labels',async({page})=>{
  await page.goto('/');await expect(page.locator('[data-gl-stats]')).toHaveAttribute('data-ready','true');
  const label=(name:string)=>page.locator('.gl-vector-label').filter({hasText:new RegExp(`^${name}$`)});
  await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('wire');await page.getByRole('spinbutton',{name:'Current value',exact:true}).fill('0');await expect(label('I')).toBeHidden();await expect(label('B')).toBeHidden();
  await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();await expect(label('Fnet')).toBeHidden();await expect(label('Fᴇ')).toBeVisible();await expect(label('Fʙ')).toBeVisible();
  await page.getByRole('spinbutton',{name:'Electric field value',exact:true}).fill('0');await expect(label('Fnet')).toBeVisible();await expect(label('Fᴇ')).toBeHidden();
  await page.getByRole('tab',{name:'Moving Charges',exact:true}).click();await page.getByRole('spinbutton',{name:'Magnetic field value',exact:true}).fill('0');await expect(label('Fnet')).toBeHidden();
  await page.getByRole('tab',{name:'Motor Effect',exact:true}).click();await page.getByRole('spinbutton',{name:'Angle to field value',exact:true}).fill('0');await expect(label('F')).toBeHidden();
});
