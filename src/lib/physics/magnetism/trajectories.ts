import type { Params, Vec } from '../../../types/magnetism';
import { add, cosine, period, sine, selectorPosition, vec } from './core';
export function particleDuration(p:Params) {
  const T=period(p.mass,p.charge,p.field);
  return Number.isFinite(T)?T*1.8:0.3/Math.max(p.speed,1000);
}
export function particleVelocity(p:Params,t:number):Vec {
  const w=p.charge*p.field*p.fieldSign/p.mass,vp=p.speed*sine(p.angle);
  return vec(vp*Math.cos(w*t),-vp*Math.sin(w*t),p.fieldSign*p.speed*cosine(p.angle));
}
export function selectorVelocity(p:Params,t:number):Vec {
  if(p.field===0)return vec(p.speed,p.charge*p.electric*t/p.mass);
  const w=p.charge*p.field/p.mass,drift=p.electric/p.field,dv=p.speed-drift;
  return vec(drift+dv*Math.cos(w*t),-dv*Math.sin(w*t));
}
export function selectorForces(p:Params,v:Vec) {
  return {electric:vec(0,p.charge*p.electric),magnetic:vec(p.charge*v.y*p.field,-p.charge*v.x*p.field)};
}
export interface BeamSample {position:Vec;velocity:Vec;time:number;stage:'selector'|'gap'|'analyser'|'drift'}
function selectorBoundary(p:Params) {
  const length=.3,halfHeight=.115,omega=Math.abs(p.charge*p.field/p.mass);
  let exit=Infinity,plate=Infinity,entrance=Infinity;
  const crossing=(lo:number,hi:number,predicate:(t:number)=>boolean)=>{for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(predicate(mid))hi=mid;else lo=mid;}return hi;};
  if(omega===0){
    if(p.speed>0)exit=length/p.speed;
    const acceleration=Math.abs(p.charge*p.electric/p.mass);
    if(acceleration>0)plate=Math.sqrt(2*halfHeight/acceleration);
  }else{
    const drift=p.electric/p.field,dv=p.speed-drift,T=2*Math.PI/omega;
    if(2*Math.abs(dv)/omega>=halfHeight)plate=Math.acos(1-halfHeight*omega/Math.abs(dv))/omega;
    if(dv>drift){
      const alpha=Math.acos(-drift/dv),beta=2*Math.PI-alpha,peak=(drift*alpha+dv*Math.sin(alpha))/omega;
      if((drift*beta+dv*Math.sin(beta))/omega < -1e-12)entrance=crossing(Math.PI/omega,beta/omega,t=>selectorPosition(p,t).x<=0);
      if(drift>0||peak>=length){
        // A trajectory repeats each cyclotron period with an added drift displacement.
        // Bracket the first peak that can reach the exit, even for very fast electrons.
        const cycle=drift>0?Math.max(0,Math.ceil((length-peak)/(drift*T)-1e-12)):0;
        const lo=cycle===0?0:(cycle-1)*T+alpha/omega,hi=cycle*T+alpha/omega;
        exit=crossing(lo,hi,t=>selectorPosition(p,t).x>=length);
      }
    }else if(drift>0){
      // Here vx >= 0, so the exit is a unique monotonic crossing.
      exit=crossing(0,(length+Math.abs(dv)/omega)/drift,t=>selectorPosition(p,t).x>=length);
    }
  }
  const time=Math.min(exit,plate,entrance),kind=plate<=exit&&plate<=entrance?'plate':entrance<=exit?'entrance':'exit';
  return Number.isFinite(time)?{time,kind}:{time:1e-6,kind:'stationary'};
}
export function selectorTrajectory(p:Params) {
  const samples:BeamSample[]=[],length=.3,origin=vec(-.28,0),boundary=selectorBoundary(p),exitTime=boundary.time;
  let lastLocal=vec();
  const put=(time:number,position:Vec,velocity:Vec,stage:BeamSample['stage'])=>samples.push({time,position,velocity,stage});
  for(let i=0;i<=600;i++) {
    const t=exitTime*i/600,at=selectorPosition(p,t);
    if(i===600){if(boundary.kind==='exit')at.x=length;else if(boundary.kind==='entrance')at.x=0;else if(boundary.kind==='plate')at.y=Math.sign(at.y)*.115;}
    put(t,add(at,origin),selectorVelocity(p,t),'selector');lastLocal=at;
  }
  let passes=false;
  const exit=samples.at(-1)!,gap=.02;
  if(boundary.kind==='exit'&&lastLocal.x>=length-1e-8&&exit.velocity.x>0) {
    const dt=gap/exit.velocity.x,slit=add(exit.position,vec(gap,exit.velocity.y*dt));
    put(exitTime+dt,slit,exit.velocity,'gap');passes=Math.abs(slit.y)<.014;
    if(passes){
      const w=p.charge*p.field/p.mass,startTime=exitTime+dt;
      if(p.analyser&&Math.abs(w)>0){
        for(let i=1;i<=160;i++){const t=i/160*Math.PI/Math.abs(w),a=w*t,v=exit.velocity;
          put(startTime+t,add(slit,vec((v.x*Math.sin(a)+v.y*(1-Math.cos(a)))/w,(v.y*Math.sin(a)+v.x*(Math.cos(a)-1))/w)),vec(v.x*Math.cos(a)+v.y*Math.sin(a),v.y*Math.cos(a)-v.x*Math.sin(a)),'analyser');
        }
      } else {
        for(let i=1;i<=80;i++){const dx=.2*i/80,t=dx/exit.velocity.x;put(startTime+t,add(slit,vec(dx,exit.velocity.y*t)),exit.velocity,'drift');}
      }
    }
  }
  return {samples,path:samples.map(s=>s.position),passes,duration:samples.at(-1)!.time,termination:boundary.kind};
}
