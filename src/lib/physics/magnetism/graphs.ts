import type { Params, PlotData, TabId, Reading } from '../../../types/magnetism';
import { sourceField, magnitude, vec, resultant, radius, magneticForce, period, motorForce, wireForce, selectedSpeed, selectorForce, wireField, sine } from './core';
export function readings(tab: TabId,p: Params): Reading[] {
  switch(tab) {
    case 'fields': return [{label:'Field at probe',value:magnitude(sourceField(p,p.probe))*1e6,unit:'µT',color:'mint'},{label:'Probe distance',value:magnitude(p.probe)*100,unit:'cm'},p.source==='bar'?{label:'Source rotation',value:p.orientation,unit:'°'}:p.source==='earth'?{label:'Horizontal field',value:25,unit:'µT'}:{label:'Current',value:p.current,unit:'A'}];
    case 'resultant': return [{label:'Resultant field',value:magnitude(resultant(p))*1e6,unit:'µT',color:'mint'},{label:'Field · wire A',value:magnitude(wireField(p.current,p.probe,p.wire1))*1e6,unit:'µT'},{label:'Field · wire B',value:magnitude(wireField(p.current2,p.probe,p.wire2))*1e6,unit:'µT'}];
    case 'charges': return [{label:'Magnetic force',value:magneticForce(p.charge,p.speed,p.field,p.angle),unit:'N',color:'mint'},{label:'Gyroradius',value:radius(p.mass,p.speed*sine(p.angle),p.charge,p.field)*100,unit:'cm'},{label:'Cyclotron period',value:period(p.mass,p.charge,p.field)*1e6,unit:'µs'}];
    case 'motor': return [{label:'Force magnitude',value:Math.abs(motorForce(p))*1000,unit:'mN',color:'mint'},{label:'Force · y',value:motorForce(p)*1000,unit:'mN'},{label:'Active length',value:p.length*100,unit:'cm'}];
    case 'wires': return [{label:'Force per length',value:Math.abs(wireForce(p))*1e6,unit:'µN/m',color:'mint'},{label:'Total force',value:Math.abs(wireForce(p))*p.length*1e6,unit:'µN'},{label:'Separation',value:p.separation*100,unit:'cm'}];
    case 'selector': return [{label:'Selected speed',value:selectedSpeed(p)/1000,unit:'km/s',color:'mint'},{label:'Net entry force · y',value:selectorForce(p),unit:'N'},{label:'Design analyser radius',value:radius(p.mass,selectedSpeed(p),p.charge,p.field)*100,unit:'cm'}];
  }
}
export function graphData(tab: TabId,p: Params): PlotData {
  let f: (x:number)=>number, min=0,max=10,xLabel='Current',xUnit='A',yLabel='Field strength',yUnit='µT',op=p.current,caption='Field magnitude scales with |I|. Reversing current reverses the field vector.';
  switch(tab) {
    case 'fields':
      if(p.source==='bar'||p.source==='earth') { min=0.07;max=0.4;xLabel='Position · x';xUnit='m';op=p.probe.x;f=x=>magnitude(sourceField(p,vec(x,p.probe.y,p.probe.z)))*1e6;caption=p.source==='bar'?'A dipole field falls rapidly with distance.':'The local Earth field is approximately uniform.'; }
      else { min=-10;max=10;f=x=>magnitude(sourceField({...p,current:x},p.probe))*1e6; }
      break;
    case 'resultant': min=-0.4;max=0.4;xLabel='Position · x';xUnit='m';op=p.probe.x;f=x=>magnitude(resultant(p,vec(x,p.probe.y,p.probe.z)))*1e6;caption='Scan along a horizontal line through the probe. Wire cores are regularized at 2 mm.';break;
    case 'charges': max=1000;xLabel='Speed';xUnit='km/s';yLabel='Gyroradius';yUnit='cm';op=p.speed/1000;f=x=>radius(p.mass,x*1000*sine(p.angle),p.charge,p.field)*100;caption='At fixed field and angle, radius is proportional to speed.';break;
    case 'motor': max=180;xLabel='Angle';xUnit='°';yLabel='Force magnitude';yUnit='mN';op=p.angle;f=x=>Math.abs(motorForce({...p,angle:x}))*1000;caption='Maximum force occurs when the conductor is perpendicular to the field.';break;
    case 'wires': min=2;max=40;xLabel='Separation';xUnit='cm';yLabel='Force / length';yUnit='µN/m';op=p.separation*100;f=x=>Math.abs(wireForce({...p,separation:x/100}))*1e6;caption='Double the separation to halve the force per unit length.';break;
    case 'selector': max=1000;xLabel='Beam speed';xUnit='km/s';yLabel='Net entry force · y';yUnit='N';op=p.speed/1000;f=x=>selectorForce({...p,speed:x*1000});caption='The zero crossing selects the speed E / B, for either charge sign.';break;
  }
  return { points:Array.from({length:101},(_,i)=>{const x=min+(max-min)*i/100;return{x,y:f(x)};}),xLabel,yLabel,xUnit,yUnit,operating:{x:op,y:f(op)},caption };
}
