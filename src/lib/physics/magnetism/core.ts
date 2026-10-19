import type { Vec, Params, TabId } from '../../../types/magnetism';
export const MU0 = 4 * Math.PI * 1e-7;
export const E_CHARGE = 1.602176634e-19;
export const PROTON_MASS = 1.67262192369e-27;
export const ELECTRON_MASS = 9.1093837139e-31;
export const EARTH_B = 25e-6;
export const vec = (x = 0, y = 0, z = 0): Vec => ({ x, y, z });
export const add = (a: Vec, b: Vec): Vec => vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const scale = (a: Vec, n: number): Vec => vec(a.x*n,a.y*n,a.z*n);
export const magnitude = (a: Vec) => Math.hypot(a.x,a.y,a.z);
export const cross = (a: Vec,b: Vec): Vec => vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const unit = (a: Vec) => scale(a, 1/(magnitude(a)||1));
export const rad = (deg: number) => deg*Math.PI/180;
export const rotate = (p: Vec, angle: number): Vec => vec(p.x*Math.cos(angle)-p.y*Math.sin(angle),p.x*Math.sin(angle)+p.y*Math.cos(angle),p.z);
export function wireField(current: number, p: Vec, centre = vec()): Vec {
  const x=p.x-centre.x,y=p.y-centre.y,r2=x*x+y*y;
  // Finite conductor core: outside 2 mm use the ideal long-wire field.
  return vec(-MU0*current*y/(2*Math.PI*Math.max(r2,4e-6)),MU0*current*x/(2*Math.PI*Math.max(r2,4e-6)),0);
}
export const coilCentre = (n: number,i: number,r: number) => MU0*n*i/(2*Math.max(r,1e-6));
export const solenoidField = (n: number,i: number,l: number,end=false) => MU0*n*i/Math.max(l,1e-6)*(end?0.5:1);
export function coilField(p: Vec, radius: number, current: number, turns: number, centreX=0): Vec {
  // Biot–Savart midpoint quadrature, loop axis is +x. SI throughout.
  let b=vec(); const count=48, da=2*Math.PI/count;
  for(let j=0;j<count;j++) {
    const a=(j+0.5)*da;
    const r=vec(p.x-centreX,p.y-radius*Math.cos(a),p.z-radius*Math.sin(a));
    const dl=vec(0,-radius*Math.sin(a)*da,radius*Math.cos(a)*da);
    b=add(b,scale(cross(dl,r),MU0*current*turns/(4*Math.PI*Math.max(magnitude(r),0.003)**3)));
  }
  return b;
}
export function sourceField(p: Params, position: Vec): Vec {
  const angle=rad(p.orientation), local=rotate(position,-angle); let b: Vec;
  switch(p.source) {
    case 'wire': b=wireField(p.current,local); break;
    case 'coil': b=coilField(local,p.radius,p.current,p.turns); break;
    case 'solenoid': {
      if(Math.hypot(local.y,local.z)<1e-9) {
        const left=local.x+p.length/2,right=local.x-p.length/2;
        b=vec(MU0*p.turns*p.current/(2*p.length)*(left/Math.hypot(p.radius,left)-right/Math.hypot(p.radius,right)));
        break;
      }
      b=vec(); const rings=Math.max(20,Math.min(80,Math.ceil(5*p.length/p.radius)));
      for(let j=0;j<rings;j++) b=add(b,coilField(local,p.radius,p.current,p.turns/rings,((j+0.5)/rings-0.5)*p.length));
      break;
    }
    case 'earth': b=vec(0,EARTH_B,0); break;
    default: {
      // Dipole approximation outside the magnet; core is excluded from probing.
      const r=Math.max(magnitude(local),0.065), mdotr=local.x/r;
      b=scale(add(scale(local,3*mdotr/r),vec(-1,0,0)),1e-7*0.6/r**3);
    }
  }
  return rotate(b,angle);
}
export const resultant = (p: Params, at=p.probe) => add(wireField(p.current,at,p.wire1),wireField(p.current2,at,p.wire2));
export const sine = (angle:number) => angle===0||angle===180?0:Math.sin(rad(angle));
export const cosine = (angle:number) => angle===90?0:Math.cos(rad(angle));
export const magneticForce = (q: number,v: number,b: number,angle: number) => Math.abs(q)*v*Math.abs(b)*sine(angle);
export const radius = (m: number,v: number,q: number,b: number) => Number.isNaN(v)?NaN:Math.abs(q*b)>0 ? m*Math.abs(v)/Math.abs(q*b) : Infinity;
export const period = (m: number,q: number,b: number) => Math.abs(q*b)>0 ? 2*Math.PI*m/Math.abs(q*b) : Infinity;
export const motorForce = (p: Params) => -p.fieldSign*p.field*p.current*p.length*sine(p.angle);
export const wireForce = (p: Params) => MU0*p.current*p.current2/(2*Math.PI*p.separation);
export const selectorForce = (p: Params) => p.charge*(p.speed*p.field-p.electric);
export const selectedSpeed = (p: Params) => p.field>0?p.electric/p.field:p.electric>0?Infinity:NaN;
export const deflectionAngle = (p: Params) => Math.atan2(coilCentre(p.turns,p.current,p.radius),EARTH_B)*180/Math.PI;
export function particlePosition(p: Params,t: number): Vec {
  const w=p.charge*p.field*p.fieldSign/p.mass,vp=p.speed*sine(p.angle),vz=p.fieldSign*p.speed*cosine(p.angle);
  if(Math.abs(w)<1e-12) return vec(vp*t,0,vz*t);
  return vec(vp*Math.sin(w*t)/w,vp*(Math.cos(w*t)-1)/w,vz*t);
}
export function selectorPosition(p: Params,t: number): Vec {
  return selectorState(p,t).position;
}
/** Exact Lorentz solution in SI: v(0) = (speed,0,0), E = -y, B = -z.
 * Stable near B=0 and E=vB; no frame-sized numerical integration steps. */
