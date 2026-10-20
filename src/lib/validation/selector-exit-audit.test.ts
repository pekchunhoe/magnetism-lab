import { describe, expect, it } from 'vitest';
import { defaults, selectorState, vec } from '../physics/magnetism/core';
import { selectorTrajectory } from '../physics/magnetism/trajectories';
import { SELECTOR, SELECTOR_SOLIDS, exitApertureTransit, raySolidContact } from '../physics/magnetism/selector-geometry';
import { sampleBeam, selectorResult, SELECTOR_FLIGHT_SECONDS } from '../physics/magnetism/visualization';

const base=defaults('selector'),w=1.602176634e-19*.08/1.67262192369e-27,T=2*Math.PI/w;
const reference=(speed:number,t:number)=>({position:vec(-.28+100000*t+(speed-100000)*Math.sin(w*t)/w,(speed-100000)*(1-Math.cos(w*t))/w),velocity:vec(100000+(speed-100000)*Math.cos(w*t),(speed-100000)*Math.sin(w*t))});
const rows=[
  [100000,3e-6,0,100000,0,0],
  [150000,3.065068893095526e-6,.007007966231370241,96297.48856577389,-49862.72564831795,-.0056781047823029505],
  [200000,3.1220234698737194e-6,.00842413876156238,135445.26425638105,-93507.39672237333,-.008489935217146083],
  [240000,3.1517756141498044e-6,.008100162407811851,177927.91660761886,-116306.66280654776,-.007914824408699908],
];
describe('independent selector exit audit',()=>{
  it('has the proton gyroperiod, spatial drift, cusp and loop conditions',()=>{
    expect(T*1e6).toBeCloseTo(.81993093586,9);
    expect(100000*T).toBeCloseTo(.081993093586,11);
    for(const speed of [100000,150000,200000,240000]){
      for(let i=0;i<=256;i++){
        const t=4*T*i/256,s=selectorState({...base,speed},t),r=reference(speed,t);
        expect(s.position.x-.28).toBeCloseTo(r.position.x,12);expect(s.position.y).toBeCloseTo(r.position.y,12);
        expect(s.velocity.x).toBeCloseTo(r.velocity.x,7);expect(s.velocity.y).toBeCloseTo(r.velocity.y,7);
      }
      const half=selectorState({...base,speed},T/2),full=selectorState({...base,speed},T);
      expect(full.position.y).toBeCloseTo(0,13);expect(full.position.x).toBeCloseTo(100000*T,12);
      if(speed===150000)expect(half.velocity.x).toBe(50000);
      if(speed===200000){expect(Math.hypot(half.velocity.x,half.velocity.y)).toBeLessThan(1e-9);expect(Math.abs(half.position.y)).toBeCloseTo(2*100000/w,12);}
      if(speed===240000)expect(half.velocity.x).toBeLessThan(0);
    }
  });
  for(const [speed,time,y,vx,vy,rearY] of rows)it(`${speed/1000} km/s: exact field exit and physical narrow-aperture outcome`,()=>{
    const p={...base,speed},beam=selectorTrajectory(p),exit=beam.selectorEnd,slit=beam.samples.find(s=>s.stage==='gap')!;
    expect(exit.time).toBeCloseTo(time,17);expect(exit.position.x).toBeCloseTo(.02,13);expect(exit.position.y).toBeCloseTo(y,13);
    expect(exit.velocity.x).toBeCloseTo(vx,7);expect(exit.velocity.y).toBeCloseTo(vy,7);
    const transit=exitApertureTransit(exit.position,exit.velocity);
    expect(transit.rear.y).toBeCloseTo(rearY,13);expect(transit.passes).toBe(speed===100000);
    expect(beam.passes).toBe(speed===100000);expect(beam.velocityMatched).toBe(speed===100000);
    if(speed===100000){expect(beam.collision).toBeNull();expect(slit.position.x).toBeCloseTo(.0445,13);expect(selectorResult(beam)).toContain('selected velocity matched');}
    else{
      expect(beam.collision?.kind).toBe('slit');expect(beam.collision?.side).toBe('lower');
      expect(slit.position.x).toBeCloseTo(.0355,13);
      expect(slit.position.y).toBeCloseTo(y+(.0355-.02)*vy/vx,13);
      expect(selectorResult(beam)).toContain('exit slit collision');expect(beam.samples.some(s=>s.stage==='drift')).toBe(false);
    }
    for(const sample of beam.samples.filter(s=>s.stage==='gap'||s.stage==='drift')){
      expect(sample.velocity).toEqual(exit.velocity);
      expect(sample.position.y).toBeCloseTo(y+(sample.position.x-.02)*vy/vx,12);
    }
    for(const step of [.003,.08,10]){
      for(let clock=0;clock<=SELECTOR_FLIGHT_SECONDS+step;clock+=step){
        const s=sampleBeam(p,beam,clock);
        if(s.stage==='drift'){expect(s.force).toEqual(vec());expect(s.velocity).toEqual(exit.velocity);}
      }
      expect(sampleBeam(p,beam,10).position).toEqual(beam.path.at(-1));
    }
  });
  it('rejects both deflection signs at the first plate or exit wall without tunnelling',()=>{
    for(const sign of [-1,1]){
      const plate=selectorTrajectory({...base,charge:sign*base.charge,field:0,electric:40000});
      const expected=Math.sqrt(2*.115*base.mass/(base.charge*40000));
      expect(plate.collision?.kind).toBe('plate');expect(plate.collision?.time).toBeCloseTo(expected,17);
      expect(plate.collision?.side).toBe(sign===1?'lower':'upper');
      expect(plate.path.at(-1)!.y).toBe(-sign*.115);
      const blocked=selectorTrajectory({...base,charge:sign*base.charge,field:0,electric:100,speed:110000});
      expect(blocked.collision?.kind).toBe('slit');expect(blocked.passes).toBe(false);
      expect(blocked.path.at(-1)!.x).toBeCloseTo(.0355,13);
      expect(sampleBeam({...base,charge:sign*base.charge,field:0,electric:100,speed:110000},blocked,100).position).toEqual(blocked.path.at(-1));
    }
  });
});

