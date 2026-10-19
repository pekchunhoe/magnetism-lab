import { registerChallenges } from './challenge-cases';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const tabs=['Magnetic Fields','Resultant Fields','Moving Charges','Motor Effect','Parallel Wires','Velocity Selector'];
const ids=['fields','resultant','charges','motor','wires','selector'];
const number=(page:Page,label:string)=>page.getByRole('spinbutton',{name:label+' value',exact:true});
const set=async(page:Page,label:string,value:number)=>{await number(page,label).fill(String(value));await expect(number(page,label)).toHaveValue(String(value));};
async function choose(page:Page,name:string){await page.getByRole('tab',{name,exact:true}).click();}
async function probe(page:Page,name:string,x:number,y:number){
  const element=page.getByRole('slider',{name,exact:true});
  const value=await element.getAttribute('aria-valuetext');const match=value!.match(/x ([-\d.]+) m, y ([-\d.]+) m/)!;
  for(const [delta,positive,negative] of [[x-Number(match[1]),'ArrowRight','ArrowLeft'],[y-Number(match[2]),'ArrowUp','ArrowDown']] as const){
    for(let i=0;i<Math.round(Math.abs(delta)/.005);i++)await element.press(delta>0?positive:negative);
  }
}
async function noInvalidGeometry(page:Page){expect(await page.locator('.simulation-scene path,.graph path').evaluateAll(nodes=>nodes.filter(n=>/NaN|Infinity/.test(n.getAttribute('d')||'')).length)).toBe(0);}
async function readout(page:Page,label:string){return Number((await page.locator('.readout').filter({has:page.locator('span',{hasText:label})}).locator('strong').innerText()).split(/\s/)[0]);}
async function exerciseInputs(page:Page){
  const ranges=page.locator('.controls-card input[type=range]');
  for(let i=0;i<await ranges.count();i++){
    const slider=ranges.nth(i),label=(await slider.getAttribute('aria-label'))!,min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max')),step=Number(await slider.getAttribute('step'));
    const middle=min+Math.round((max-min)/2/step)*step;
    for(const value of [min,middle,max]){await set(page,label,Number(value.toFixed(6)));await noInvalidGeometry(page);}
    await slider.focus();await slider.press('Home');await expect(number(page,label)).toHaveValue(String(min));
    await slider.press('End');await expect(number(page,label)).toHaveValue(String(max));
  }
}
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>.5;});
  await page.goto('/?renderer=svg');
});
for(const name of tabs){
  test(`${name}: every parameter, playback, graph, visibility and experiment`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await choose(page,name);
    if(name==='Magnetic Fields'){
      for(const source of ['bar','wire','coil','solenoid','earth']){await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption(source);await exerciseInputs(page);}
    }else{
      await exerciseInputs(page);
      if(name==='Moving Charges'||name==='Velocity Selector')for(const particle of ['electron','positive','negative','proton']){await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption(particle);await exerciseInputs(page);}
    }
    await page.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await page.getByRole('button',{name:'Play simulation',exact:true}).click();
    await expect(page.getByRole('button',{name:'Pause simulation'})).toBeVisible();
    await page.getByRole('button',{name:'Pause simulation'}).click();
    const before=await page.locator('.simulation-scene').innerHTML();
    await page.waitForTimeout(120);expect(await page.locator('.simulation-scene').innerHTML()).toBe(before);
    await page.getByRole('button',{name:'Step simulation forward'}).click();
    await expect(page.getByRole('button',{name:'Play simulation'})).toBeVisible();
    await page.getByRole('button',{name:'1×',exact:true}).click();await expect(page.getByRole('button',{name:'0.2×',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'0.2×',exact:true}).click();
    for(const box of await page.locator('.view-toggles input').all()){await box.uncheck();await expect(box).not.toBeChecked();await box.check();}
    const graph=page.locator('.graph');await graph.hover({position:{x:120,y:90}});await expect(page.getByText('Inspecting',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Reset graph inspection'}).click();await expect(page.getByText('Operating point',{exact:true})).toBeVisible();
    if(name==='Magnetic Fields')await page.getByRole('button',{name:'Set up tangent galvanometer'}).click();
    await page.getByRole('button',{name:'Record reading',exact:true}).click();await expect(page.getByText('1 / 12 readings')).toBeVisible();
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export measurements as CSV'}).click();const d=await download;expect(d.suggestedFilename()).toMatch(/magnetism-.*-measurements.csv/);const stream=await d.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk;expect(csv).toContain('Settings');expect(csv.split('\r\n')).toHaveLength(2);
    for(let i=1;i<12;i++)await page.getByRole('button',{name:'Record reading',exact:true}).click();await expect(page.getByRole('button',{name:'Record reading',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Clear measurements'}).click();await expect(page.getByText('0 / 12 readings')).toBeVisible();
    await page.getByRole('button',{name:'Reset parameters'}).click();await noInvalidGeometry(page);expect(errors).toEqual([]);
  });
}
test('2D and compatible SVG 3D layouts, orthographic orbit, reframe and keyboard orbit',async({page})=>{
  for(const name of tabs){
    await choose(page,name);
    await page.getByRole('button',{name:'3D',exact:true}).click();await page.getByRole('button',{name:'Reframe',exact:true}).click();
    const svg=page.locator('.simulation-scene');await svg.scrollIntoViewIfNeeded();const b=(await svg.boundingBox())!,before=await svg.innerHTML();
    await page.mouse.move(b.x+b.width*.82,b.y+b.height*.15);await page.mouse.down();await page.mouse.move(b.x+b.width*.9,b.y+b.height*.28,{steps:6});await page.mouse.up();expect(await svg.innerHTML()).not.toBe(before);
    await page.getByRole('button',{name:'Reframe',exact:true}).click();expect(await svg.innerHTML()).toBe(before);
    await svg.focus();await svg.press('Shift+ArrowRight');expect(await svg.innerHTML()).not.toBe(before);
    await page.getByRole('button',{name:'2D',exact:true}).click();await expect(page.getByText('PLAN VIEW',{exact:true})).toBeVisible();await noInvalidGeometry(page);
  }
});
test('right-hand rule, superposition, charge sign and field reversal stay synchronized',async({page})=>{
  await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('wire');
  const before=await readout(page,'Field at probe');const b=page.locator('[data-vector="B"]');const by=Number(await b.getAttribute('data-y'));
  await set(page,'Current',-5);expect(await readout(page,'Field at probe')).toBe(before);expect(Number(await b.getAttribute('data-y'))).toBe(-by);
  await set(page,'Current',0);expect(await readout(page,'Field at probe')).toBe(0);await expect(page.locator('[data-field-line="source"]')).toHaveCount(0);await expect(b).toHaveCount(0);
  await choose(page,'Resultant Fields');await probe(page,'Observation point P',0,0);expect(await readout(page,'Resultant field')).toBeLessThan(.001);await expect(page.locator('[data-vector="Bnet"]')).toHaveCount(0);
  await set(page,'Wire B current',-5);expect(await readout(page,'Resultant field')).toBeCloseTo(16.7,1);expect(Number(await page.locator('[data-vector="B₁"]').getAttribute('data-y'))).toBeGreaterThan(0);expect(Number(await page.locator('[data-vector="B₂"]').getAttribute('data-y'))).toBeGreaterThan(0);
  await choose(page,'Moving Charges');expect(Number(await page.locator('[data-vector="F"]').getAttribute('data-y'))).toBeLessThan(0);
  await page.getByRole('button',{name:/Reverse field/}).click();expect(Number(await page.locator('[data-vector="F"]').getAttribute('data-y'))).toBeGreaterThan(0);
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');expect(Number(await page.locator('[data-vector="F"]').getAttribute('data-y'))).toBeLessThan(0);
  await set(page,'Launch angle to B',180);expect(await readout(page,'Magnetic force')).toBe(0);await expect(page.locator('[data-vector="F"]')).toHaveCount(0);
  await choose(page,'Motor Effect');expect(await readout(page,'Force · y')).toBe(-30);await page.getByRole('button',{name:'Reverse I',exact:true}).click();expect(await readout(page,'Force · y')).toBe(30);expect(Number(await page.locator('[data-vector="F"]').getAttribute('data-y'))).toBeGreaterThan(0);await page.getByRole('button',{name:'Reverse B',exact:true}).click();expect(await readout(page,'Force · y')).toBe(-30);
  await set(page,'Angle to field',180);expect(await readout(page,'Force magnitude')).toBe(0);
  await choose(page,'Parallel Wires');expect(await readout(page,'Force per length')).toBe(25);await set(page,'Wire separation',40);expect(await readout(page,'Force per length')).toBe(12.5);await set(page,'Wire B current',-5);await expect(page.locator('.behavior-pill')).toContainText('Repulsion');const arrows=await page.locator('[data-vector="F₁/L"],[data-vector="F₂/L"]').evaluateAll(ns=>ns.map(n=>Number(n.getAttribute('data-x'))));expect(arrows).toEqual([-.09,.09]);
});
test('zero fields, stationary particles, exact velocity selection and analyser forces',async({page})=>{
  await choose(page,'Moving Charges');await set(page,'Magnetic field',0);expect(await readout(page,'Magnetic force')).toBe(0);await expect(page.locator('[data-vector="F"]')).toHaveCount(0);await expect(page.locator('.graph')).toContainText('No finite orbit radius');await page.locator('.graph').hover();await noInvalidGeometry(page);
  await page.getByRole('button',{name:'Step simulation forward'}).click();expect(Number(await page.locator('[data-particle="charge"]').getAttribute('data-time'))).toBeGreaterThan(0);
  await set(page,'Particle speed',0);const stationary=await page.locator('[data-particle="charge"] circle').last().getAttribute('cx');await page.getByRole('button',{name:'Step simulation forward'}).click();expect(await page.locator('[data-particle="charge"] circle').last().getAttribute('cx')).toBe(stationary);
  await choose(page,'Velocity Selector');expect(await readout(page,'Net entry force · y')).toBe(0);await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-beam-passes','true');
  await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');expect(await readout(page,'Net entry force · y')).toBe(0);await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-beam-passes','true');
  await set(page,'Electric field',0);await expect(page.locator('[data-vector="Fᴇ"]')).toHaveCount(0);expect(await readout(page,'Net entry force · y')).toBeGreaterThan(0);
  await set(page,'Magnetic field',0);await noInvalidGeometry(page);await expect(page.locator('[data-vector="Fʙ"]')).toHaveCount(0);expect(await readout(page,'Net entry force · y')).toBe(0);
  await page.getByRole('button',{name:'Reset experiment'}).click();await page.getByLabel('Magnetic analyser',{exact:true}).check();
  for(let i=0;i<60;i++){await page.getByRole('button',{name:'Step simulation forward'}).click();if(await page.locator('[data-particle="selector"]').getAttribute('data-stage')==='analyser')break;}
  await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-stage','analyser');await expect(page.locator('[data-vector="Fᴇ"]')).toHaveCount(0);await expect(page.locator('[data-vector="Fʙ"]')).toHaveCount(1);
});
test('complete orbits stay in frame and normal velocity is shown correctly in 2D',async({page})=>{
  await choose(page,'Moving Charges');await page.getByRole('button',{name:'2D',exact:true}).click();
  for(const angle of [0,45,90,180]){await set(page,'Launch angle to B',angle);const bounds=await page.locator('[data-trajectory="charge"]').evaluate((n:SVGGraphicsElement)=>{const b=n.getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};});expect(bounds.x).toBeGreaterThan(0);expect(bounds.y).toBeGreaterThan(0);expect(bounds.right).toBeLessThan(720);expect(bounds.bottom).toBeLessThan(484);if(angle===0||angle===180)await expect(page.locator('[data-vector="v"]')).toHaveAttribute('data-projection','normal');}
});
registerChallenges();

test('accessibility, theme, help focus trap and keyboard controls',async({page})=>{
  for(const light of [false,true]){
    if(light)await page.getByRole('button',{name:'Switch color theme'}).click();
    for(const name of tabs){await choose(page,name);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))).toEqual([]);}
  }
  await page.getByRole('button',{name:'Lab guide'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Start exploring'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close lab guide'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Lab guide'})).toBeFocused();
  await page.getByRole('tab',{name:'Magnetic Fields',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Resultant Fields'})).toHaveAttribute('aria-selected','true');
});
test('desktop, tablet, mobile: all tabs and views fit without clipped controls or text',async({page})=>{
  for(const width of [1536,1024,820,620,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const name of tabs){await choose(page,name);for(const mode of ['2D','3D']){
      await page.getByRole('button',{name:mode,exact:true}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const clipped=await page.locator('.readout strong,.formula,.control-title,.graph-value').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(clipped).toEqual([]);await noInvalidGeometry(page);
    }}
  }
});
test('phone touch dragging uses the SVG viewport, and graph inspection supports touch and keyboard',async({browser})=>{
  const context=await browser.newContext({viewport:{width:320,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await page.goto('/?renderer=svg');await page.getByRole('button',{name:'2D',exact:true}).click();
  const svg=page.locator('.simulation-scene');await svg.scrollIntoViewIfNeeded();
  const start=(await page.getByRole('slider',{name:'Field probe P'}).locator('circle').first().boundingBox())!;
  const target=await svg.evaluate((node:SVGSVGElement)=>{const p=node.createSVGPoint();p.x=360+.25*230/.43;p.y=242-.2*230/.43;const s=p.matrixTransform(node.getScreenCTM()!);return {x:s.x,y:s.y};});
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x+start.width/2,y:start.y+start.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[target]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.getByRole('slider',{name:'Field probe P'})).toHaveAttribute('aria-valuetext','x 0.250 m, y 0.200 m');
  const graph=page.locator('.graph');await graph.scrollIntoViewIfNeeded();const rect=(await graph.boundingBox())!;await page.touchscreen.tap(rect.x+rect.width*.7,rect.y+rect.height*.5);await expect(page.getByText('Inspecting',{exact:true})).toBeVisible();await graph.focus();await graph.press('End');await expect(page.locator('.graph-value')).toContainText('0.4 m');await graph.press('Escape');await expect(page.getByText('Operating point',{exact:true})).toBeVisible();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>v.id)).toEqual([]);
  await page.getByRole('button',{name:'Lab guide',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await context.close();
});
test('particle animation advances, pauses, steps and slows without changing graph or readouts',async({page})=>{
  for(const [name,id] of [['Moving Charges','charge'],['Velocity Selector','selector']]){
    await choose(page,name);const particle=page.locator(`[data-particle="${id}"]`),graph=await page.locator('.graph').innerHTML(),values=await page.locator('.readout-grid').innerText();
    await page.getByRole('button',{name:'Play simulation'}).click();await expect.poll(async()=>Number(await particle.getAttribute('data-time'))).toBeGreaterThan(0);await page.getByRole('button',{name:'Pause simulation'}).click();
    const stopped=await particle.getAttribute('data-time');await page.waitForTimeout(150);expect(await particle.getAttribute('data-time')).toBe(stopped);
    await page.getByRole('button',{name:'Step simulation forward'}).click();expect(await particle.getAttribute('data-time')).not.toBe(stopped);
    await page.getByRole('button',{name:'Reset experiment'}).click();
    const measure=async()=>{await page.getByRole('button',{name:'Play simulation'}).click();await page.waitForTimeout(350);await page.getByRole('button',{name:'Pause simulation'}).click();return Number(await particle.getAttribute('data-time'));};
    const normal=await measure();await page.getByRole('button',{name:'Reset experiment'}).click();await page.getByRole('button',{name:'1×',exact:true}).click();const slow=await measure();expect(slow).toBeLessThan(normal*.5);expect(slow).toBeGreaterThan(0);
    expect(await page.locator('.readout-grid').innerText()).toBe(values);expect(await page.locator('.graph').innerHTML()).toBe(graph);
    await page.getByRole('button',{name:'0.2×',exact:true}).click();
  }
});
test('compass and both wires drag, numeric typing reverses current, and limits clamp',async({page})=>{
  const drag=async(name:string)=>{const handle=page.getByRole('slider',{name,exact:true}),before=await handle.getAttribute('aria-valuetext');await handle.scrollIntoViewIfNeeded();const rect=(await handle.locator('circle').first().boundingBox())!;await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+25,rect.y+rect.height/2+12,{steps:4});await page.mouse.up();expect(await handle.getAttribute('aria-valuetext')).not.toBe(before);};
  await drag('Compass');await choose(page,'Resultant Fields');const before=await readout(page,'Resultant field');await drag('Wire A');await drag('Wire B');expect(await readout(page,'Resultant field')).not.toBe(before);
  await choose(page,'Motor Effect');const input=number(page,'Conductor current');await input.focus();await input.press('ControlOrMeta+A');await input.pressSequentially('-3.5');await input.press('Tab');await expect(input).toHaveValue('-3.5');expect(await readout(page,'Force · y')).toBe(21);
  await number(page,'Magnetic field').fill('1000');await number(page,'Magnetic field').press('Tab');await expect(number(page,'Magnetic field')).toHaveValue('200');
});
test('fast electrons stop at the selector entrance; selected electrons reach the slit',async({page})=>{
  await choose(page,'Velocity Selector');await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('electron');await set(page,'Particle speed',1000);
  await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-termination','entrance');await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-beam-passes','false');await noInvalidGeometry(page);
  await set(page,'Particle speed',100);await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-termination','exit');await expect(page.locator('[data-particle="selector"]')).toHaveAttribute('data-beam-passes','true');expect(await readout(page,'Net entry force · y')).toBe(0);
});
test('reversing B preserves launch velocity while updating the relative launch angle',async({page})=>{
  await choose(page,'Moving Charges');await set(page,'Launch angle to B',45);
  const velocity=page.locator('[data-vector="v"]'),before=Number(await velocity.getAttribute('data-z'));
  await page.getByRole('button',{name:/Reverse field/}).click();await expect(number(page,'Launch angle to B')).toHaveValue('135');
  expect(Number(await velocity.getAttribute('data-z'))).toBeCloseTo(before,10);expect(Number(await page.locator('[data-vector="F"]').getAttribute('data-y'))).toBeGreaterThan(0);
  await choose(page,'Motor Effect');await set(page,'Angle to field',45);const conductor=page.locator('[data-vector="I"]'),orientation=Number(await conductor.getAttribute('data-z'));
  await page.getByRole('button',{name:'Reverse B',exact:true}).click();await expect(number(page,'Angle to field')).toHaveValue('135');expect(Number(await conductor.getAttribute('data-z'))).toBeCloseTo(orientation,10);expect(await readout(page,'Force · y')).toBeGreaterThan(0);
});
