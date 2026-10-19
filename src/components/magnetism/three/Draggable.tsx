import { useEffect, useRef } from 'react';
import { Html } from './Overlay';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Params, Vec } from '../../../types/magnetism';
import { vec } from '../../../lib/physics/magnetism/core';
import { tuple } from '../../../lib/physics/magnetism/visualization';
import { C, useWorld } from './Primitives';
export type DragPlane='XY'|'XZ'|'YZ';
type Key='probe'|'compass'|'wire1'|'wire2';
interface EventLike {clientX:number;clientY:number;pointerId:number;stopPropagation:()=>void;target:unknown}
export function Draggable({name,label,position,param,plane='XY',onChange,children}:{name:string;label:string;position:Vec;param:Key;plane?:DragPlane;onChange:(p:Partial<Params>)=>void;children:React.ReactNode}) {
  const {camera,gl}=useThree(),world=useWorld(),button=useRef<HTMLButtonElement>(null);
  const state=useRef<{plane:THREE.Plane;offset:THREE.Vector3;pointer:number}|null>(null),ray=useRef(new THREE.Raycaster());
  const rayAt=(e:EventLike)=>{const r=gl.domElement.getBoundingClientRect();ray.current.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return ray.current.ray;};
  const finish=()=>{state.current=null;if(world.controls.current)world.controls.current.enabled=true;};
  useEffect(()=>finish,[]);
  const down=(e:EventLike)=>{
    e.stopPropagation();button.current?.focus({preventScroll:true});
    const normal=plane==='XY'?new THREE.Vector3(0,0,1):plane==='XZ'?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),at=world.toWorld(position),surface=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,at),intersection=rayAt(e).intersectPlane(surface,new THREE.Vector3());
    if(!intersection)return;state.current={plane:surface,offset:at.sub(intersection),pointer:e.pointerId};
    if(world.controls.current)world.controls.current.enabled=false;
    (e.target as {setPointerCapture?:(id:number)=>void}).setPointerCapture?.(e.pointerId);
  };
  const move=(e:EventLike)=>{const drag=state.current;if(!drag||drag.pointer!==e.pointerId)return;e.stopPropagation();const point=rayAt(e).intersectPlane(drag.plane,new THREE.Vector3());if(!point)return;const v=world.toPhysical(point.add(drag.offset));onChange({[param]:vec(Math.max(-.4,Math.min(.4,v.x)),Math.max(-.35,Math.min(.35,v.y)),Math.max(-.35,Math.min(.35,v.z)))});};
  const meshEvents={onPointerDown:(e:ThreeEvent<PointerEvent>)=>down(e),onPointerMove:(e:ThreeEvent<PointerEvent>)=>move(e),onPointerUp:(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();finish();}};
  return <group position={tuple(position)} {...meshEvents}>{children}<Html position={[0,world.extent*.055,0]} center zIndexRange={[8,6]}><button ref={button} className="gl-drag-handle" role="slider" aria-label={name} title={name} aria-valuemin={-.4} aria-valuemax={.4} aria-valuenow={position.x} aria-valuetext={`x ${position.x.toFixed(3)} m, y ${position.y.toFixed(3)} m, z ${position.z.toFixed(3)} m`}
    onPointerDown={down} onPointerMove={move} onPointerUp={e=>{e.stopPropagation();finish();}} onLostPointerCapture={finish}
    onKeyDown={e=>{const delta=.005,next={...position};let changed=true;if(e.key==='PageUp')next.z+=delta;else if(e.key==='PageDown')next.z-=delta;else if(e.key==='ArrowRight')next[plane==='YZ'?'y':'x']+=delta;else if(e.key==='ArrowLeft')next[plane==='YZ'?'y':'x']-=delta;else if(e.key==='ArrowUp')next[plane==='XY'?'y':'z']+=delta;else if(e.key==='ArrowDown')next[plane==='XY'?'y':'z']-=delta;else changed=false;if(changed){e.preventDefault();e.stopPropagation();onChange({[param]:vec(Math.max(-.4,Math.min(.4,next.x)),Math.max(-.35,Math.min(.35,next.y)),Math.max(-.35,Math.min(.35,next.z)))});}}}>{label}<span className="sr-only">Drag in the {plane} plane. Arrow keys move; Page Up and Page Down change z.</span></button></Html></group>;
}
export function ProbeBall(){const e=useWorld().extent;return <group><mesh><sphereGeometry args={[e*.019,20,16]}/><meshStandardMaterial color={C.mint} emissive={C.mint} emissiveIntensity={.7} metalness={.3} roughness={.22}/></mesh><mesh><sphereGeometry args={[e*.035,16,12]}/><meshBasicMaterial color={C.mint} transparent opacity={.12} depthWrite={false}/></mesh>{[0,1,2].map(i=><mesh key={i} rotation={i===0?[Math.PI/2,0,0]:i===1?[0,Math.PI/2,0]:[0,0,0]}><torusGeometry args={[e*.045,e*.0015,5,32]}/><meshBasicMaterial color={C.mint} transparent opacity={.55}/></mesh>)}</group>;}
