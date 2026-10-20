import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Params, TabId, ViewOptions } from '../../../types/magnetism';
import { vec } from '../../../lib/physics/magnetism/core';
import { beamTrailIndex, chargePath, sampleBeam, sampleCharge, type Beam, tuple } from '../../../lib/physics/magnetism/visualization';
import { ArrowLattice, C, Label, placeArrow, useWorld, VectorArrow } from './Primitives';
import { SelectorEquipment } from './Models';

export function ParticleMotion({tab,p,view,beam,resetVersion,summary}:{tab:TabId;p:Params;view:ViewOptions;beam:Beam;resetVersion:number;summary:React.RefObject<HTMLDivElement|null>}) {
  const world=useWorld(),particle=useRef<THREE.Group>(null),velocity=useRef<THREE.Group>(null),force=useRef<THREE.Group>(null),electric=useRef<THREE.Group>(null),magnetic=useRef<THREE.Group>(null),trail=useRef<THREE.Line>(null),furthest=useRef(0);
  const points=useMemo(()=>tab==='charges'?chargePath(p,721):beam.path,[tab,p,beam]);
  const geometry=useMemo(()=>new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...tuple(v)))),[points]);
  const preview=useMemo(()=>new THREE.Line(geometry,new THREE.LineBasicMaterial({color:C.mint,transparent:true,opacity:.16})),[geometry]);
  const trailGeometry=useMemo(()=>geometry.clone(),[geometry]);
  const line=useMemo(()=>new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:C.mint,transparent:true,opacity:.92})),[trailGeometry]);
  const previousHead=useRef(0);
  useEffect(()=>{furthest.current=0;trailGeometry.setDrawRange(0,0);},[trailGeometry,resetVersion]);
  useEffect(()=>()=>{geometry.dispose();trailGeometry.dispose();preview.material.dispose();line.material.dispose();},[geometry,trailGeometry,preview,line]);
  useFrame(()=>{
    const s=tab==='charges'?sampleCharge(p,world.clock.current.time):sampleBeam(p,beam,world.clock.current.time);
    particle.current?.position.set(...tuple(s.position));
    const apply=(ref:React.RefObject<THREE.Group|null>,direction:typeof s.force,length:number)=>{if(ref.current)placeArrow(ref.current,s.position,direction,world.extent*length);};
    apply(velocity,s.velocity,.23);apply(force,s.force,.2);apply(electric,s.electric,.19);apply(magnetic,s.magnetic,.19);
    if(tab==='selector'){
      const attribute=trailGeometry.getAttribute('position'),old=Math.min(previousHead.current,points.length-1);
      attribute.setXYZ(old,...tuple(points[old]));
      const index=Math.min(beamTrailIndex(beam,s.time),points.length-1);
      attribute.setXYZ(index,...tuple(s.position));attribute.needsUpdate=true;
      trailGeometry.setDrawRange(0,index+1);previousHead.current=index;
      // The head moves between precomputed samples. Recompute bounds so neither
      // the exact head nor a changed trajectory is culled by stale line bounds.
      line.frustumCulled=false;
    }else{
      furthest.current=Math.max(furthest.current,Math.floor(s.fraction*(points.length-1))+1);trailGeometry.setDrawRange(0,furthest.current);
    }
    const out=summary.current;if(out){out.dataset.time=String(s.time);out.dataset.elapsed=String(world.clock.current.time);out.dataset.complete=String(!!s.complete);out.dataset.stage=s.stage;out.dataset.position=JSON.stringify(s.position);out.dataset.velocity=JSON.stringify(s.velocity);out.dataset.force=JSON.stringify(s.force);out.dataset.electric=JSON.stringify(s.electric);out.dataset.magnetic=JSON.stringify(s.magnetic);
      out.dataset.trailCount=String(trailGeometry.drawRange.count);
      const attribute=trailGeometry.getAttribute('position'),head=trailGeometry.drawRange.count-1;
      out.dataset.trailEnd=JSON.stringify({x:attribute.getX(head),y:attribute.getY(head),z:attribute.getZ(head)});
    }
  },-2); // Update physical transforms before controls, DOM projections and rendering.
  const lattice=useMemo(()=>tab==='selector'?[-.23,-.13,-.03].flatMap(x=>[-.07,.07].map(y=>vec(x,y,-.06))):[-.4,0,.4].flatMap(x=>[-.3,.3].map(y=>vec(world.centre.x+x*world.extent,world.centre.y+y*world.extent,world.centre.z-world.extent*.3))),[tab,world.extent,world.centre]);
  return <>
    {tab==='selector'&&<SelectorEquipment p={p} beam={beam}/>}
    {view.fields&&p.field>0&&<Label at={tab==='charges'?{x:world.centre.x+world.extent*.42,y:world.centre.y+world.extent*.55,z:world.centre.z}:vec(-.13,0,-.1)} color={C.blue}>B {tab==='selector'||p.fieldSign<0?'−z':'+z'}</Label>}
    {view.fields&&tab==='selector'&&p.analyser&&p.field>0&&beam.samples.some(s=>s.stage==='analyser')&&<ArrowLattice origins={beam.samples.filter(s=>s.stage==='analyser').filter((_,i)=>i%40===20).map(s=>({...s.position,z:-.035}))} direction={vec(0,0,-p.field)} length={world.extent*.13}/>}
    {view.fields&&<><ArrowLattice origins={lattice} direction={vec(0,0,p.field*(tab==='charges'?p.fieldSign:-1))} length={world.extent*.16}/>{tab==='selector'&&<ArrowLattice origins={[-.23,-.13,-.03].map(x=>vec(x,.07,0))} direction={vec(0,-p.electric)} length={.13} color={C.gold}/>}</>}
    {view.trail&&<>{tab==='charges'&&<primitive object={preview}/>}<primitive object={line} ref={trail}/></>}
    <group ref={particle}><mesh><sphereGeometry args={[world.extent*.017,20,16]}/><meshStandardMaterial color={p.charge>0?C.red:C.blue} emissive={p.charge>0?C.red:C.blue} emissiveIntensity={1.7} roughness={.15}/></mesh><mesh><sphereGeometry args={[world.extent*.031,16,12]}/><meshBasicMaterial color={p.charge>0?C.red:C.blue} transparent opacity={.12} depthWrite={false}/></mesh></group>
    {view.vectors&&<><VectorArrow direction={vec(1)} length={.1} arrowRef={velocity} label="v" color={C.gold}/><VectorArrow direction={vec()} length={.1} arrowRef={force} labelOffset={-9} label="Fnet" color={C.red}/>{tab==='selector'&&<><VectorArrow direction={vec()} length={.1} arrowRef={electric} label="Fᴇ" color={C.gold}/><VectorArrow direction={vec()} length={.1} arrowRef={magnetic} labelOffset={9} label="Fʙ" color={C.blue}/></>}</>}
  </>;
}
