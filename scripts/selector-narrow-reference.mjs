// Independent textbook reference for the specified proton/E/B design sweep.
// This is audit code, never imported by the simulation or used as a velocity gate.
export const omega=1.602176634e-19*.08/1.67262192369e-27;
export const T=2*Math.PI/omega;
export function reference(speedKm,halfOpening=.00005){
  const speed=speedKm*1000,dv=speed-100000,A=dv/omega;
  const state=t=>({position:{x:-.28+100000*t+A*Math.sin(omega*t),y:A*(1-Math.cos(omega*t)),z:0},velocity:{x:100000+dv*Math.cos(omega*t),y:dv*Math.sin(omega*t),z:0}});
  const xBreaks=[0,4*T],yBreaks=Array.from({length:9},(_,i)=>i*T/2);
  for(let n=0;n<4;n++){
    xBreaks.push(n*T,(n+1)*T);
    if(dv>100000){const a=Math.acos(-100000/dv)/omega;xBreaks.push(n*T+a,(n+1)*T-a);}
  }
  const unique=a=>[...new Set(a)].sort((a,b)=>a-b);
  function roots(key,target,breaks){
    const found=[];
    for(let i=1;i<breaks.length;i++){
      let lo=breaks[i-1],hi=breaks[i],a=state(lo).position[key]-target,b=state(hi).position[key]-target;
      if(a===0)found.push(lo);if(b===0)found.push(hi);
      if(a*b>=0)continue;
      for(let j=0;j<60;j++){const mid=(lo+hi)/2,c=state(mid).position[key]-target;if(a*c<=0){hi=mid;b=c;}else{lo=mid;a=c;}}
      found.push((lo+hi)/2);
    }
    return unique(found);
  }
  const xs=unique(xBreaks),exitTime=roots('x',.02,xs).find(t=>state(t).velocity.x>=0),fieldExit={time:exitTime,...state(exitTime)};
  // Independently enumerate contacts with closed rectangular solids. Every
  // coordinate is monotonic between its analytical derivative-zero times.
  let collision=null;
  for(const sign of [-1,1])for(const [kind,x0,x1,y0,y1] of [
    ['plate',-.28,.02,sign>0?.115:-.129,sign>0?.129:-.115],
    ['entrance-wall',-.2845,-.2755,sign>0?.014:-.115,sign>0?.115:-.014],
  ]){
    const candidates=[...roots('x',x0,xs),...roots('x',x1,xs),...roots('y',y0,yBreaks),...roots('y',y1,yBreaks)];
    for(const time of candidates){
      if(time<=0||time>exitTime||time>=(collision?.time??Infinity))continue;
      const s=state(time),{x,y}=s.position;
      if(x>=x0-1e-12&&x<=x1+1e-12&&y>=y0-1e-12&&y<=y1+1e-12)collision={kind,side:sign>0?'upper':'lower',time,...s};
    }
  }
  const returned=roots('x',-.28,xs).find(t=>t>1e-18&&state(t).velocity.x<0);
  if(returned!==undefined&&returned<exitTime&&returned<(collision?.time??Infinity))return {speedKm,passes:false,termination:'entrance',fieldExit:null,clearance:null,collision:null,end:{time:returned,...state(returned)}};
  if(collision)return {speedKm,passes:false,termination:collision.kind,fieldExit:null,clearance:null,collision,end:collision};
  const at=x=>{const dt=(x-.02)/fieldExit.velocity.x;return {time:exitTime+dt,position:{x,y:fieldExit.position.y+fieldExit.velocity.y*dt,z:0},velocity:fieldExit.velocity};};
  const front=at(.0355),rear=at(.0445),centre=at(.04),clearance=halfOpening-Math.max(Math.abs(front.position.y),Math.abs(rear.position.y));
  // The full tunnel is a straight segment. A blocked front face is first;
  // otherwise solve its first inner-surface contact without time stepping.
  let hit=null;
  if(Math.abs(front.position.y)>=halfOpening&&Math.abs(front.position.y)<=.115)hit=front;
  else if(Math.abs(front.position.y)<halfOpening&&Math.abs(rear.position.y)>=halfOpening){
    const y=Math.sign(fieldExit.velocity.y)*halfOpening,dt=(y-fieldExit.position.y)/fieldExit.velocity.y;
    hit={time:exitTime+dt,position:{x:.02+dt*fieldExit.velocity.x,y,z:0},velocity:fieldExit.velocity};
  }
  const passes=!hit&&clearance>0;
  if(hit)collision={kind:'slit',side:hit.position.y>0?'upper':'lower',...hit};
  return {speedKm,passes,termination:hit?'slit':passes?'exit':'missed-slit',fieldExit,front,centre,rear,clearance,collision,end:hit??at(.24)};
}
