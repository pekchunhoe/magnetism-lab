import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimulationClock } from './useSimulationClock';

let pending:Map<number,FrameRequestCallback>,now:number,id:number;
beforeEach(()=>{
  pending=new Map();now=0;id=0;
  vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{pending.set(++id,callback);return id;}));
  vi.stubGlobal('cancelAnimationFrame',vi.fn((key:number)=>pending.delete(key)));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function frames(count:number,dt=20){for(let i=0;i<count;i++)act(()=>{now+=dt;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(now));});}

describe('single-flight clock lifecycle',()=>{
  it('advances monotonically through ordinary rerenders, completes once and stops scheduling frames',()=>{
    const complete=vi.fn();
    const {result,rerender}=renderHook(({version,step})=>useSimulationClock(true,false,version,step,false,1,complete),{initialProps:{version:'flight-1',step:0}});
    let previous=0;
    for(let i=0;i<90;i++){
      frames(1);rerender({version:'flight-1',step:0});
      expect(result.current.clock.current.time).toBeGreaterThanOrEqual(previous);previous=result.current.clock.current.time;
    }
    expect(result.current.clock.current.time).toBe(1);expect(result.current.time).toBe(1);
    expect(complete).toHaveBeenCalledTimes(1);expect(pending.size).toBe(0);
    rerender({version:'flight-1',step:1});expect(result.current.clock.current.time).toBe(1);
    rerender({version:'flight-2',step:1});expect(result.current.clock.current.time).toBe(0);
    frames(90);expect(result.current.clock.current.time).toBe(1);expect(complete).toHaveBeenCalledTimes(2);
  });
  it('pause, resume, step and slow speed retain the same flight and parameter reset happens once',()=>{
    const complete=vi.fn();
    const {result,rerender}=renderHook(({playing,slow,version,step})=>useSimulationClock(playing,slow,version,step,true,10,complete),{initialProps:{playing:true,slow:false,version:0,step:0}});
    frames(11);expect(result.current.time).toBeCloseTo(.2,12);
    rerender({playing:false,slow:false,version:0,step:0});frames(10);expect(result.current.time).toBeCloseTo(.2,12);
    rerender({playing:false,slow:false,version:0,step:1});expect(result.current.time).toBeCloseTo(.28,12);
    rerender({playing:true,slow:true,version:0,step:1});frames(11);expect(result.current.time).toBeCloseTo(.32,12);
    rerender({playing:true,slow:true,version:1,step:1});expect(result.current.time).toBe(0);
    frames(11);expect(result.current.time).toBeCloseTo(.04,12);
    rerender({playing:true,slow:true,version:1,step:1});expect(result.current.time).toBeCloseTo(.04,12);
    expect(complete).not.toHaveBeenCalled();
  });
  it('unbounded clocks used by the other tabs keep advancing',()=>{
    const {result}=renderHook(()=>useSimulationClock(true,false));frames(301);
    expect(result.current.time).toBeCloseTo(6,12);expect(pending.size).toBe(1);
  });
});
