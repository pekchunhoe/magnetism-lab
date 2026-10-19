import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Html } from './Overlay';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { OrbitControls } from 'three-stdlib';
import type { Vec } from '../../../types/magnetism';
import { magnitude, vec } from '../../../lib/physics/magnetism/core';
import { tuple } from '../../../lib/physics/magnetism/visualization';
export const C={mint:'#70efc3',blue:'#79afff',gold:'#f5ce79',red:'#ff7b90',copper:'#cc854d',steel:'#263d50',white:'#dceafa'};
export interface World {extent:number;factor:number;centre:Vec;clock:{current:{time:number}};labels:boolean;low:boolean;controls:{current:OrbitControls|null};toWorld:(p:Vec)=>THREE.Vector3;toPhysical:(p:THREE.Vector3)=>Vec}
export const WorldContext=createContext<World>(null!);
export const useWorld=()=>useContext(WorldContext);
const yAxis=new THREE.Vector3(0,1,0);
export function Label({at,children,color=C.white,className=''}:{at:Vec;children:React.ReactNode;color?:string;className?:string}) {
  const world=useWorld();if(!world.labels)return null;
  return <Html center position={tuple(at)} style={{pointerEvents:'none'}} zIndexRange={[5,0]}><span className={`gl-label ${className}`} style={{color}}>{children}</span></Html>;
}
export function Cable({a,b,r=.005,color=C.copper}:{a:Vec;b:Vec;r?:number;color?:string}) {
  const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),q=useMemo(()=>new THREE.Quaternion().setFromUnitVectors(yAxis,new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize()),[a.x,a.y,a.z,b.x,b.y,b.z]);
  if(!length)return null;
  return <mesh position={[(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2]} quaternion={q} castShadow><cylinderGeometry args={[r,r,length,16]}/><meshStandardMaterial color={color} metalness={.8} roughness={.26}/></mesh>;
}
export function Tube({points,r=.002,color=C.mint,opacity=1,metal=false}:{points:Vec[];r?:number;color?:string;opacity?:number;metal?:boolean}) {
  const low=useWorld().low,curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...tuple(p))),false,'centripetal'),[points]);
  if(points.length<2)return null;
  return <mesh castShadow={metal}><tubeGeometry args={[curve,Math.min(points.length*2,low?160:320),r,low?4:6,false]}/>{metal?<meshStandardMaterial color={color} metalness={.8} roughness={.25}/>:<meshBasicMaterial color={color} transparent={opacity<1} opacity={opacity} depthWrite={opacity>.95}/>}</mesh>;
}
export function placeArrow(group:THREE.Group,origin:Vec,direction:Vec,length:number) {
  const mag=magnitude(direction);group.visible=mag>0&&Number.isFinite(mag);
  if(!group.visible)return;
  group.position.set(origin.x,origin.y,origin.z);group.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(direction.x/mag,direction.y/mag,direction.z/mag));
  const head=length*.24,shaft=length-head;
  group.children[0].position.y=shaft/2;group.children[0].scale.set(length*.018,shaft,length*.018);
  group.children[1].position.y=shaft+head/2;group.children[1].scale.set(length*.085,head,length*.085);
  if(group.children[2])group.children[2].position.y=length*1.12;
}
export function VectorArrow({origin=vec(),direction,length,color=C.gold,label='',arrowRef,labelOffset=0}:{origin?:Vec;direction:Vec;length:number;color?:string;label?:string;arrowRef?:React.RefObject<THREE.Group|null>;labelOffset?:number}) {
  const own=useRef<THREE.Group>(null),ref=arrowRef||own,labels=useWorld().labels;
  useLayoutEffect(()=>{if(ref.current)placeArrow(ref.current,origin,direction,length);},[origin.x,origin.y,origin.z,direction.x,direction.y,direction.z,length,labels]);
  return <group ref={ref}><mesh><cylinderGeometry args={[1,1,1,8]}/><meshBasicMaterial color={color}/></mesh><mesh><coneGeometry args={[1,1,12]}/><meshBasicMaterial color={color}/></mesh><group>{labels&&label&&<Html center style={{pointerEvents:'none'}} zIndexRange={[5,0]}><span className="gl-vector-label" style={{color,position:'relative',top:labelOffset}}>{label}</span></Html>}</group></group>;
}
export function ArrowLattice({origins,direction=vec(0,0,1),directions,length,color=C.blue}:{origins:Vec[];direction?:Vec;directions?:Vec[];length:number;color?:string}) {
  const shaft=useRef<THREE.InstancedMesh>(null),head=useRef<THREE.InstancedMesh>(null),n=origins.length;
  useLayoutEffect(()=>{const obj=new THREE.Object3D(),dir=new THREE.Vector3(...tuple(direction)).normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(yAxis,dir),shift=dir.clone();
    origins.forEach((p,i)=>{if(directions){dir.set(...tuple(directions[i])).normalize();rotation.setFromUnitVectors(yAxis,dir);shift.copy(dir);}obj.quaternion.copy(rotation);obj.position.set(...tuple(p)).addScaledVector(shift,length*.38);obj.scale.set(length*.015,length*.76,length*.015);obj.updateMatrix();shaft.current?.setMatrixAt(i,obj.matrix);obj.position.set(...tuple(p)).addScaledVector(shift,length*.88);obj.scale.set(length*.07,length*.24,length*.07);obj.updateMatrix();head.current?.setMatrixAt(i,obj.matrix);});
    if(shaft.current)shaft.current.instanceMatrix.needsUpdate=true;if(head.current)head.current.instanceMatrix.needsUpdate=true;
  },[origins,direction.x,direction.y,direction.z,directions,length]);
  if(!n||magnitude(direction)===0)return null;
  return <group><instancedMesh ref={shaft} args={[undefined,undefined,n]} frustumCulled={false}><cylinderGeometry args={[1,1,1,6]}/><meshBasicMaterial color={color} transparent opacity={.48}/></instancedMesh><instancedMesh ref={head} args={[undefined,undefined,n]} frustumCulled={false}><coneGeometry args={[1,1,8]}/><meshBasicMaterial color={color} transparent opacity={.7}/></instancedMesh></group>;
}
export function FieldStreams({paths,vectors=true}:{paths:Vec[][];vectors?:boolean}) {
  const {clock,low,extent}=useWorld(),markers=useRef<THREE.InstancedMesh>(null);
  const curves=useMemo(()=>paths.map(path=>{const c=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...tuple(p))),false,'centripetal');c.getLengths();return c;}),[paths]);
  const arrowData=useMemo(()=>curves.map(c=>({origin:c.getPointAt(.58),direction:c.getTangentAt(.58)})),[curves]);
  const arrows=useMemo(()=>({origins:arrowData.map(a=>a.origin),directions:arrowData.map(a=>a.direction)}),[arrowData]);
  const geometry=useMemo(()=>{if(!curves.length)return null;const pieces=curves.map(curve=>new THREE.TubeGeometry(curve,low?110:180,extent*.0024,4,false)),merged=mergeGeometries(pieces);pieces.forEach(piece=>piece.dispose());return merged;},[curves,low,extent]);
  useEffect(()=>()=>geometry?.dispose(),[geometry]);
  const scratch=useMemo(()=>({matrix:new THREE.Matrix4(),at:new THREE.Vector3()}),[]);
  useFrame(()=>{if(!markers.current)return;curves.forEach((c,i)=>{c.getPointAt(((clock.current.time*.13+i*.173)%1+1)%1,scratch.at);scratch.matrix.makeTranslation(scratch.at.x,scratch.at.y,scratch.at.z);markers.current!.setMatrixAt(i,scratch.matrix);});markers.current.instanceMatrix.needsUpdate=true;});
  const material=useMemo(()=>new THREE.MeshBasicMaterial({color:C.mint,transparent:true,opacity:.3,depthWrite:false}),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  return <group>{geometry&&<mesh geometry={geometry} material={material}/>} {vectors&&<ArrowLattice origins={arrows.origins} directions={arrows.directions} length={extent*.05} color={C.mint}/>} {paths.length>0&&<instancedMesh ref={markers} args={[undefined,undefined,paths.length]} frustumCulled={false}><sphereGeometry args={[extent*.008,8,8]}/><meshBasicMaterial color={C.mint} toneMapped={false}/></instancedMesh>}</group>;
}
