import { describe, expect, it } from 'vitest';
import { defaults, selectorState, vec } from '../physics/magnetism/core';
import { selectorTrajectory } from '../physics/magnetism/trajectories';
import { SELECTOR, SELECTOR_SOLIDS } from '../physics/magnetism/selector-geometry';
import { sampleBeam, selectorResult } from '../physics/magnetism/visualization';

const base=defaults('selector');
describe('physical 0.10 mm exit aperture',()=>{
  it('changes only the exit opening and preserves the entrance and field dimensions',()=>{
    expect(2*SELECTOR.slitHalfHeight).toBe(.0001);expect(SELECTOR.entranceSlitHalfHeight).toBe(.014);
    expect(SELECTOR.exit-SELECTOR.entrance).toBeCloseTo(.3,14);expect(SELECTOR.halfHeight).toBe(.115);
    expect(SELECTOR.wallThickness).toBe(.009);expect(SELECTOR.particleRadius).toBe(0);
    for(const solid of SELECTOR_SOLIDS.filter(s=>s.kind!=='plate')){
      const expected=solid.kind==='slit'?.00005:.014;
      expect(Math.abs(solid.centre.y)-solid.size[1]/2).toBeCloseTo(expected,15);
      expect(solid.size[2]).toBe(.15);
    }
  });
  it('measures the specified integer sweep and checks each collision against analytical motion and a real solid',()=>{
    const counts:Record<string,number>={};let accepted=0;
    for(let speedKm=0;speedKm<=1000;speedKm++){
      const p={...base,speed:speedKm*1000},beam=selectorTrajectory(p);
      counts[beam.termination]=(counts[beam.termination]??0)+1;
      if(beam.passes){accepted++;expect(speedKm).toBe(100);}
      const hit=beam.collision;
      if(!hit)continue;
      const end=beam.samples.at(-1)!,exit=beam.selectorEnd;
      const expected=end.stage==='selector'?selectorState(p,end.time).position:vec(exit.position.x+exit.velocity.x*(end.time-exit.time),exit.position.y+exit.velocity.y*(end.time-exit.time));
      if(end.stage==='selector')expected.x+=SELECTOR.entrance;
      expect(end.position.x).toBeCloseTo(expected.x,11);expect(end.position.y).toBeCloseTo(expected.y,11);
      const solid=SELECTOR_SOLIDS.find(s=>s.kind===hit.kind&&s.side===hit.side)!;
      for(const [i,key] of (['x','y','z'] as const).entries())expect(Math.abs(end.position[key]-solid.centre[key])).toBeLessThanOrEqual(solid.size[i]/2+1e-11);
    }
    expect(accepted).toBe(1);expect(counts).toEqual({slit:519,exit:1,'missed-slit':5,'entrance-wall':16,plate:460});
  });
  it('allows real off-speed transmission and rejects outside the measured finite passband',()=>{
    for(const speedKm of [99.311,99.5,99.999,100,100.001,100.5,100.721]){
      const p={...base,speed:speedKm*1000},beam=selectorTrajectory(p);
      expect(beam.passes).toBe(true);expect(beam.collision).toBeNull();
      if(speedKm!==100){expect(beam.velocityMatched).toBe(false);expect(selectorResult(beam)).toContain('off-selected velocity');}
      const exit=beam.selectorEnd;
      for(const s of beam.samples.filter(s=>s.stage==='drift')){
        expect(s.velocity).toEqual(exit.velocity);expect(s.position.y).toBeCloseTo(exit.position.y+(s.position.x-.02)*exit.velocity.y/exit.velocity.x,12);
      }
    }
    for(const speedKm of [99.310,100.722,150,200,240]){
      const beam=selectorTrajectory({...base,speed:speedKm*1000});expect(beam.passes).toBe(false);expect(beam.collision?.kind).toBe('slit');
    }
  });
  it('does not invent a collision or stop at the rear plane when the ray bypasses the finite wall',()=>{
    for(const speedKm of [336,337,338,339,340]){
      const p={...base,speed:speedKm*1000},beam=selectorTrajectory(p),end=beam.samples.at(-1)!;
      expect(beam.passes).toBe(false);expect(beam.collision).toBeNull();expect(beam.termination).toBe('missed-slit');
      expect(end.stage).toBe('drift');expect(end.position.x).toBeCloseTo(.24,12);expect(end.position.y).toBeGreaterThan(.115);
      expect(selectorResult(beam)).toContain('bypassed exit wall');expect(sampleBeam(p,beam,100).position).toEqual(end.position);
      const analyser=selectorTrajectory({...p,analyser:true});expect(analyser.samples.at(-1)!.stage).toBe('analyser');expect(analyser.collision).toBeNull();
    }
  });
  it('a very fast electric-only particle hits the exit wall even with a single large playback step',()=>{
    const p={...base,speed:1e6,field:0,electric:1000},beam=selectorTrajectory(p),end=beam.samples.at(-1)!;
    const t=.3/1e6,ay=-p.charge*1000/p.mass,hitTime=t+.0155/1e6;
    expect(beam.collision?.kind).toBe('slit');expect(end.time).toBeCloseTo(hitTime,17);
    expect(end.position.x).toBeCloseTo(.0355,13);expect(end.position.y).toBeCloseTo(ay*t*t/2+ay*t*(hitTime-t),13);
    for(const clock of [10,100])expect(sampleBeam(p,beam,clock).position).toEqual(end.position);
  });
});
