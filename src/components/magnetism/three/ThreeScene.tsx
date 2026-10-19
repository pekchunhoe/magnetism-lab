import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { Params, TabId, ViewOptions } from '../../../types/magnetism';
import { vec } from '../../../lib/physics/magnetism/core';
import { selectorTrajectory } from '../../../lib/physics/magnetism/trajectories';
import { chargePath, sampleCharge, sceneFrame, staticVectors, tuple } from '../../../lib/physics/magnetism/visualization';
import { Apparatus } from './Models';
import { ParticleMotion } from './ParticleMotion';
import { WorldContext, type World } from './Primitives';
import type { DragPlane } from './Draggable';
import { createOverlayStore, OverlayContext, OverlayLayer } from './Overlay';

type Preset='Perspective'|'Top'|'Side'|'Front';
interface Props {tab:TabId;p:Params;view:ViewOptions;frame:number;onChange:(p:Partial<Params>)=>void;clock:World['clock'];playing:boolean;resetVersion:number;stepVersion:number;onFallback:(reason:string)=>void}
const cameraPositions:Record<Preset,[number,number,number]>={Perspective:[5,3.5,7],Top:[0,9,.001],Side:[9,0,.001],Front:[0,0,9]};
function CameraRig({preset,version,world,follow,p,tab,output,quality,onEconomy,playing}:{preset:Preset;version:string;world:World;follow:boolean;p:Params;tab:TabId;output:React.RefObject<HTMLDivElement|null>;quality:string;onEconomy:()=>void;playing:boolean}) {
  const {camera,gl,invalidate,setDpr}=useThree(),frames=useRef({count:0,start:0}),following=useRef(false);
  useEffect(()=>{camera.position.set(...cameraPositions[preset]).multiplyScalar(tab==='motor'||tab==='wires'||tab==='resultant'?.7:tab==='selector'?.9:1);camera.up.set(0,1,0);world.controls.current?.target.set(0,0,0);camera.lookAt(0,0,0);world.controls.current?.update();invalidate();following.current=false;},[preset,version]);
  useEffect(()=>{setDpr(Math.min(window.devicePixelRatio||1,quality==='Economy'?1:1.5));invalidate();},[quality]);
  useFrame(({clock})=>{
    const controls=world.controls.current;
    if(follow&&tab==='charges'&&controls){const at=world.toWorld(sampleCharge(p,world.clock.current.time).position),delta=at.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(at);controls.update();following.current=true;}
    else if(following.current&&controls){following.current=false;controls.target.set(0,0,0);controls.update();}
    queueMicrotask(()=>{if(output.current){const o=output.current;o.dataset.camera=JSON.stringify(camera.position.toArray());o.dataset.target=JSON.stringify(controls?.target.toArray()||[0,0,0]);o.dataset.drawCalls=String(gl.info.render.calls);o.dataset.triangles=String(gl.info.render.triangles);o.dataset.geometries=String(gl.info.memory.geometries);o.dataset.textures=String(gl.info.memory.textures);o.dataset.dpr=String(gl.getPixelRatio());}});
    if(!playing){frames.current={count:0,start:0};return;}if(!frames.current.start)frames.current.start=clock.elapsedTime;frames.current.count++;
    const elapsed=clock.elapsedTime-frames.current.start;
    if(elapsed>3){const fps=frames.current.count/elapsed;if(output.current)output.current.dataset.fps=fps.toFixed(1);if(quality==='Auto'&&fps<45)onEconomy();frames.current={count:0,start:clock.elapsedTime};}
  });
  return <OrbitControls ref={world.controls as React.RefObject<OrbitControlsImpl>} makeDefault enableDamping dampingFactor={.12} minDistance={1} maxDistance={35} onChange={()=>invalidate()}/>;
}
export default function ThreeScene({tab,p,view,frame,onChange,clock,playing,resetVersion,stepVersion,onFallback}:Props) {
  const [preset,setPreset]=useState<Preset>('Perspective'),[quality,setQuality]=useState('Auto'),[economy,setEconomy]=useState(()=>window.innerWidth<700),[axes,setAxes]=useState(false),[grid,setGrid]=useState(false),[plane,setPlane]=useState<DragPlane>('XY'),[follow,setFollow]=useState(false),[cameraReset,setCameraReset]=useState(0);
  const controls=useRef<OrbitControlsImpl|null>(null),host=useRef<HTMLDivElement>(null),summary=useRef<HTMLDivElement>(null),stats=useRef<HTMLDivElement>(null);
  const overlays=useMemo(createOverlayStore,[]);
  const points=useMemo(()=>chargePath(p),[p]),beam=useMemo(()=>selectorTrajectory(p),[p]),frameData=useMemo(()=>sceneFrame(tab,p,points,beam),[tab,p,points,beam]);
  const low=quality==='Economy'||quality==='Auto'&&economy;
  const world=useMemo<World>(()=>({...frameData,clock,labels:view.labels,low,controls,toWorld:v=>new THREE.Vector3((v.x-frameData.centre.x)*frameData.factor,(v.y-frameData.centre.y)*frameData.factor,(v.z-frameData.centre.z)*frameData.factor),toPhysical:v=>vec(v.x/frameData.factor+frameData.centre.x,v.y/frameData.factor+frameData.centre.y,v.z/frameData.factor+frameData.centre.z)}),[frameData,clock,view.labels,low]);
  const contextCleanup=useRef<()=>void>(()=>{});useEffect(()=>()=>contextCleanup.current(),[]);
  const motion=tab==='charges'||tab==='selector';
  const cameraKey=(e:React.KeyboardEvent)=>{if(e.target!==e.currentTarget&&e.target!==host.current?.querySelector('canvas'))return;const c=controls.current;if(!c)return;
    let handled=true;const offset=c.object.position.clone().sub(c.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(e.key==='Home')setCameraReset(n=>n+1);
    else if(e.key==='+'||e.key==='=')offset.multiplyScalar(.85);else if(e.key==='-')offset.multiplyScalar(1.15);
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      if(e.shiftKey){const delta=new THREE.Vector3(e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0,e.key==='ArrowUp'?.2:e.key==='ArrowDown'?-.2:0,0).applyQuaternion(c.object.quaternion);c.target.add(delta);c.object.position.add(delta);}
      else{spherical.theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),.01,Math.PI-.01);offset.setFromSpherical(spherical);}
    }else handled=false;
    if(handled){e.preventDefault();if(!e.shiftKey)c.object.position.copy(c.target).add(offset);c.update();}
  };
  return <div className="webgl-scene" ref={host} data-renderer="webgl" data-tab={tab} data-beam-passes={tab==='selector'?beam.passes:undefined} data-quality={low?'economy':'high'}>
    <div className="gl-toolbar"><div className="gl-presets" aria-label="Camera presets">{(['Perspective','Top','Side','Front'] as Preset[]).map(name=><button key={name} aria-pressed={preset===name} onClick={()=>{setPreset(name);setCameraReset(n=>n+1);}}>{name}</button>)}</div><label className="gl-quality">Quality <select aria-label="3D quality" value={quality} onChange={e=>setQuality(e.target.value)}><option>Auto</option><option>High</option><option>Economy</option></select></label></div>
    <div className="gl-viewport" role="group" aria-label="Interactive 3D laboratory" tabIndex={0} onKeyDown={cameraKey}>
      <OverlayContext.Provider value={overlays}><Canvas frameloop={playing?'always':'demand'} dpr={[1,low?1:1.5]} shadows={!low} camera={{position:[5,3.5,7],fov:45,near:.01,far:100}} gl={{antialias:!low,alpha:false,powerPreference:'high-performance'}} fallback={<div className="gl-loading">WebGL unavailable. Use Compatible view.</div>}
        onCreated={({gl})=>{gl.setClearColor('#08131f');const canvas=gl.domElement;canvas.setAttribute('aria-label','Perspective WebGL physics scene');const lost=(e:Event)=>{e.preventDefault();onFallback('The graphics context was lost. The compatible scene remains available.');};canvas.addEventListener('webglcontextlost',lost);contextCleanup.current=()=>canvas.removeEventListener('webglcontextlost',lost);if(stats.current)stats.current.dataset.ready='true';}}>
        <ambientLight intensity={.65}/><hemisphereLight args={['#b6dbff','#102027',1.3]}/><directionalLight position={[4,7,5]} intensity={3.2} castShadow={!low} shadow-mapSize={[1024,1024]}/><pointLight position={[-5,2,-3]} color="#70efc3" intensity={35}/>
        <CameraRig preset={preset} version={`${tab}-${frame}-${cameraReset}`} world={world} follow={follow} p={p} tab={tab} output={stats} playing={playing} quality={quality==='Auto'&&economy?'Economy':quality} onEconomy={()=>setEconomy(true)}/>
        {grid&&<gridHelper args={[8,16,'#385a65','#172d3a']} position={[0,-2.9,0]}/>}{axes&&<axesHelper args={[3.5]}/>}
        <WorldContext.Provider value={world}><group scale={frameData.factor} position={tuple({x:-frameData.centre.x*frameData.factor,y:-frameData.centre.y*frameData.factor,z:-frameData.centre.z*frameData.factor})}>
          {motion?<ParticleMotion key={tab} tab={tab} p={p} view={view} beam={beam} resetVersion={resetVersion} summary={summary}/>:<Apparatus tab={tab} p={p} view={view} plane={plane} onChange={onChange}/>}
        </group></WorldContext.Provider>
        <Invalidate change={`${stepVersion}-${resetVersion}-${JSON.stringify(p)}-${JSON.stringify(view)}`}/>
      </Canvas><OverlayLayer/></OverlayContext.Provider>{tab==='selector'&&<span className={`gl-beam-badge ${beam.passes?'pass':'reject'}`}>{beam.termination==='stationary'?'Beam stationary':beam.passes?'Beam transmitted':'Beam rejected'}</span>}<span className="gl-badge">WEBGL · {low?'ECONOMY':'3D LAB'}</span>
    </div>
    <div className="gl-options"><label><input type="checkbox" checked={axes} onChange={e=>setAxes(e.target.checked)}/>Axes</label><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>Grid</label>{tab==='fields'&&<label>Drag plane <select aria-label="Drag plane" value={plane} onChange={e=>setPlane(e.target.value as DragPlane)}><option>XY</option><option>XZ</option><option>YZ</option></select></label>}{tab==='charges'&&<label><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/>Follow particle</label>}<button onClick={()=>onFallback('Compatible view selected.')}>Compatible view</button></div>
    <p className="gl-instructions">Drag to orbit · wheel / pinch to zoom · right-drag / two fingers to pan. Focus scene: arrows orbit, Shift + arrows pan, + / − zoom, Home reframe.{tab==='fields'?' Move P or compass; Page Up / Down changes depth.':''}</p>
    {tab==='fields'&&<p className="gl-model-note">Streamlines: sampled from the probe’s idealized field model; finite integration and line density are illustrative. Winding count is schematic. Arrows and moving dots show direction, not field propagation.</p>}
    {motion&&<p className="gl-model-note">Analytic SI trajectory · playback slowed · vectors scaled independently for visibility. Trail persists during this 3D view; parameter edits and reset clear it.</p>}
    {(tab==='motor'||tab==='wires')&&<p className="gl-model-note">{tab==='motor'?'Translucent poles expose the fixed conductor. Arrows show quantitative force; no mechanical motion is simulated.':'Wire centres stay fixed. Arrows show force per unit length; displacement is not simulated.'}</p>}
    <div className="sr-only" ref={summary} data-motion={motion?tab:undefined} data-vectors={JSON.stringify(staticVectors(tab,p))}>Physical vectors use the same SI state as the numerical readouts.</div><div className="sr-only" ref={stats} data-gl-stats="true" aria-hidden="true"/>
  </div>;
}
function Invalidate({change}:{change:string}) {const invalidate=useThree(s=>s.invalidate);useEffect(()=>{invalidate();},[change,invalidate]);return null;}
