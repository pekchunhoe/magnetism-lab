import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerChallenges } from './challenge-cases';
const tabs=['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector'];
const ids=['fields','resultant','charges','motor','wires','selector'];
const set=async(page:Page,label:string,value:number)=>{await page.getByRole('spinbutton',{name:label+' value',exact:true}).fill(String(value));};
const stats=(page:Page)=>page.locator('[data-gl-stats]');
async function ready(page:Page){await expect(page.locator('.webgl-scene canvas')).toHaveCount(1);await expect(stats(page)).toHaveAttribute('data-ready','true');await expect.poll(async()=>Number(await stats(page).getAttribute('data-triangles'))).toBeGreaterThan(0);}
async function choose(page:Page,name:string){await page.getByRole('tab',{name,exact:true}).click();await ready(page);}
const vector=async(page:Page,name:string)=>JSON.parse((await page.locator('[data-vectors]').getAttribute('data-vectors'))!).find((v:{label:string})=>v.label===name)?.value;
test.beforeEach(async({page})=>{await page.addInitScript(()=>{Math.random=()=>.5;});await page.goto('/');await ready(page);});

for(const [i,name] of tabs.entries())test(`${name}: real perspective camera, orbit, pan, zoom, presets, SVG state and screenshots`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await choose(page,name);
  const scene=page.getByRole('group',{name:'Interactive 3D laboratory',exact:true});await scene.scrollIntoViewIfNeeded();
  const readouts=await page.locator('.readout-grid').innerText(),graph=await page.locator('.graph').innerHTML();
  await page.locator('.simulation-card').screenshot({path:`artifacts/webgl/${ids[i]}-perspective.png`});
  for(const preset of ['Top','Side','Front','Perspective']){await page.getByRole('button',{name:preset,exact:true}).click();await expect(page.getByRole('button',{name:preset,exact:true})).toHaveAttribute('aria-pressed','true');await page.locator('.simulation-card').screenshot({path:`artifacts/webgl/${ids[i]}-${preset.toLowerCase()}.png`});}
  const camera=await stats(page).getAttribute('data-camera'),b=(await scene.boundingBox())!;
  await page.mouse.move(b.x+b.width*.8,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.65,b.y+b.height*.35,{steps:8});await page.mouse.up();await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(camera);
  await page.getByRole('button',{name:'Reframe',exact:true}).click();await scene.focus();const before=await stats(page).getAttribute('data-camera');await scene.press('ArrowRight');await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(before);const target=await stats(page).getAttribute('data-target');await scene.press('Shift+ArrowRight');await expect.poll(()=>stats(page).getAttribute('data-target')).not.toBe(target);
  const preZoom=await stats(page).getAttribute('data-camera');await scene.press('+');await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(preZoom);
  await page.getByLabel('Axes',{exact:true}).check();await page.getByLabel('Grid',{exact:true}).check();await page.getByRole('combobox',{name:'3D quality'}).selectOption('Economy');await expect(page.locator('.webgl-scene')).toHaveAttribute('data-quality','economy');
  await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.locator('.simulation-scene')).toBeVisible();expect(await page.locator('.readout-grid').innerText()).toBe(readouts);expect(await page.locator('.graph').innerHTML()).toBe(graph);await page.locator('.simulation-card').screenshot({path:`artifacts/webgl/${ids[i]}-2d.png`});
  await page.getByRole('button',{name:'3D',exact:true}).click();await ready(page);expect(errors).toEqual([]);
});

test('all five field sources, current reversal, zero current, probe depth, compass and graph synchronization',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const source of ['bar','wire','coil','solenoid','earth']){await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption(source);await ready(page);await page.locator('.simulation-card').screenshot({path:`artifacts/webgl/source-${source}.png`});}
  await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('wire');const before=await vector(page,'B');await set(page,'Current',-5);const reversed=await vector(page,'B');expect(reversed.x).toBe(-before.x);expect(reversed.y).toBe(-before.y);await set(page,'Current',0);expect(await vector(page,'B')).toEqual({x:0,y:0,z:0});
  await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('bar');const probe=page.getByRole('slider',{name:'Field probe P',exact:true}),readout=await page.locator('.readout-grid').innerText(),graph=await page.locator('.graph').innerHTML();for(let i=0;i<10;i++)await probe.press('PageUp');await expect(probe).toHaveAttribute('aria-valuetext',/z 0.050 m/);expect(await page.locator('.readout-grid').innerText()).not.toBe(readout);expect(await page.locator('.graph').innerHTML()).not.toBe(graph);
  await page.getByRole('combobox',{name:'Drag plane'}).selectOption('XZ');await probe.press('ArrowUp');await expect(probe).toHaveAttribute('aria-valuetext',/z 0.055 m/);
  const compass=page.getByRole('slider',{name:'Compass',exact:true});await compass.press('PageDown');await expect(compass).toHaveAttribute('aria-valuetext',/z -0.005 m/);
  const box=(await probe.boundingBox())!,value=await probe.getAttribute('aria-valuetext');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+25,box.y+box.height/2+15,{steps:6});await page.mouse.up();expect(await probe.getAttribute('aria-valuetext')).not.toBe(value);expect(errors).toEqual([]);
});

