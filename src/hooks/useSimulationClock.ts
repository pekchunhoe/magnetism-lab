import { useEffect, useLayoutEffect, useRef, useState } from 'react';
export function useSimulationClock(playing:boolean,slow:boolean,resetVersion:number|string=0,stepVersion=0,publishFrames=true) {
  const [time,setTime]=useState(0), previous=useRef<number|undefined>(undefined),epoch=useRef(resetVersion);
  const clock=useRef({time:0});
  const publish=useRef(publishFrames);publish.current=publishFrames;
  const resetting=epoch.current!==resetVersion;
  useLayoutEffect(()=>{epoch.current=resetVersion;clock.current.time=0;previous.current=undefined;setTime(0);},[resetVersion]);
  useEffect(()=>{if(stepVersion>0){clock.current.time+=.08;setTime(clock.current.time);}},[stepVersion]);
  useEffect(()=>{setTime(clock.current.time);},[publishFrames]);
  useEffect(()=>{
    if(!playing) return;
    let id:number;
    const tick=(now:number)=>{const dt=previous.current===undefined?0:Math.min((now-previous.current)/1000,0.05);previous.current=now;clock.current.time+=dt*(slow?0.2:1);if(publish.current)setTime(clock.current.time);id=requestAnimationFrame(tick);};
    id=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(id);previous.current=undefined;};
  },[playing,slow]);
  return {time:resetting?0:time,clock,resetTime:()=>{clock.current.time=0;setTime(0);},step:()=>{clock.current.time+=.08;setTime(clock.current.time);}};
}
