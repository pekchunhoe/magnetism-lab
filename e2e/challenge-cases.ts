import { test, expect, type Page } from '@playwright/test';
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

export function registerChallenges(prefix=''){
for(const [index,name] of tabs.entries()){
  for(let challenge=0;challenge<4;challenge++)test(`${prefix}${name}: challenge ${challenge+1} accepts a solution and rejects a wrong state`,async({page})=>{
    await choose(page,name);for(let i=0;i<challenge;i++)await page.getByRole('button',{name:'Next challenge'}).click();
    await page.getByRole('button',{name:'Hint',exact:true}).click();await expect(page.locator('.hint')).toBeVisible();await page.getByRole('button',{name:'Show solution'}).click();await expect(page.locator('.hint')).toHaveCount(2);
    const check=async()=>{await page.getByRole('button',{name:'Check answer'}).click();await expect(page.getByRole('status')).toContainText('Target reached');};
    const wrong=async()=>{await page.getByRole('button',{name:'Check answer'}).click();await expect(page.getByRole('status')).toContainText('Keep experimenting');};
    if(index===0){
      if(challenge===0){await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('wire');await set(page,'Current',5);await probe(page,'Field probe P',.04,0);await check();await set(page,'Current',1);}
      if(challenge===1){await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('coil');await set(page,'Current',.63662);await check();await set(page,'Current',0);}
      if(challenge===2){await page.getByRole('combobox',{name:'Field source',exact:true}).selectOption('wire');await set(page,'Current',-5);await check();await set(page,'Current',5);}
      if(challenge===3){await probe(page,'Field probe P',.4,.35);await check();await probe(page,'Field probe P',.1,0);}
    }else if(index===1){
      if(challenge===0){await probe(page,'Observation point P',0,0);await check();await set(page,'Wire B current',-5);}
      if(challenge===1){await probe(page,'Observation point P',0,0);await set(page,'Wire B current',-5);await check();await set(page,'Wire B current',5);}
      if(challenge===2){await set(page,'Wire A current',10);await set(page,'Wire B current',0);await probe(page,'Observation point P',-.04,0);await check();await set(page,'Wire A current',1);}
      if(challenge===3){await set(page,'Wire A current',6);await set(page,'Wire B current',3);await check();await set(page,'Wire A current',3);}
    }else if(index===2){
      if(challenge===0){await set(page,'Particle speed',191.577);await check();await set(page,'Particle speed',20);}
      if(challenge===1){await set(page,'Launch angle to B',0);await check();await set(page,'Launch angle to B',90);}
      if(challenge===2){await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');await set(page,'Launch angle to B',45);await check();await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('proton');}
      if(challenge===3){await set(page,'Particle speed',0);await check();await set(page,'Particle speed',200);}
    }else if(index===3){
      if(challenge===0){await set(page,'Conductor current',1.666667);await check();await set(page,'Conductor current',8);}
      if(challenge===1){await check();await set(page,'Angle to field',30);}
      if(challenge===2){await page.getByRole('button',{name:'Reverse I',exact:true}).click();await check();await page.getByRole('button',{name:'Reverse I',exact:true}).click();}
      if(challenge===3){await set(page,'Angle to field',0);await check();await set(page,'Angle to field',90);}
    }else if(index===4){
      if(challenge===0){await set(page,'Wire separation',10);await check();await set(page,'Wire separation',20);}
      if(challenge===1){await set(page,'Wire B current',-5);await check();await set(page,'Wire B current',5);}
      if(challenge===2){await check();await set(page,'Wire B current',4);}
      if(challenge===3){await set(page,'Wire A current',0);await check();await set(page,'Wire A current',5);}
    }else{
      if(challenge===0){await set(page,'Particle speed',125);await set(page,'Electric field',10);await check();await set(page,'Particle speed',200);}
      if(challenge===1){await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('negative');await check();await page.getByRole('combobox',{name:'Particle',exact:true}).selectOption('proton');}
      if(challenge===2){await page.getByLabel('Magnetic analyser',{exact:true}).check();await check();await page.getByLabel('Magnetic analyser',{exact:true}).uncheck();}
      if(challenge===3){await set(page,'Particle speed',50);await check();await set(page,'Particle speed',150);}
    }
    await expect(page.getByRole('status')).toHaveCount(0);await wrong();await noInvalidGeometry(page);
  });
}

}
