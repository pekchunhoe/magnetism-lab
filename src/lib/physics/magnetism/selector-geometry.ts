import type { Vec } from '../../../types/magnetism';

/** SI metres. Point particles move in z=0; visible particle spheres are glyphs.
 * These existing apparatus dimensions define both solids and their rendering.
 * There are no side rails at z=+/-apertureHalfDepth. Outside the finite wall
 * depth a ray bypasses the apparatus; that is not aperture transmission. */
export const SELECTOR=Object.freeze({entrance:-.28,exit:.02,halfHeight:.115,slitX:.04,entranceSlitHalfHeight:.014,slitHalfHeight:.00005,wallThickness:.009,apertureHalfDepth:.075,plateHalfDepth:.065,plateThickness:.014,observationX:.24,particleRadius:0});
export const ANALYSER_X=SELECTOR.slitX+SELECTOR.wallThickness/2;
export interface SelectorSolid {kind:'plate'|'entrance-wall'|'slit';side:'upper'|'lower';centre:Vec;size:[number,number,number]}
export const SELECTOR_SOLIDS:SelectorSolid[]=([-1,1] as const).flatMap(sign=>{
  const side=sign>0?'upper':'lower';
  return [
    {kind:'plate',side,centre:{x:(SELECTOR.entrance+SELECTOR.exit)/2,y:sign*(SELECTOR.halfHeight+SELECTOR.plateThickness/2),z:0},size:[SELECTOR.exit-SELECTOR.entrance,SELECTOR.plateThickness,2*SELECTOR.plateHalfDepth]},
    ...[SELECTOR.entrance,SELECTOR.slitX].map(x=>{
      const aperture=x===SELECTOR.entrance?SELECTOR.entranceSlitHalfHeight:SELECTOR.slitHalfHeight;
      return {kind:x===SELECTOR.entrance?'entrance-wall':'slit',side,centre:{x,y:sign*(SELECTOR.halfHeight+aperture)/2,z:0},size:[SELECTOR.wallThickness,SELECTOR.halfHeight-aperture,2*SELECTOR.apertureHalfDepth]};
    }),
  ] as SelectorSolid[];
});

/** Continuous ray/closed box contact, including exact edge and tangent contact.
 * Times are SI seconds, independent of trail samples and animation timesteps. */
export function raySolidContact(position:Vec,velocity:Vec,solid:SelectorSolid,limit:number) {
  let lo=0,hi=limit;
  for(const [i,key] of (['x','y','z'] as const).entries()){
    const low=solid.centre[key]-solid.size[i]/2,high=solid.centre[key]+solid.size[i]/2,v=velocity[key],at=position[key];
    if(v===0){if(at<low||at>high)return Infinity;}
    else{const a=(low-at)/v,b=(high-at)/v;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(lo>hi)return Infinity;
  }
  return lo;
}
export function exitSlitContact(position:Vec,velocity:Vec,limit:number) {
  return Math.min(...SELECTOR_SOLIDS.filter(s=>s.kind==='slit').map(s=>raySolidContact(position,velocity,s,limit)));
}
export function apertureClearance(position:Vec) {
  return {y:SELECTOR.slitHalfHeight-Math.abs(position.y),z:SELECTOR.apertureHalfDepth-Math.abs(position.z)};
}
/** Clearance must hold at both faces; the gap ray is linear in y and z. */
export function exitApertureTransit(position:Vec,velocity:Vec) {
  if(velocity.x<=0)throw new RangeError('Exit transit requires forward velocity');
  const at=(x:number)=>{const t=(x-position.x)/velocity.x;return {x,y:position.y+t*velocity.y,z:position.z+t*velocity.z};};
  const front=at(SELECTOR.slitX-SELECTOR.wallThickness/2),rear=at(ANALYSER_X),a=apertureClearance(front),b=apertureClearance(rear);
  const clearance={y:Math.min(a.y,b.y),z:Math.min(a.z,b.z)},time=(ANALYSER_X-position.x)/velocity.x,hit=exitSlitContact(position,velocity,time);
  return {front,rear,clearance,time,hit,passes:!Number.isFinite(hit)&&clearance.y>0&&clearance.z>0};
}
