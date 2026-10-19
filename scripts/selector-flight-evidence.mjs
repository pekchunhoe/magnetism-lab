import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const phase=process.argv[2]||'before',url=process.argv[3]||'http://127.0.0.1:5173';
const folder='artifacts/selector-single-flight';await mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1536,height:1100},reducedMotion:'reduce'});
  await page.goto(url);await page.getByRole('tab',{name:'Velocity Selector',exact:true}).click();
  await page.locator('[data-motion="selector"]').waitFor();
  await page.getByRole('combobox',{name:'3D quality',exact:true}).selectOption('Economy');
  const recordings=[];
  for(const dimension of ['3D','2D']){
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('button',{name:dimension,exact:true}).click();
    await page.getByLabel('Field lines',{exact:true}).uncheck();
    await page.getByLabel('Trail',{exact:true}).check();
    for(let i=0;i<36;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
    await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-${dimension}-before-end.png`});
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    const frames=await page.evaluate(()=>new Promise(resolve=>{
      const frames=[],start=performance.now();
      function read(){const el=document.querySelector('[data-motion="selector"]');frames.push({wall:performance.now()-start,...el.dataset});if(performance.now()-start<2200)requestAnimationFrame(read);else resolve(frames);}
      requestAnimationFrame(read);
    }));
    await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-${dimension}-after-end.png`});
    const pause=page.getByRole('button',{name:'Pause simulation',exact:true});if(await pause.count())await pause.click();
    const wraps=frames.filter((f,i)=>i>0&&Number(f.time)<Number(frames[i-1].time)-1e-15).length;
    recordings.push({dimension,frames,wraps});
    console.log(JSON.stringify({phase,url,dimension,frames:frames.length,wraps,first:frames[0],last:frames.at(-1)}));
  }
  // Distinguish real crossed-field loops from the static field illustrations.
  await page.getByRole('button',{name:'3D',exact:true}).click();
  await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
  await page.getByRole('spinbutton',{name:'Particle speed value',exact:true}).fill('300');
  for(let i=0;i<30;i++)await page.getByRole('button',{name:'Step simulation forward',exact:true}).click();
  for(const fields of [false,true]){
    await page.getByLabel('Field lines',{exact:true}).setChecked(fields);
    await page.locator('.simulation-card').screenshot({path:`${folder}/${phase}-valid-loops-fields-${fields?'on':'off'}.png`});
  }
  await writeFile(`${folder}/${phase}-frames.json`,JSON.stringify({url,recordings},null,2));
}finally{await browser.close();}
