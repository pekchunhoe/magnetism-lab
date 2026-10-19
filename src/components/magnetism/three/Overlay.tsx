import { createContext, useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore, useId, type CSSProperties, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// DOM labels use the existing React root, avoiding nested-root unmount races.
interface Entry {id:string;children:ReactNode;style?:CSSProperties;centre:boolean;element:{current:HTMLDivElement|null}}
export function createOverlayStore(){
  let entries:Entry[]=[];const listeners=new Set<()=>void>();
  return {subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},snapshot:()=>entries,set:(entry:Entry)=>{entries=[...entries.filter(e=>e.id!==entry.id),entry];listeners.forEach(fn=>fn());},remove:(id:string)=>{entries=entries.filter(e=>e.id!==id);listeners.forEach(fn=>fn());}};
}
export const OverlayContext=createContext<ReturnType<typeof createOverlayStore>>(null!);
export function OverlayLayer(){const store=useContext(OverlayContext),entries=useSyncExternalStore(store.subscribe,store.snapshot);return <div className="gl-overlay">{entries.map(e=><div key={e.id} ref={e.element} style={{position:'absolute',top:0,left:0,pointerEvents:'none',...e.style}}><div style={{transform:e.centre?'translate(-50%,-50%)':undefined}}>{e.children}</div></div>)}</div>;}
export function Html({children,position=[0,0,0],center=false,style,zIndexRange=[5,0]}:{children:ReactNode;position?:[number,number,number];center?:boolean;style?:CSSProperties;zIndexRange?:[number,number]}){
  const store=useContext(OverlayContext),id=useId(),group=useRef<THREE.Group>(null),element=useRef<HTMLDivElement>(null),point=useMemo(()=>new THREE.Vector3(),[]);
  useLayoutEffect(()=>{store.set({id,children,style,centre:center,element});},[id,children,style,center]);
  useLayoutEffect(()=>()=>store.remove(id),[store,id]);
  useFrame(({camera,size})=>{if(!group.current||!element.current)return;group.current.updateWorldMatrix(true,false);group.current.getWorldPosition(point);point.project(camera);let visible=point.z>=-1&&point.z<=1;let ancestor:THREE.Object3D|null=group.current;while(ancestor){if(!ancestor.visible){visible=false;break;}ancestor=ancestor.parent;}const el=element.current;el.style.display=visible?'':'none';el.style.transform=`translate3d(${(point.x+1)*size.width/2}px,${(1-point.y)*size.height/2}px,0)`;el.style.zIndex=String(zIndexRange[0]);});
  return <group ref={group} position={position}/>;
}
