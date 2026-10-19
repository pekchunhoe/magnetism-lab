import type { Params, TabId, Vec } from '../../../types/magnetism';
import { add, cross, magnitude, motorForce, particlePosition, rad, rotate, scale, selectorPosition, sourceField, unit, vec, wireField } from './core';
import { analyserState, particleDuration, particleVelocity, selectorForces, selectorTrajectory, selectorVelocity, SELECTOR } from './trajectories';

export type Beam = ReturnType<typeof selectorTrajectory>;
export interface MotionSample { position:Vec; velocity:Vec; force:Vec; electric:Vec; magnetic:Vec; time:number; fraction:number; stage:string; complete?:boolean }
export const SELECTOR_FLIGHT_SECONDS=10/3;
export function selectorResult(beam:Beam) {
  if(beam.termination==='stationary')return 'Particle stationary';
  if(beam.termination==='plate')return 'Rejected: plate collision';
  if(beam.termination==='entrance-wall')return 'Rejected: entrance wall collision';
  if(beam.termination==='missed-slit')return 'Rejected: missed exit aperture';
  if(beam.termination==='entrance')return 'Returned through entrance';
  if(!beam.passes)return 'Rejected: exit slit collision';
  return beam.samples.at(-1)!.stage==='analyser'?'Detected at analyser':'Detected after selector';
}
export const tuple=(v:Vec):[number,number,number]=>[v.x,v.y,v.z];
export const chargePath=(p:Params,count=361)=>Array.from({length:count},(_,i)=>particlePosition(p,particleDuration(p)*i/(count-1)));
export function sampleCharge(p:Params,clock:number):MotionSample {
  const fraction=((clock*.2)%1+1)%1,time=particleDuration(p)*fraction,velocity=particleVelocity(p,time);
  const force=scale(cross(velocity,vec(0,0,p.field*p.fieldSign)),p.charge);
  return {position:particlePosition(p,time),velocity,force,electric:vec(),magnetic:force,time,fraction,stage:'magnetic'};
}
export function sampleBeam(p:Params,beam:Beam,clock:number):MotionSample {
  const fraction=Math.min(1,Math.max(0,clock/SELECTOR_FLIGHT_SECONDS)),time=fraction*beam.duration,complete=fraction===1;
  const exit=beam.selectorEnd;
  const slit=beam.samples.find(s=>s.stage==='gap');
  let position:Vec,velocity:Vec,stage:string;
  if(time<=exit.time){position=add(selectorPosition(p,time),vec(SELECTOR.entrance,0));velocity=selectorVelocity(p,time);stage='selector';}
  else if(!slit||time<=slit.time){const dt=time-exit.time;position=add(exit.position,scale(exit.velocity,dt));velocity=exit.velocity;stage='gap';}
  else {
    const dt=time-slit.time,w=p.charge*p.field/p.mass,v=slit.velocity;
    if(p.analyser&&w!==0){({position,velocity}=analyserState(p,slit,dt));stage='analyser';}
    else{position=add(slit.position,scale(v,dt));velocity=v;stage='drift';}
  }
  // Hold the exact terminal sample, including the snapped collision/return
  // coordinate. Never extrapolate past the apparatus or wrap to the source.
  if(complete)({position,velocity,stage}=beam.samples.at(-1)!);
  const f=selectorForces(p,velocity),electric=stage==='selector'?f.electric:vec(),magnetic=stage==='selector'||stage==='analyser'?f.magnetic:vec();
  // Factor out q before subtraction, just as the entry-force readout does.
  // This avoids a fictitious net arrow from subtracting rounded qE and qvB.
  const force=stage==='selector'?vec(-p.charge*velocity.y*p.field,p.charge*(velocity.x*p.field-p.electric)):stage==='analyser'?magnetic:vec();
  return {position,velocity,force,electric,magnetic,time,fraction,stage,complete};
}
/** First point strictly after the current particle; append the exact head here. */
export function beamTrailIndex(beam:Beam,time:number) {
  let lo=0,hi=beam.samples.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(beam.samples[mid].time<=time)lo=mid+1;else hi=mid;}
  return lo;
}
export function sceneFrame(tab:TabId,p:Params,particlePoints=chargePath(p),beam=selectorTrajectory(p)) {
  let points:Vec[],extent:number,centre=vec();
  if(tab==='charges'||tab==='selector'){
    points=tab==='charges'?particlePoints:[...beam.path,vec(-.4,-.18,-.1),vec(.3,.2,.1)];
    centre=vec(...(['x','y','z'] as const).map(k=>(points.reduce((a,v)=>Math.min(a,v[k]),Infinity)+points.reduce((a,v)=>Math.max(a,v[k]),-Infinity))/2) as [number,number,number]);
    extent=points.reduce((a,v)=>Math.max(a,magnitude(add(v,scale(centre,-1)))),tab==='charges'?.005:.32)*1.12;
  }else extent=tab==='fields'?Math.max(.6,p.source==='solenoid'?p.length*.95:0):tab==='wires'?Math.max(.43,1.3*Math.hypot(p.length/2,p.separation/2)):.43;
  return {centre,extent,factor:2.8/extent};
}

