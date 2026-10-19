import { describe, expect, it } from 'vitest';
import { add, cross, defaults, ELECTRON_MASS, magnitude, particlePosition, scale, sourceField, vec } from '../physics/magnetism/core';
import { particleVelocity, selectorTrajectory } from '../physics/magnetism/trajectories';
import { chargePath, sampleBeam, sampleCharge, sceneFrame, spatialFieldLines } from '../physics/magnetism/visualization';
import { graphData } from '../physics/magnetism/graphs';
import type { Source } from '../../types/magnetism';

describe('WebGL physical geometry and motion',()=>{
  for(const source of ['bar','wire','coil','solenoid','earth'] as Source[])it(`${source}: spatial streamline directions agree with the SI probe field`,()=>{
    const p={...defaults('fields'),source,orientation:37},lines=spatialFieldLines(p,'low');
    expect(lines.length).toBeGreaterThan(0);expect(lines.some(l=>l.some(v=>Math.abs(v.z)>.001))).toBe(true);
    for(const line of lines)for(let i=1;i<line.length-1;i+=Math.max(1,Math.floor(line.length/12))){
      const tangent=add(line[i+1],scale(line[i-1],-1)),b=sourceField(p,line[i]);
      const dot=(tangent.x*b.x+tangent.y*b.y+tangent.z*b.z)/(magnitude(tangent)*magnitude(b));expect(dot).toBeGreaterThan(.9);
    }
  });
  it('negative currents reverse streamlines and zero current removes them',()=>{
    for(const source of ['wire','coil','solenoid'] as Source[]){const p={...defaults('fields'),source},a=spatialFieldLines(p,'low'),b=spatialFieldLines({...p,current:-p.current},'low');
      // Wire circles use signed angular sampling, other sources reverse integrated paths.
      expect(b).toHaveLength(a.length);expect(spatialFieldLines({...p,current:0},'low')).toEqual([]);
      const line=b[0],i=Math.floor(line.length/2),d=add(line[i+1],scale(line[i-1],-1)),f=sourceField({...p,current:-p.current},line[i]);expect(d.x*f.x+d.y*f.y+d.z*f.z).toBeGreaterThan(0);
    }
  });
  for(const angle of [0,45,90,180])for(const sign of [-1,1])it(`charge ${sign}, angle ${angle}: mesh motion is analytic and conserves speed`,()=>{
    const p={...defaults('charges'),angle,charge:defaults('charges').charge*sign};
    for(const clock of [0,.1,1.3,4.9,6]){const s=sampleCharge(p,clock);expect(s.position).toEqual(particlePosition(p,s.time));expect(s.velocity).toEqual(particleVelocity(p,s.time));expect(magnitude(s.velocity)/p.speed).toBeCloseTo(1,13);expect(s.force).toEqual(scale(cross(s.velocity,vec(0,0,p.field)),p.charge));}
  });
  it('zero B and stationary charges have finite geometry and no magnetic force',()=>{
    for(const p of [{...defaults('charges'),field:0},{...defaults('charges'),speed:0}]){const path=chargePath(p),frame=sceneFrame('charges',p,path);expect(Number.isFinite(frame.factor)).toBe(true);expect(path.every(v=>Object.values(v).every(Number.isFinite))).toBe(true);expect(magnitude(sampleCharge(p,1).force)).toBe(0);}
  });
  it('selector render samples reproduce every stage of validated beam trajectories',()=>{
    for(const p of [defaults('selector'),{...defaults('selector'),analyser:true},{...defaults('selector'),electric:0},{...defaults('selector'),field:0},{...defaults('selector'),charge:-defaults('selector').charge,analyser:true},{...defaults('selector'),mass:ELECTRON_MASS,speed:1e6}]){
      const beam=selectorTrajectory(p);
      for(let i=0;i<beam.samples.length-1;i+=27){const expected=beam.samples[i],actual=sampleBeam(p,beam,expected.time/beam.duration/.3);
        expect(magnitude(add(actual.position,scale(expected.position,-1)))).toBeLessThan(1e-10);expect(magnitude(add(actual.velocity,scale(expected.velocity,-1)))).toBeLessThan(1e-5);
        if(actual.stage!=='selector')expect(magnitude(actual.electric)).toBe(0);if(actual.stage==='gap'||actual.stage==='drift')expect(magnitude(actual.force)).toBe(0);
      }
    }
  });
  it('a balanced selector has exactly zero net arrow for either sign of charge',()=>{
    for(const sign of [-1,1]){const p={...defaults('selector'),charge:sign*defaults('selector').charge};expect(magnitude(sampleBeam(p,selectorTrajectory(p),0).force)).toBe(0);}
  });
  it('the spatial probe graph keeps its depth coordinate',()=>{
    const p={...defaults('fields'),probe:vec(.18,.1,.2)},plot=graphData('fields',p);
    const point=plot.points[20];expect(point.y).toBeCloseTo(magnitude(sourceField(p,vec(point.x,p.probe.y,p.probe.z)))*1e6,10);
  });
});
