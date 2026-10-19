import { describe, expect, it } from 'vitest';
import { add, cross, defaults, ELECTRON_MASS, magnitude, period, scale, selectorPosition, selectorState, vec } from '../physics/magnetism/core';
import { analyserState, SELECTOR, selectorTrajectory } from '../physics/magnetism/trajectories';
import { beamTrailIndex, sampleBeam, sceneFrame, SELECTOR_FLIGHT_SECONDS, selectorResult } from '../physics/magnetism/visualization';
import { readings } from '../physics/magnetism/graphs';

const base=defaults('selector');
const distance=(a:ReturnType<typeof vec>,b:ReturnType<typeof vec>)=>magnitude(add(a,scale(b,-1)));
describe('selector Lorentz motion and shared renderer state',()=>{
  it('one flight ends at the exact detector, collision or return point and never wraps',()=>{
    for(const p of [base,{...base,analyser:true},{...base,field:0,electric:40000},{...base,mass:ELECTRON_MASS,charge:-base.charge,speed:1e6},{...base,speed:0,field:0,electric:0}]){
      const beam=selectorTrajectory(p),end=beam.samples.at(-1)!;
      for(const clock of [SELECTOR_FLIGHT_SECONDS,SELECTOR_FLIGHT_SECONDS+.01,SELECTOR_FLIGHT_SECONDS*2,1000]){
        const sample=sampleBeam(p,beam,clock);
        expect(sample.complete).toBe(true);expect(sample.fraction).toBe(1);expect(sample.time).toBe(beam.duration);
        expect(sample.position).toEqual(end.position);expect(sample.velocity).toEqual(end.velocity);expect(sample.stage).toBe(end.stage);
        expect(beamTrailIndex(beam,sample.time)).toBe(beam.samples.length);
      }
      expect(selectorResult(beam).length).toBeGreaterThan(0);
    }
  });
  for(const sign of [-1,1])it(`balanced fields are straight for charge sign ${sign}`,()=>{
    const p={...base,charge:sign*base.charge};
    for(const t of [0,1e-10,1e-7,3e-6]){
      expect(selectorState(p,t)).toEqual({position:vec(p.speed*t,0),velocity:vec(p.speed,0)});
    }
    expect(Math.abs(readings('selector',p)[1].value)).toBe(0);
  });
  it('zero fields and neutral particles produce straight motion',()=>{
    for(const p of [{...base,field:0,electric:0},{...base,charge:0}]){
      expect(selectorState(p,2e-6)).toEqual({position:vec(p.speed*2e-6,0),velocity:vec(100000,0)});
    }
  });
  it('electric-only acceleration and the B approaching zero limit agree in SI',()=>{
    for(const sign of [-1,1])for(const field of [0,1e-20,1e-14]){
      const p={...base,charge:sign*base.charge,field},t=1e-8,a=p.charge*p.electric/p.mass,s=selectorState(p,t);
      expect(s.position.x).toBeCloseTo(p.speed*t,12);
      expect(s.position.y/(a*t*t/2)).toBeCloseTo(1,10);
      expect(s.velocity.y/(a*t)).toBeCloseTo(1,10);
      const beam=selectorTrajectory(p);expect(beam.path.every(v=>Object.values(v).every(Number.isFinite))).toBe(true);
    }
  });
  it('pure magnetic motion is circular, conserves speed, and reverses with charge',()=>{
    for(const sign of [-1,1]){
      const p={...base,electric:0,charge:sign*base.charge},w=p.charge*p.field/p.mass,r=p.speed/Math.abs(w),T=period(p.mass,p.charge,p.field);
      for(let i=0;i<=200;i++){
        const s=selectorState(p,T*i/200);
        expect(Math.hypot(s.position.x,s.position.y+p.speed/w)).toBeCloseTo(r,12);
        expect(magnitude(s.velocity)/p.speed).toBeCloseTo(1,12);
      }
      expect(magnitude(selectorPosition(p,T))).toBeLessThan(1e-12);
      expect(Math.sign(selectorPosition(p,T/4).y)).toBe(-sign);
    }
  });
  it('acceleration equals q(E + v cross B)/m, including transverse velocity',()=>{
    for(const speed of [50000,200000,1000000])for(const field of [.04,.08,.16]){
      const p={...base,speed,field},t=1e-8,h=1e-12,s=selectorState(p,t);
      const derivative=scale(add(selectorState(p,t+h).velocity,scale(selectorState(p,t-h).velocity,-1)),1/(2*h));
      const expected=scale(add(vec(0,p.electric),cross(s.velocity,vec(0,0,p.field))),p.charge/p.mass);
      expect(distance(derivative,expected)/Math.max(1,magnitude(expected))).toBeLessThan(1e-8);
    }
    expect(selectorPosition({...base,speed:50000},1e-8).y).toBeGreaterThan(0);
    expect(selectorPosition({...base,speed:200000},1e-8).y).toBeLessThan(0);
    const weak=selectorPosition({...base,electric:0,field:.04},1e-9),strong=selectorPosition({...base,electric:0,field:.08},1e-9);
    expect(Math.abs(strong.y/weak.y)).toBeCloseTo(2,4);
  });
  it('valid crossed-field loops survive until the first physical boundary',()=>{
    const p={...base,speed:300000},beam=selectorTrajectory(p);
    expect(beam.samples.some(s=>s.stage==='selector'&&s.velocity.x<0)).toBe(true);
    expect(beam.termination).toBe('exit');
    expect(beam.samples.filter(s=>s.stage==='selector').every(s=>s.position.x>=SELECTOR.entrance&&Math.abs(s.position.y)<SELECTOR.halfHeight)).toBe(true);
  });
  it('dense trajectories can be framed without exceeding the JavaScript argument limit',()=>{
    const beam=selectorTrajectory(base),path=Array.from({length:150000},(_,i)=>vec(-.28+.3*i/149999));
    const frame=sceneFrame('selector',base,[],{...beam,path});
    expect(Number.isFinite(frame.factor)).toBe(true);expect(frame.factor).toBeGreaterThan(0);
  });
  it('aperture transmission and collisions occur at actual plates or slit',()=>{
    expect(selectorTrajectory(base).passes).toBe(true);
    const plate=selectorTrajectory({...base,field:0,electric:40000});
    expect(plate.termination).toBe('plate');expect(Math.abs(plate.path.at(-1)!.y)).toBe(SELECTOR.halfHeight);
    const blocked=selectorTrajectory({...base,speed:110000,field:0,electric:100});
    expect(blocked.termination).toBe('exit');expect(blocked.passes).toBe(false);
    expect(blocked.path.at(-1)!.x).toBeCloseTo(SELECTOR.slitX,12);
    expect(Math.abs(blocked.path.at(-1)!.y)).toBeGreaterThan(SELECTOR.slitHalfHeight);
  });
  it('analyser uses E=0 and stops at its first return plane with transverse entry velocity',()=>{
    for(const sign of [-1,1])for(const speed of [99000,100000,101000]){
      const p={...base,analyser:true,charge:sign*base.charge,speed},beam=selectorTrajectory(p),slit=beam.samples.find(s=>s.stage==='gap')!;
      expect(beam.passes).toBe(true);
      const analyser=beam.samples.filter(s=>s.stage==='analyser');
      for(const s of analyser){
        expect(s.position.x).toBeGreaterThanOrEqual(SELECTOR.slitX-1e-12);
        expect(magnitude(s.velocity)/magnitude(slit.velocity)).toBeCloseTo(1,12);
        expect(distance(s.position,analyserState(p,slit,s.time-slit.time).position)).toBeLessThan(1e-12);
      }
      const end=analyser.at(-1)!;expect(end.position.x).toBeCloseTo(SELECTOR.slitX,12);expect(end.velocity.x).toBeLessThan(0);
      if(speed!==100000)expect(Math.abs((end.time-slit.time)/(period(p.mass,p.charge,p.field)/2)-1)).toBeGreaterThan(1e-4);
    }
  });
  it('all shared samples, trails and forces stay finite across UI extremes',()=>{
    for(const mass of [ELECTRON_MASS,base.mass,1.6605390666e-28,1.6605390666e-25])for(const sign of [-1,1])for(const field of [0,.1,.2])for(const electric of [0,20000,40000])for(const speed of [0,500000,1000000]){
      const p={...base,mass,charge:sign*base.charge,field,electric,speed,analyser:true},beam=selectorTrajectory(p);
      expect(beam.samples.every(s=>[s.time,...Object.values(s.position),...Object.values(s.velocity)].every(Number.isFinite))).toBe(true);
      for(let i=0;i<beam.samples.length-1;i+=Math.max(1,Math.floor(beam.samples.length/17))){
        const point=beam.samples[i],s=sampleBeam(p,beam,point.time/beam.duration/.3);
        expect(distance(s.position,point.position)).toBeLessThan(1e-9);
        const expected=scale(add(s.stage==='selector'?vec(0,p.electric):vec(),cross(s.velocity,vec(0,0,s.stage==='selector'||s.stage==='analyser'?p.field:0))),p.charge);
        expect(distance(s.force,expected)).toBeLessThan(1e-25);
        const index=beamTrailIndex(beam,s.time);expect(index).toBeGreaterThan(0);
        expect(beam.samples[index-1].time).toBeLessThanOrEqual(s.time);
      }
    }
  },20000);
});