test('particle animation, sign, helix, field reversal, follow camera, pause, step, slow and zero B',async({page})=>{
  await choose(page,'Moving Charges');const motion=page.locator('[data-motion="charges"]');
  const force=JSON.parse((await motion.getAttribute('data-force'))!);expect(force.y).toBeLessThan(0);
  await page.getByRole('button',{name:/Reverse field/}).click();await expect.poll(async()=>JSON.parse((await motion.getAttribute('data-force'))!).y).toBeGreaterThan(0);
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');await expect.poll(async()=>JSON.parse((await motion.getAttribute('data-force'))!).y).toBeLessThan(0);
  await set(page,'Launch angle to B',45);await page.locator('.simulation-card').screenshot({path:'artifacts/webgl/charge-helix.png'});
  await page.getByLabel('Follow particle',{exact:true}).check();const target=await stats(page).getAttribute('data-target');await page.getByRole('button',{name:'Play simulation',exact:true}).click();await page.waitForTimeout(300);await page.getByRole('button',{name:'Pause simulation',exact:true}).click();await expect.poll(()=>stats(page).getAttribute('data-target')).not.toBe(target);
  const paused=await motion.getAttribute('data-time');await page.waitForTimeout(100);expect(await motion.getAttribute('data-time')).toBe(paused);await page.getByRole('button',{name:'Step simulation forward'}).click();await expect.poll(()=>motion.getAttribute('data-time')).not.toBe(paused);
  await set(page,'Magnetic field',0);await expect.poll(async()=>JSON.parse((await motion.getAttribute('data-force'))!)).toEqual({x:0,y:0,z:0});await set(page,'Particle speed',0);await page.getByRole('button',{name:'Step simulation forward'}).click();expect(JSON.parse((await motion.getAttribute('data-position'))!)).toEqual({x:0,y:0,z:0});
});

test('selector balance, negative charge, analyser region and electric force boundary',async({page})=>{
  await choose(page,'Velocity Selector');const motion=page.locator('[data-motion="selector"]');expect(JSON.parse((await motion.getAttribute('data-force'))!).y).toBe(0);
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');expect(JSON.parse((await motion.getAttribute('data-force'))!).y).toBe(0);await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('positive');await set(page,'Particle mass',20);await page.getByLabel('Magnetic analyser',{exact:true}).check();
  for(let i=0;i<60;i++){await page.getByRole('button',{name:'Step simulation forward'}).click();if(await motion.getAttribute('data-stage')==='analyser')break;}
  await expect(motion).toHaveAttribute('data-stage','analyser');expect(JSON.parse((await motion.getAttribute('data-electric'))!)).toEqual({x:0,y:0,z:0});expect(Math.hypot(...Object.values(JSON.parse((await motion.getAttribute('data-magnetic'))!)) as number[])).toBeGreaterThan(0);await page.locator('.simulation-card').screenshot({path:'artifacts/webgl/selector-analyser.png'});
});

registerChallenges('WebGL ');

for(const name of tabs)test(`${name}: every WebGL slider and numerical range, graph and display toggle`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await choose(page,name);
  const choices=name==='Magnetic Fields'?['bar','wire','coil','solenoid','earth']:name==='Moving Charges'||name==='Velocity Selector'?['proton','electron','positive','negative']:[''];
  for(const choice of choices){if(choice)await page.getByRole('combobox',{name:name==='Magnetic Fields'?'Field source':'Particle',exact:true}).selectOption(choice);
    const ranges=page.locator('.controls-card input[type=range]');for(let i=0;i<await ranges.count();i++){const slider=ranges.nth(i),label=(await slider.getAttribute('aria-label'))!,min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max')),input=page.getByRole('spinbutton',{name:label+' value',exact:true});for(const value of [min,(min+max)/2,max]){await input.fill(String(value));await input.press('Tab');await expect(input).toHaveValue(String(value));await ready(page);}await slider.press('Home');await expect(input).toHaveValue(String(min));await slider.press('End');await expect(input).toHaveValue(String(max));}
  }
  if(name==='Parallel Wires'){await page.getByRole('button',{name:'Top',exact:true}).click();await page.locator('.simulation-card').screenshot({path:'artifacts/webgl/wires-maximum-length-top.png'});}await page.getByRole('button',{name:'Reset experiment',exact:true}).click();for(const box of await page.locator('.view-toggles input').all()){await box.uncheck();await box.check();}await ready(page);expect(await page.locator('.graph path').evaluateAll(ns=>ns.some(n=>/NaN|Infinity/.test(n.getAttribute('d')||'')))).toBe(false);expect(errors).toEqual([]);
});

