import { useEffect, useLayoutEffect, useRef, useState } from 'react';
export function useSimulationClock(playing:boolean,slow:boolean,resetVersion:number|string=0,stepVersion=0,publishFrames=true,maxTime=Infinity,onComplete?:()=>void) {
  const [time,setTime]=useState(0), previous=useRef<number|undefined>(undefined),epoch=useRef(resetVersion);
  const clock=useRef({time:0});
  const ended=useRef(false),completion=useRef(onComplete);completion.current=onComplete;
  const publish=useRef(publishFrames);publish.current=publishFrames;
  const resetting=epoch.current!==resetVersion;
  const advance=(dt:number,forcePublish=false)=>{
    if(ended.current)return;
    clock.current.time=Math.min(maxTime,clock.current.time+dt);
    const done=clock.current.time>=maxTime;
    if(publish.current||forcePublish||done)setTime(clock.current.time);
    if(done){ended.current=true;completion.current?.();}
  };
  useLayoutEffect(()=>{epoch.current=resetVersion;ended.current=false;clock.current.time=0;previous.current=undefined;setTime(0);},[resetVersion]);
  useEffect(()=>{if(stepVersion>0)advance(.08,true);},[stepVersion]);
  useEffect(()=>{setTime(clock.current.time);},[publishFrames]);
  useEffect(()=>{
    if(!playing||ended.current) return;
    let id:number;
    const tick=(now:number)=>{const dt=previous.current===undefined?0:Math.min((now-previous.current)/1000,0.05);previous.current=now;advance(dt*(slow?0.2:1));if(!ended.current)id=requestAnimationFrame(tick);};
    id=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(id);previous.current=undefined;};
  },[playing,slow,resetVersion,maxTime]);
  return {time:resetting?0:time,clock,resetTime:()=>{ended.current=false;clock.current.time=0;setTime(0);},step:()=>advance(.08,true)};
}
