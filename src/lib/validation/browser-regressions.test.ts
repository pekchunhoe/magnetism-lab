import { describe, expect, it } from 'vitest';
import { defaults, ELECTRON_MASS, format, magneticForce, motorForce, particlePosition, period, vec } from '../physics/magnetism/core';
import { ANALYSER_X, particleDuration, particleVelocity, selectorForces, selectorTrajectory, selectorVelocity } from '../physics/magnetism/trajectories';
import { createChallenge } from '../physics/magnetism/challenges';
import { graphData, readings } from '../physics/magnetism/graphs';
describe('browser audit regressions',()=>{
  it('180 degree alignment has exactly zero transverse velocity, radius and force',()=>{
    const p={...defaults('charges'),angle:180};
    expect(Math.abs(magneticForce(p.charge,p.speed,p.field,p.angle))).toBe(0);
    expect(Math.abs(particlePosition(p,1e-7).x)).toBe(0);
    expect(Math.abs(particleVelocity(p,1e-7).x)).toBe(0);
    expect(readings('charges',p)[1].value).toBe(0);
    expect(graphData('charges',p).points.every(p=>p.y===0)).toBe(true);
    expect(Math.abs(motorForce({...defaults('motor'),angle:180}))).toBe(0);
  });
  it('zero magnetic field gives a finite straight animation and zero force',()=>{
    const p={...defaults('charges'),field:0};
    const t=particleDuration(p);expect(Number.isFinite(t)).toBe(true);expect(t).toBeGreaterThan(0);
    const at=particlePosition(p,t);expect(at.x).toBeCloseTo(.3,12);expect(at.y).toBe(0);
    expect(particleVelocity(p,t)).toEqual(vec(p.speed,-0,0));
  });
  it('undefined measurements display a dash rather than infinity',()=>expect(format(NaN,'µT')).toBe('—'));
  it('selector forces use instantaneous Lorentz components, including transverse motion',()=>{
    const p=defaults('selector'),v=vec(120000,5000),f=selectorForces(p,v);
    expect(f.electric.y).toBe(-p.charge*p.electric);expect(f.magnetic.x).toBe(-p.charge*5000*p.field);expect(f.magnetic.y).toBe(p.charge*120000*p.field);
    expect(Math.abs(selectorForces({...p,electric:0},v).electric.y)).toBe(0);
    expect(Math.abs(selectorForces({...p,field:0},v).magnetic.x)).toBe(0);
  });
  it('the undeflected beam reaches the back of the actual slit at x = 0.0445 m and keeps exit speed',()=>{
    const p={...defaults('selector'),analyser:true},beam=selectorTrajectory(p),slit=beam.samples.find(s=>s.stage==='gap')!;
    expect(beam.passes).toBe(true);expect(slit.position.x).toBeCloseTo(ANALYSER_X,10);expect(slit.position.y).toBe(0);
    const analyser=beam.samples.filter(s=>s.stage==='analyser');expect(analyser.length).toBe(160);
    for(const sample of analyser)expect(Math.hypot(sample.velocity.x,sample.velocity.y)).toBeCloseTo(p.speed,6);
    expect(analyser.at(-1)!.position.y).toBeGreaterThan(0);
    const reverse=selectorTrajectory({...p,charge:-p.charge});expect(reverse.passes).toBe(true);expect(reverse.samples.at(-1)!.position.y).toBeLessThan(0);
  });
  it('unbalanced analyser entrance retains the actual transverse exit velocity',()=>{
    const p={...defaults('selector'),analyser:true,speed:100100};const beam=selectorTrajectory(p),exit=beam.samples.filter(s=>s.stage==='selector').at(-1)!;
    expect(exit.velocity).toEqual(selectorVelocity(p,exit.time));expect(exit.velocity.y).not.toBe(0);
    const a=beam.samples.find(s=>s.stage==='analyser');expect(a).toBeDefined();
    expect(Math.hypot(a!.velocity.x,a!.velocity.y)).toBeCloseTo(Math.hypot(exit.velocity.x,exit.velocity.y),6);
  });
  it('with both fields off, a moving beam drifts straight and a stationary beam stays put',()=>{
    const p={...defaults('selector'),field:0,electric:0,analyser:true};const beam=selectorTrajectory(p);
    expect(beam.passes).toBe(true);expect(beam.path.every(v=>v.y===0&&Number.isFinite(v.x))).toBe(true);
    expect(beam.samples.some(s=>s.stage==='analyser')).toBe(false);
    const stationary=selectorTrajectory({...p,speed:0});expect(stationary.passes).toBe(false);expect(stationary.path.every(v=>v.x===-.28&&v.y===0)).toBe(true);
  });
  it('a stationary particle cannot satisfy the analyser-beam challenge',()=>expect(createChallenge('selector',2).check({...defaults('selector'),electric:0,speed:0,analyser:true})).toBe(false));
  it('a fast electron returning through the entrance cannot later drift to the detector',()=>{
    const p={...defaults('selector'),mass:ELECTRON_MASS,charge:-defaults('selector').charge,speed:1000000};
    const beam=selectorTrajectory(p),end=beam.samples.at(-1)!;
    expect(beam.passes).toBe(false);expect(end.time).toBeLessThan(period(p.mass,p.charge,p.field));expect(end.position.x).toBeCloseTo(-.28,10);
  });
  it('selector paths stop at their first apparatus boundary across field, speed and charge ranges',()=>{
    for(const mass of [ELECTRON_MASS,defaults('selector').mass])for(const sign of [-1,1])for(const field of [0,.001,.08,.2])for(const electric of [0,8000,40000])for(const speed of [0,100000,1000000]){
      const p={...defaults('selector'),mass,charge:sign*defaults('selector').charge,field,electric,speed};
      const beam=selectorTrajectory(p),inside=beam.samples.filter(s=>s.stage==='selector');
      expect(inside.every(s=>Number.isFinite(s.position.x)&&Number.isFinite(s.position.y))).toBe(true);
      expect(inside.every(s=>s.position.x>=-.28-1e-9&&s.position.x<=.02+1e-9&&Math.abs(s.position.y)<=.115+1e-9)).toBe(true);
      if(beam.termination==='entrance')expect(beam.passes).toBe(false);
    }
  });
  it('launch angle is relative to B, with reversal preserving the initial velocity when the angle complements',()=>{
    for(const fieldSign of [-1,1])for(const angle of [0,45,90,135,180]){
      const p={...defaults('charges'),fieldSign,angle},v=particleVelocity(p,0);
      expect(v.z*fieldSign/p.speed).toBeCloseTo(Math.cos(angle*Math.PI/180),12);
      const reversed=particleVelocity({...p,fieldSign:-fieldSign,angle:180-angle},0);
      expect(reversed.x).toBeCloseTo(v.x,7);expect(reversed.z).toBeCloseTo(v.z,7);
    }
  });
});