test('mouse wheel and right-drag operate the real camera',async({page})=>{
  const scene=page.getByRole('group',{name:'Interactive 3D laboratory',exact:true});await scene.scrollIntoViewIfNeeded();const b=(await scene.boundingBox())!,before=await stats(page).getAttribute('data-camera');await page.mouse.move(b.x+b.width*.8,b.y+b.height*.7);await page.mouse.wheel(0,-160);await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(before);const target=await stats(page).getAttribute('data-target');await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.7,b.y+b.height*.6,{steps:8});await page.mouse.up({button:'right'});await expect.poll(()=>stats(page).getAttribute('data-target')).not.toBe(target);
});

test('phone touch supports orbit, pinch zoom, two-finger pan and probe movement',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await page.goto('/');await ready(page);const scene=page.getByRole('group',{name:'Interactive 3D laboratory',exact:true});await scene.scrollIntoViewIfNeeded();const b=(await scene.boundingBox())!,cdp=await context.newCDPSession(page),x=b.x+b.width*.7,y=b.y+b.height*.6;
  const touch=async(type:string,points:{x:number;y:number;id?:number}[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  let before=await stats(page).getAttribute('data-camera');await touch('touchStart',[{x,y}]);await touch('touchMove',[{x:x-40,y:y+25}]);await touch('touchEnd',[]);await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(before);
  before=await stats(page).getAttribute('data-camera');await touch('touchStart',[{x:x-40,y,id:1},{x:x+10,y,id:2}]);await touch('touchMove',[{x:x-65,y,id:1},{x:x+35,y,id:2}]);await touch('touchEnd',[]);await expect.poll(()=>stats(page).getAttribute('data-camera')).not.toBe(before);
  const target=await stats(page).getAttribute('data-target');await touch('touchStart',[{x:x-40,y,id:1},{x:x+10,y,id:2}]);await touch('touchMove',[{x:x-20,y:y-20,id:1},{x:x+30,y:y-20,id:2}]);await touch('touchEnd',[]);await expect.poll(()=>stats(page).getAttribute('data-target')).not.toBe(target);
  await page.getByRole('button',{name:'Reframe',exact:true}).click();const probe=page.getByRole('slider',{name:'Field probe P',exact:true}),v=await probe.getAttribute('aria-valuetext'),p=(await probe.boundingBox())!;await touch('touchStart',[{x:p.x+p.width/2,y:p.y+p.height/2}]);await touch('touchMove',[{x:p.x+p.width/2+25,y:p.y+p.height/2+10}]);await touch('touchEnd',[]);await expect(probe).not.toHaveAttribute('aria-valuetext',v!);await context.close();
});

test('responsive WebGL and SVG layouts, all controls and accessibility in both themes',async({page})=>{
  test.setTimeout(120000);
  for(const width of [1536,820,390,320]){await page.setViewportSize({width,height:1000});for(const name of tabs){await choose(page,name);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const clipped=await page.locator('.gl-toolbar,.gl-options,.readout strong,.formula,.control-title,.graph-value').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(clipped).toEqual([]);if(width!==320){await page.locator('.simulation-card').screenshot({path:`artifacts/webgl/${ids[tabs.indexOf(name)]}-${width}.png`});await page.screenshot({path:`artifacts/webgl/${ids[tabs.indexOf(name)]}-${width}-page.png`,fullPage:true});}}}
  await page.setViewportSize({width:1536,height:1100});for(const light of [false,true]){if(light)await page.getByRole('button',{name:'Switch color theme'}).click();for(const name of tabs){await choose(page,name);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))).toEqual([]);}}
});

test('compatible fallback and graphics-context loss preserve usable controls and shared state',async({page})=>{
  await page.getByRole('button',{name:'Compatible view',exact:true}).click();await expect(page.locator('.simulation-scene')).toBeVisible();await page.getByRole('button',{name:'Restore WebGL 3D'}).click();await ready(page);
  await page.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());await expect(page.locator('.gl-fallback')).toContainText('context was lost');await expect(page.locator('.simulation-scene')).toBeVisible();await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.locator('.simulation-scene')).toBeVisible();
});

test('unsupported WebGL automatically retains the SVG laboratory',async({browser})=>{
  const context=await browser.newContext();await context.addInitScript(()=>{Object.defineProperty(window,'WebGL2RenderingContext',{value:undefined});});const page=await context.newPage();await page.goto('/');await expect(page.locator('.gl-fallback')).toContainText('unavailable');await expect(page.locator('.simulation-scene')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);await context.close();
});
