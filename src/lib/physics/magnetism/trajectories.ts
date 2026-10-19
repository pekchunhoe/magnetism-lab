import type { Params, Vec } from '../../../types/magnetism';
import { add, cosine, period, sine, selectorPosition, selectorState, vec } from './core';
export function particleDuration(p:Params) {
  const T=period(p.mass,p.charge,p.field);
  return Number.isFinite(T)?T*1.8:0.3/Math.max(p.speed,1000);
}
export function particleVelocity(p:Params,t:number):Vec {
  const w=p.charge*p.field*p.fieldSign/p.mass,vp=p.speed*sine(p.angle);
  return vec(vp*Math.cos(w*t),-vp*Math.sin(w*t),p.fieldSign*p.speed*cosine(p.angle));
}
export function selectorVelocity(p:Params,t:number):Vec {
  return selectorState(p,t).velocity;
}
export function selectorForces(p:Params,v:Vec) {
  return {electric:vec(0,-p.charge*p.electric),magnetic:vec(-p.charge*v.y*p.field,p.charge*v.x*p.field)};
}
export interface BeamSample {position:Vec;velocity:Vec;time:number;stage:'selector'|'gap'|'analyser'|'drift'}
export const SELECTOR={entrance:-.28,exit:.02,halfHeight:.115,slitX:.04,slitHalfHeight:.014,wallThickness:.009};
export const ANALYSER_X=SELECTOR.slitX+SELECTOR.wallThickness/2;
/** The analyser occupies x >= ANALYSER_X, with E=0, B=-z. Its return plane is
 * a detector. The selector B magnitude is reused, but its region is separate. */
export function analyserState(p:Params,start:BeamSample,dt:number) {
  const w=-p.charge*p.field/p.mass,a=w*dt,v=start.velocity;
  if(w===0)return {position:add(start.position,vec(v.x*dt,v.y*dt)),velocity:v};
  const s=Math.sin(a),c=Math.cos(a),oneMinusC=2*Math.sin(a/2)**2;
  return {position:add(start.position,vec((v.x*s+v.y*oneMinusC)/w,(v.y*s-v.x*oneMinusC)/w)),velocity:vec(v.x*c+v.y*s,v.y*c-v.x*s)};
}
function selectorBoundary(p:Params) {
  const length=SELECTOR.exit-SELECTOR.entrance,halfHeight=SELECTOR.halfHeight,omega=Math.abs(p.charge*p.field/p.mass);
  let exit=Infinity,plate=Infinity,entrance=Infinity;
  const crossing=(lo:number,hi:number,predicate:(t:number)=>boolean)=>{for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(predicate(mid))hi=mid;else lo=mid;}return hi;};
  if(omega===0){
    if(p.speed>0)exit=length/p.speed;
    const acceleration=Math.abs(p.charge*p.electric/p.mass);
    if(acceleration>0)plate=Math.sqrt(2*halfHeight/acceleration);
  }else{
    const drift=p.electric/p.field,dv=p.speed-drift,T=2*Math.PI/omega;
    if(2*Math.abs(dv)/omega>=halfHeight)plate=2*Math.asin(Math.sqrt(halfHeight*omega/(2*Math.abs(dv))))/omega;
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
      let hi=length/Math.max(p.speed,drift,1);
      while(selectorPosition(p,hi).x<length)hi*=2;
      exit=crossing(0,hi,t=>selectorPosition(p,t).x>=length);
    }
  }
  // The entrance aperture is a real 9 mm slab, not just a plane. Check the
  // exact y crossings and the first backward face crossing, independently of
  // animation frames or trail resolution. Later cycles drift away from it.
  const h=SELECTOR.wallThickness/2,aperture=SELECTOR.slitHalfHeight;
  const acceleration=Math.abs(p.charge*(p.speed*p.field-p.electric)/p.mass);
  const ratio=acceleration?aperture*omega*omega/(2*acceleration):Infinity;
  const side=omega===0?(acceleration?Math.sqrt(2*aperture/acceleration):Infinity):ratio<=1?2*Math.asin(Math.sqrt(ratio))/omega:Infinity;
  let wall=Infinity;
  for(const t of omega&&Number.isFinite(side)?[side,2*Math.PI/omega-side]:[side]){
    if(!Number.isFinite(t))continue;
    const x=selectorPosition(p,t).x;
    if(x>=0&&x<=h)wall=Math.min(wall,t);
  }
  if(omega){
    const drift=p.electric/p.field,dv=p.speed-drift;
    if(dv>drift){
      const alpha=Math.acos(-drift/dv)/omega,beta=2*Math.PI/omega-alpha;
      if(selectorPosition(p,alpha).x>h&&selectorPosition(p,beta).x<=h){
        const t=crossing(alpha,beta,t=>selectorPosition(p,t).x<=h);
        if(Math.abs(selectorPosition(p,t).y)>=aperture)wall=Math.min(wall,t);
      }
    }
  }
  const time=Math.min(exit,plate,entrance,wall),kind=wall<=time?'entrance-wall':plate<=time?'plate':entrance<=time?'entrance':'exit';
  return Number.isFinite(time)?{time,kind}:{time:1e-6,kind:'stationary'};
}