export function circularLine(radius:number,centre=vec(),plane:'xy'|'yz'='xy',sign=1,count=129):Vec[] {
  return Array.from({length:count},(_,i)=>{const a=sign*i/(count-1)*2*Math.PI;return add(centre,plane==='xy'?vec(radius*Math.cos(a),radius*Math.sin(a)):vec(0,radius*Math.cos(a),radius*Math.sin(a)));});
}
const spinX=(p:Vec,a:number)=>vec(p.x,p.y*Math.cos(a)-p.z*Math.sin(a),p.y*Math.sin(a)+p.z*Math.cos(a));

/** Spatial streamlines are integrated from the same B field as the probe. Rotational
 * symmetry reuses meridians for axisymmetric sources, independent of field magnitude. */
export function spatialFieldLines(p:Params,quality:'high'|'low'='high'):Vec[][] {
  if(['wire','coil','solenoid'].includes(p.source)&&p.current===0)return [];
  const density=quality==='high'?6:4,sign=Math.sign(p.current)||1,angle=rad(p.orientation);
  if(p.source==='wire')return [-.18,0,.18].flatMap(z=>(quality==='high'?[.055,.11,.18,.27,.36]:[.08,.18,.3]).map(r=>circularLine(r,vec(0,0,z),'xy',sign)));
  if(p.source==='earth')return [-.22,0,.22].flatMap(z=>[-.3,-.15,0,.15,.3].map(x=>[rotate(vec(x,-.36,z),angle),rotate(vec(x,.36,z),angle)]));
  const canonical={...p,current:1,turns:100,orientation:0};
  const bound=Math.max(.58,p.length*.95),step=Math.min(.007,p.radius/8),steps=quality==='high'?190:135;
  const inSource=(at:Vec)=>p.source==='bar'?Math.abs(at.x)<.101&&Math.hypot(at.y,at.z)<.046:p.source==='coil'?Math.abs(at.x)<.004&&Math.abs(Math.hypot(at.y,at.z)-p.radius)<.005:false;
  const trace=(seed:Vec,direction:number)=>{let at=seed;const result=[at];for(let i=0;i<steps;i++){
    const b=sourceField(canonical,at);if(magnitude(b)<1e-16)break;
    const mid=add(at,scale(unit(b),direction*step*.5)),next=add(at,scale(unit(sourceField(canonical,mid)),direction*step));
    if(inSource(next)||magnitude(next)>bound)break;result.push(next);at=next;
  }return result;};
  const seeds=p.source==='bar'?[.012,.026,.042,.065,.095].map(r=>vec(.104,r)):p.source==='coil'?[.25,.6,1.35,1.9].map(n=>vec(0,p.radius*n)):[.2,.55,1.3,1.9].map(n=>vec(0,p.radius*n));
  const meridians=seeds.map(seed=>p.source==='bar'?trace(seed,1):[...trace(seed,-1).reverse(),...trace(seed,1).slice(1)]).filter(line=>line.length>3);
  return meridians.flatMap(line=>Array.from({length:density},(_,i)=>{let out=line.map(at=>rotate(spinX(at,i/density*2*Math.PI),angle));if(p.source!=='bar'&&sign<0)out=out.reverse();return out;}));
}
export function helixWinding(radius:number,length:number,turns:number) {
  const drawn=Math.min(28,Math.max(8,Math.round(Math.sqrt(turns)*1.5))),count=drawn*32;
  return Array.from({length:count+1},(_,i)=>{const t=i/count,a=t*drawn*2*Math.PI;return vec((t-.5)*length,radius*Math.cos(a),radius*Math.sin(a));});
}
export function staticVectors(tab:TabId,p:Params) {
  if(tab==='fields')return [{label:'B',origin:p.probe,value:sourceField(p,p.probe)}];
  if(tab==='resultant'){const a=wireField(p.current,p.probe,p.wire1),b=wireField(p.current2,p.probe,p.wire2);return [{label:'B₁',origin:p.probe,value:a},{label:'B₂',origin:p.probe,value:b},{label:'Bnet',origin:p.probe,value:add(a,b)}];}
  if(tab==='motor')return [{label:'F',origin:vec(),value:vec(0,motorForce(p),0)}];
  return [];
}
