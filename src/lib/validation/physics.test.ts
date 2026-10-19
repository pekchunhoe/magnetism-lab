import { describe, it, expect } from 'vitest';
import { add, coilCentre, coilField, defaults, deflectionAngle, EARTH_B, E_CHARGE, format, magneticForce, magnitude, motorForce, particlePosition, period, PROTON_MASS, radius, resultant, selectedSpeed, selectorForce, selectorPosition, solenoidField, sourceField, vec, wireField, wireForce } from '../physics/magnetism/core';
import { createChallenge, near } from '../physics/magnetism/challenges';
import { graphData } from '../physics/magnetism/graphs';
import type { TabId } from '../../types/magnetism';
describe('magnetic fields in SI',()=>{
  it('a 5 A wire produces 10 µT at 10 cm and follows the right hand rule',()=>{const b=wireField(5,vec(.1,0));expect(b.x).toBeCloseTo(0,12);expect(b.y).toBeCloseTo(1e-5,12);});
  it('doubling current doubles B; doubling radius halves B',()=>{expect(magnitude(wireField(10,vec(.1,0)))).toBeCloseTo(2*magnitude(wireField(5,vec(.1,0))),12);expect(magnitude(wireField(5,vec(.2,0)))).toBeCloseTo(magnitude(wireField(5,vec(.1,0)))/2,12);});
  it('coil turns are proportional and Biot–Savart agrees at centre',()=>{expect(coilCentre(200,2,.1)).toBeCloseTo(2*coilCentre(100,2,.1),12);expect(coilField(vec(),.1,2,100).x).toBeCloseTo(coilCentre(100,2,.1),10);});
  it('long-solenoid ideal centre is twice its end',()=>expect(solenoidField(100,2,.3)).toBe(2*solenoidField(100,2,.3,true)));
  it('the numerical finite solenoid approaches the long-solenoid result',()=>{const p={...defaults('fields'),source:'solenoid' as const,length:.8,radius:.02,current:1};expect(magnitude(sourceField(p,vec()))/solenoidField(p.turns,p.current,p.length)).toBeCloseTo(1,1);});
  it('wire singularity is finite and the core centre has zero field',()=>{expect(magnitude(wireField(5,vec()))).toBeCloseTo(0,12);expect(Number.isFinite(magnitude(wireField(5,vec(.000001,0))))).toBe(true);});
  it('tangent galvanometer recovers the horizontal Earth field',()=>{const p={...defaults('fields'),current:.02};const theta=deflectionAngle(p)*Math.PI/180;expect(coilCentre(p.turns,p.current,p.radius)/Math.tan(theta)).toBeCloseTo(EARTH_B,12);});
});
describe('vector superposition',()=>{
  it('equal same-direction currents cancel at their midpoint',()=>{const p={...defaults('resultant'),probe:vec()};expect(magnitude(resultant(p))).toBeCloseTo(0,12);});
  it('current reversal reverses vector components',()=>{const b=wireField(5,vec(.1,.2)),r=wireField(-5,vec(.1,.2));expect(b.x).toBe(-r.x);expect(b.y).toBe(-r.y);});
  it('net equals componentwise vector sum',()=>{const p=defaults('resultant');expect(resultant(p)).toEqual(add(wireField(p.current,p.probe,p.wire1),wireField(p.current2,p.probe,p.wire2)));});
});
describe('moving charge trajectories',()=>{
  const p=defaults('charges');
  it('parallel motion and stationary particles have zero magnetic force',()=>{expect(magneticForce(p.charge,p.speed,p.field,0)).toBeCloseTo(0,12);expect(magneticForce(p.charge,0,p.field,90)).toBeCloseTo(0,12);});
  it('radius is inversely proportional to field',()=>expect(radius(p.mass,p.speed,p.charge,2*p.field)).toBe(radius(p.mass,p.speed,p.charge,p.field)/2));
  it('charge reversal reverses curvature, keeping radius unchanged',()=>{const t=period(p.mass,p.charge,p.field)/4,a=particlePosition(p,t),b=particlePosition({...p,charge:-p.charge},t);expect(a.y).toBeLessThan(0);expect(a.y).toBe(-b.y);expect(a.x).toBeCloseTo(b.x,12);});
  it('returns to its start after one circular orbit',()=>expect(magnitude(particlePosition(p,period(p.mass,p.charge,p.field)))).toBeLessThan(1e-12));
  it('parallel motion advances along B with no transverse deflection',()=>{const at=particlePosition({...p,angle:0},1e-6);expect(at.x).toBeCloseTo(0,12);expect(at.y).toBeCloseTo(0,12);expect(at.z).toBeCloseTo(.2,12);});
});
describe('forces on conductors',()=>{
  const p=defaults('motor');
  it('parallel force is zero and 90 degrees maximizes it',()=>{expect(motorForce({...p,angle:0})).toBeCloseTo(0,12);expect(Math.abs(motorForce(p))).toBeCloseTo(p.field*p.current*p.length,12);expect(Math.abs(motorForce({...p,angle:30}))).toBeCloseTo(Math.abs(motorForce(p))/2,12);});
  it('reversing current or field reverses force',()=>{expect(motorForce({...p,current:-p.current})).toBe(-motorForce(p));expect(motorForce({...p,fieldSign:-1})).toBe(-motorForce(p));});
  it('signed parallel-wire force encodes attraction and repulsion',()=>{const w=defaults('wires');expect(wireForce(w)).toBeGreaterThan(0);expect(wireForce({...w,current2:-w.current2})).toBeLessThan(0);});
  it('parallel-wire force is inversely proportional to separation',()=>{const w=defaults('wires');expect(wireForce({...w,separation:w.separation*2})).toBe(wireForce(w)/2);});
});
describe('crossed fields and analyser',()=>{
  const p=defaults('selector');
  it('balanced beam remains undeflected at E/B for either sign',()=>{for(const charge of [E_CHARGE,-E_CHARGE]){const s={...p,charge,speed:selectedSpeed(p)};expect(selectorForce(s)).toBeCloseTo(0,12);expect(selectorPosition(s,1e-6).y).toBeCloseTo(0,12);expect(selectorPosition(s,1e-6).x).toBeCloseTo(.1,12);}});
  it('charge sign reverses the initial force and path deflection',()=>{const a={...p,speed:2*p.speed},b={...a,charge:-a.charge};expect(selectorForce(a)).toBe(-selectorForce(b));expect(selectorPosition(a,1e-8).y).toBeCloseTo(-selectorPosition(b,1e-8).y,12);});
  it('analyser radius increases linearly with mass',()=>expect(radius(2*PROTON_MASS,p.speed,E_CHARGE,p.field)).toBe(2*radius(PROTON_MASS,p.speed,E_CHARGE,p.field)));
});
describe('challenges, graph generation, and formatting',()=>{
  it('uses relative tolerance, rejecting invalid measurements',()=>{expect(near(10.3,10)).toBe(true);expect(near(11,10)).toBe(false);expect(near(Infinity,10)).toBe(false);});
  const tabs:TabId[]=['fields','resultant','charges','motor','wires','selector'];
  for(const tab of tabs){it(`${tab} has four complete challenge templates`,()=>{for(let i=0;i<4;i++){const c=createChallenge(tab,i,.5);expect(c.title.length).toBeGreaterThan(10);expect(c.hint).toBeTruthy();expect(c.solution).toBeTruthy();expect(typeof c.check(defaults(tab))).toBe('boolean');}});it(`${tab} produces finite, labeled graph samples`,()=>{const g=graphData(tab,defaults(tab));expect(g.points).toHaveLength(101);expect(g.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);expect(g.xUnit).toBeTruthy();expect(g.yUnit).toBeTruthy();});}
  it('checks cancellation and selector targets against actual state',()=>{expect(createChallenge('resultant',0).check({...defaults('resultant'),probe:vec()})).toBe(true);expect(createChallenge('selector',1).check({...defaults('selector'),charge:-E_CHARGE})).toBe(true);});
  it('shows sensible precision, scientific notation, and undefined-radius infinity',()=>{expect(format(0,'T')).toBe('0 T');expect(format(1.23456,'A')).toBe('1.23 A');expect(format(1e-19,'N')).toBe('1.00e-19 N');expect(format(Infinity,'m')).toBe('∞ m');});
});
