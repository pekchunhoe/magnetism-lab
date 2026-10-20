import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { reference } from './selector-narrow-reference.mjs';

const folder='artifacts/selector-ultra-narrow',phase=process.argv[2]||'after';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');
  const speeds=Array.from({length:1001},(_,i)=>i);
  const rows=await page.evaluate(async speeds=>{
    const {defaults}=await import('/src/lib/physics/magnetism/core.ts');
    const {selectorTrajectory}=await import('/src/lib/physics/magnetism/trajectories.ts');
    const {SELECTOR,exitApertureTransit}=await import('/src/lib/physics/magnetism/selector-geometry.ts');
    return speeds.map(speedKm=>{
      const beam=selectorTrajectory({...defaults('selector'),speed:speedKm*1000});
      const exit=beam.selectorEnd,transit=exit.position.x>=.02-1e-12&&exit.velocity.x>0?exitApertureTransit(exit.position,exit.velocity):null;
      return {speedKm,geometry:SELECTOR,sampleCount:beam.samples.length,passes:beam.passes,termination:beam.termination,collision:beam.collision,selectorEnd:exit,aperture:transit?{front:transit.front,rear:transit.rear,clearance:transit.clearance}:null,end:beam.samples.at(-1)};
    });
  },speeds);
  const half=rows[0].geometry.slitHalfHeight;
  let maxPositionError=0,maxTimeError=0;const disagreements=[];
  for(const row of rows){
    const expected=reference(row.speedKm,half);row.reference=expected;
    if(row.passes!==expected.passes||row.termination!==expected.termination)disagreements.push({speed:row.speedKm,actual:row.termination,expected:expected.termination});
    maxTimeError=Math.max(maxTimeError,Math.abs(row.end.time-expected.end.time));
    maxPositionError=Math.max(maxPositionError,...['x','y','z'].map(k=>Math.abs(row.end.position[k]-expected.end.position[k])));
  }
  // Dense independent acceptance scan; it evaluates the same exact trajectory
  // and solid faces without building thousands of redundant rendered trails.
  const fineSpeeds=Array.from({length:4001},(_,i)=>98+i*.001);
  const fine=fineSpeeds.map(s=>reference(s,half));
  const globalFine=Array.from({length:100001},(_,i)=>i*.01).map(speedKm=>{
    const r=reference(speedKm,half);return {speedKm,passes:r.passes,termination:r.termination,clearance:r.clearance??null};
  });
  const bands=scan=>{
    const result=[];let band=null,previous=null;
    for(const row of scan){
      if(row.passes&&!band)band={first:row.speedKm,last:row.speedKm,before:previous?.speedKm??null};
      if(row.passes)band.last=row.speedKm;
      else if(band){band.after=row.speedKm;result.push(band);band=null;}
      previous=row;
    }
    if(band)result.push({...band,after:null});return result;
  };
  const refine=(lo,hi,entering)=>{
    for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(reference(mid,half).passes===entering)hi=mid;else lo=mid;}return (lo+hi)/2;
  };
  const refinedBands=bands(globalFine).map(b=>({...b,lower:b.before===null?b.first:refine(b.before,b.first,true),upper:b.after===null?b.last:refine(b.last,b.after,false)}));
  const counts=rows.reduce((a,r)=>(a[r.termination]=(a[r.termination]||0)+1,a),{}),off=rows.filter(r=>r.speedKm!==100),rejected=off.filter(r=>r.collision!==null).length;
  const summary={phase,geometry:rows[0].geometry,tested:rows.length,offSpeedTested:off.length,offSpeedRejected:rejected,rejectionPercent:100*rejected/off.length,offSpeedNotTransmitted:off.filter(r=>!r.passes).length,bypassSpeeds:off.filter(r=>r.termination==='missed-slit').map(r=>r.speedKm),acceptedIntegerSpeeds:rows.filter(r=>r.passes).map(r=>r.speedKm),counts,maxPositionError,maxTimeError,disagreements,fineStepKm:.001,fineRangeKm:[98,102],fineBands:bands(fine),globalFineStepKm:.01,refinedBands};
  await writeFile(`${folder}/${phase}-sweep.json`,JSON.stringify({summary,rows},null,2));
  await writeFile(`${folder}/${phase}-fine.json`,JSON.stringify({summary,nearSelected:fine,global:globalFine}));
  await writeFile(`${folder}/${phase}-sweep.csv`,['speed_km_s,passes,termination,collision_time_s,endpoint_x_m,endpoint_y_m,minimum_y_clearance_m',...rows.map(r=>[r.speedKm,r.passes,r.termination,r.collision?.time??'',r.end.position.x,r.end.position.y,r.aperture?.clearance.y??''].join(','))].join('\n'));
  if(disagreements.length||maxPositionError>1e-9||maxTimeError>1e-14)throw new Error('Production/reference disagreement: '+JSON.stringify(summary));
  console.log(JSON.stringify(summary,null,2));
}finally{await browser.close();}