export function selectorState(p: Params,t: number) {
  const w=p.charge*p.field/p.mass,a=p.charge*(p.speed*p.field-p.electric)/p.mass,u=w*t;
  if(a===0)return {position:vec(p.speed*t),velocity:vec(p.speed)};
  const sinc=Math.abs(u)<1e-4?1-u*u/6+u**4/120:Math.sin(u)/u;
  const cosc=Math.abs(u)<1e-4?.5-u*u/24+u**4/720:2*(Math.sin(u/2)/u)**2;
  const sincc=Math.abs(u)<1e-3?1/6-u*u/120+u**4/5040:(u-Math.sin(u))/u**3;
  return {position:vec(p.speed*t-a*w*t**3*sincc,a*t*t*cosc),velocity:vec(p.speed-a*w*t*t*cosc,a*t*sinc)};
}
export function format(value: number,unit=''): string {
  if(Number.isNaN(value)) return '—';
  if(!Number.isFinite(value)) return `∞${unit?' '+unit:''}`;
  if(value===0) return `0${unit?' '+unit:''}`;
  const a=Math.abs(value);
  if(a>=1e5 || a<0.001) return `${value.toExponential(2)}${unit?' '+unit:''}`;
  return `${Number(value.toPrecision(3))}${unit?' '+unit:''}`;
}
export function defaults(tab: TabId): Params {
  return { source:'bar',current:5,current2:5,turns:100,radius:0.08,length:0.3,separation:0.2,angle:90,orientation:0,
    field:tab==='selector'?0.08:0.02,speed:tab==='selector'?100000:200000,mass:PROTON_MASS,charge:E_CHARGE,electric:8000,
    particle:'proton',analyser:false,end:false,fieldSign:1,probe:vec(0.18,0.1),wire1:vec(-0.12,0),wire2:vec(0.12,0),compass:vec(-0.18,-0.12) };
}
