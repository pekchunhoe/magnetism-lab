import { describe, expect, it } from 'vitest';
import { add, cross, defaults, magnitude, scale, selectorState, vec } from '../physics/magnetism/core';

const base={...defaults('selector'),charge:1,mass:1,electric:1,field:1};
describe('independent normalized crossed-field reference: E=-y, B=-z',()=>{
  for(const [name,speed,charge,y] of [['A',1,1,0],['B',1.5,1,.5],['C',.5,1,-.5],['D',1.5,-1,-.5]] as const)
    it(`${name}: displacement, velocity and acceleration match the analytical solution`,()=>{
      const p={...base,speed,charge},t=Math.PI/2,s=selectorState(p,t);
      expect(s.position.x).toBeCloseTo(t+speed-1,13);expect(s.position.y).toBeCloseTo(y,13);
      expect(s.velocity.x).toBeCloseTo(1,13);expect(s.velocity.y).toBeCloseTo(y,13);
      const h=1e-5,derivative=scale(add(selectorState(p,t+h).velocity,scale(selectorState(p,t-h).velocity,-1)),1/(2*h));
      const force=scale(add(vec(0,-p.electric),cross(s.velocity,vec(0,0,-p.field))),charge);
      expect(magnitude(add(derivative,scale(force,-1)))).toBeLessThan(1e-10);
    });
  it('agrees with the reference over multiple full periods, retaining real oscillations',()=>{
    for(const charge of [-1,1])for(const speed of [.5,1,1.5,3])for(let i=0;i<=300;i++){
      const t=i/300*6*Math.PI,w=charge,dv=speed-1,s=selectorState({...base,charge,speed},t);
      expect(s.position.x).toBeCloseTo(t+dv*Math.sin(w*t)/w,12);
      expect(s.position.y).toBeCloseTo(dv*(1-Math.cos(w*t))/w,12);
      expect(s.velocity.x).toBeCloseTo(1+dv*Math.cos(w*t),12);
      expect(s.velocity.y).toBeCloseTo(dv*Math.sin(w*t),12);
    }
  });
});