/** First ray/solid intersection in the field-free gap, including the inner
 * aperture surfaces. A ray can miss the finite wall; it is then not transmitted. */
function slitCollision(start:BeamSample,limit:number) {
  let first=Infinity;
  for(const sign of [-1,1]){
    const lows=[SELECTOR.slitX-SELECTOR.wallThickness/2,sign>0?SELECTOR.slitHalfHeight:-SELECTOR.halfHeight];
    const highs=[ANALYSER_X,sign>0?SELECTOR.halfHeight:-SELECTOR.slitHalfHeight];
    let lo=0,hi=limit;
    for(const [i,key] of (['x','y'] as const).entries()){
      const v=start.velocity[key],at=start.position[key];
      if(v===0){if(at<lows[i]||at>highs[i])hi=-1;}
      else {const a=(lows[i]-at)/v,b=(highs[i]-at)/v;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    }
    if(lo<=hi)first=Math.min(first,lo);
  }
  return first;
}
export function selectorTrajectory(p:Params) {
  const samples:BeamSample[]=[],length=SELECTOR.exit-SELECTOR.entrance,origin=vec(SELECTOR.entrance,0),boundary=selectorBoundary(p),exitTime=boundary.time;
  let lastLocal=vec();
  const put=(time:number,position:Vec,velocity:Vec,stage:BeamSample['stage'])=>samples.push({time,position,velocity,stage});
  const omega=Math.abs(p.charge*p.field/p.mass),orbitRadius=omega?Math.abs(p.speed-p.electric/p.field)/omega:0;
  // Bound visible chord error to 10 micrometres; sub-resolution oscillations
  // deviate by at most 2r. Preserve resolvable cyclotron motion, including loops.
  const tolerance=1e-5,phaseStep=orbitRadius>tolerance/2?4*Math.asin(Math.sqrt(tolerance/(2*orbitRadius))):Infinity;
  const count=Math.max(600,Math.ceil(omega*exitTime/phaseStep));
  for(let i=0;i<=count;i++) {
    const t=exitTime*i/count,at=selectorPosition(p,t);
    if(i===count){if(boundary.kind==='exit')at.x=length;else if(boundary.kind==='entrance')at.x=0;else if(boundary.kind==='plate')at.y=Math.sign(at.y)*SELECTOR.halfHeight;}
    put(t,add(at,origin),selectorVelocity(p,t),'selector');lastLocal=at;
  }
  let passes=false,termination=boundary.kind;
  const exit=samples.at(-1)!,gap=ANALYSER_X-SELECTOR.exit;
  if(boundary.kind==='exit'&&lastLocal.x>=length-1e-8&&exit.velocity.x>0) {
    const dt=gap/exit.velocity.x,hit=slitCollision(exit,dt),travel=Math.min(dt,hit),slit=add(exit.position,vec(exit.velocity.x*travel,exit.velocity.y*travel));
    put(exitTime+travel,slit,exit.velocity,'gap');passes=!Number.isFinite(hit)&&Math.abs(slit.y)<SELECTOR.slitHalfHeight;
    termination=Number.isFinite(hit)?'slit':passes?'exit':'missed-slit';
    if(passes){
      const w=-p.charge*p.field/p.mass,startTime=exitTime+dt;
      if(p.analyser&&Math.abs(w)>0){
        const returnTime=2*Math.atan2(exit.velocity.x,-Math.sign(w)*exit.velocity.y)/Math.abs(w),start=samples.at(-1)!;
        for(let i=1;i<=160;i++){const t=i/160*returnTime,state=analyserState(p,start,t);
          if(i===160)state.position.x=ANALYSER_X;
          put(startTime+t,state.position,state.velocity,'analyser');
        }
      } else {
        for(let i=1;i<=80;i++){const dx=SELECTOR.slitX+.2-ANALYSER_X,t=dx*i/80/exit.velocity.x;put(startTime+t,add(slit,vec(exit.velocity.x*t,exit.velocity.y*t)),exit.velocity,'drift');}
      }
    }
  }
  return {samples,path:samples.map(s=>s.position),passes,duration:samples.at(-1)!.time,termination,selectorEnd:samples[count]};
}
