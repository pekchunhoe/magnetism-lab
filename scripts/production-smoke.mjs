import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const response=await page.goto(process.env.LAB_URL||'http://127.0.0.1:5174/');
for(const name of ['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector']){
  await page.getByRole('tab',{name,exact:true}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect.poll(async()=>Number(await page.locator('[data-gl-stats]').getAttribute('data-triangles'))).toBeGreaterThan(0);
  const stats=await page.locator('[data-gl-stats]').evaluate(n=>({...n.dataset}));
  await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.locator('.simulation-scene')).toBeVisible();const readouts=await page.locator('.readout-grid').innerText();expect(readouts).not.toContain('NaN');
  await page.getByRole('button',{name:'3D',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect.poll(async()=>Number(await page.locator('[data-gl-stats]').getAttribute('data-triangles'))).toBeGreaterThan(0);results.push({name,webgl:true,svg:true,stats});
}
await fs.writeFile('artifacts/webgl/production-smoke.json',JSON.stringify({url:page.url(),status:response.status(),results,errors},null,2));expect(errors).toEqual([]);await browser.close();console.log('Production smoke: all six WebGL/2D tabs passed.');