describe('physical rectangular slit, closed-solid contact and depth clearance',()=>{
  for(const y of [0,.00005-1e-9,-.00005+1e-9])it(`transmits y=${y} with positive clearance`,()=>{
    const t=exitApertureTransit(vec(.02,y),vec(1e9));expect(t.passes).toBe(true);expect(t.hit).toBe(Infinity);
  });
  for(const y of [.00005,.00005+1e-9,-.00005,-.00005-1e-9])it(`stops exact or outside boundary y=${y} at high speed`,()=>{
    const t=exitApertureTransit(vec(.02,y),vec(1e9));expect(t.passes).toBe(false);
    expect(t.hit).toBeCloseTo((.0355-.02)/1e9,22);
  });
  it('finds inner-surface contact even after the front aperture was clear',()=>{
    // y(front)=10 micrometres; y(rear)=100 micrometres.
    const transit=exitApertureTransit(vec(.02,-.000145),vec(1,.01));
    expect(transit.front.y).toBeCloseTo(.00001,13);expect(transit.hit).toBeCloseTo(.0195,13);expect(transit.passes).toBe(false);
  });
  it('checks depth at both faces and distinguishes a finite-wall bypass from transmission',()=>{
    expect(exitApertureTransit(vec(.02,0,.075-1e-9),vec(1)).passes).toBe(true);
    expect(exitApertureTransit(vec(.02,0,.075),vec(1)).passes).toBe(false);
    const bypass=exitApertureTransit(vec(.02,.03,.076),vec(1));
    expect(bypass.hit).toBe(Infinity);expect(bypass.passes).toBe(false);
    // Cross the front outside its depth and return inside at the rear.
    const oblique=exitApertureTransit(vec(.02,0,.099),vec(1,0,-1));
    expect(oblique.rear.z).toBeLessThan(.075);expect(oblique.front.z).toBeGreaterThan(.075);expect(oblique.passes).toBe(false);
  });
  it('chooses the earliest solid contact, regardless of obstacle order',()=>{
    const at=vec(.02,-.03),velocity=vec(1e9,0);
    const hits=SELECTOR_SOLIDS.map(s=>raySolidContact(at,velocity,s,1));
    expect(Math.min(...hits)).toBeCloseTo(1.55e-11,22);
    expect(Math.min(...hits.reverse())).toBeCloseTo(1.55e-11,22);
    expect(SELECTOR.particleRadius).toBe(0);
  });
});
