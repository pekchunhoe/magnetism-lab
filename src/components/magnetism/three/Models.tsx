import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei/core/RoundedBox';
import * as THREE from 'three';
import type { Params, TabId, Vec, ViewOptions } from '../../../types/magnetism';
import { add, magnitude, motorForce, rad, scale, sine, cosine, sourceField, vec, wireField, wireForce } from '../../../lib/physics/magnetism/core';
import { circularLine, helixWinding, spatialFieldLines, staticVectors, tuple } from '../../../lib/physics/magnetism/visualization';
import { SELECTOR, ANALYSER_X } from '../../../lib/physics/magnetism/trajectories';
import { ArrowLattice, C, Cable, FieldStreams, Label, Tube, useWorld, VectorArrow } from './Primitives';
import { Draggable, ProbeBall, type DragPlane } from './Draggable';

function Pole({at,size,color,label,opacity=1}:{at:Vec;size:[number,number,number];color:string;label:string;opacity?:number}) {
  return <group position={tuple(at)}><RoundedBox args={size} radius={Math.min(.008,...size.map(v=>v/4))} smoothness={2} castShadow><meshStandardMaterial color={color} metalness={.45} roughness={.3} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/></RoundedBox>{label&&<Label at={vec(label==='+'?-size[0]*.18:label.charCodeAt(0)===0x2212?size[0]*.18:0,label==='N'?size[1]*.45:label==='S'?-size[1]*.45:0,size[2]/2+.004)}>{label}</Label>}</group>;
}
export function Wire({at=vec(),current=5,label='I',length=.5}:{at?:Vec;current?:number;label?:string;length?:number}) {
  return <group position={tuple(at)}><Cable a={vec(0,0,-length/2)} b={vec(0,0,length/2)} r={.006}/>{[-1,1].map(s=><mesh key={s} position={[0,0,s*length/2]}><sphereGeometry args={[.012,12,10]}/><meshStandardMaterial color={C.steel} metalness={.8}/></mesh>)}<VectorArrow origin={vec(.022,0,-.09*Math.sign(current))} direction={vec(0,0,current)} length={.15} label={label} color={C.gold}/></group>;
}
function Source({p}:{p:Params}) {
  const winding=useMemo(()=>p.source==='coil'?circularLine(p.radius,vec(),'yz'):helixWinding(p.radius,p.length,p.turns),[p.source,p.radius,p.length,p.turns]);
  if(p.source==='wire')return <Wire current={p.current}/>;
  return <group rotation={[0,0,rad(p.orientation)]}>
    {p.source==='bar'&&<><Pole at={vec(-.05,0)} size={[.1,.075,.075]} color={C.blue} label="S"/><Pole at={vec(.05,0)} size={[.1,.075,.075]} color={C.red} label="N"/></>}
    {['coil','solenoid'].includes(p.source)&&<><Tube points={winding} r={.004} color={C.copper} metal/>{p.source==='coil'&&[-.007,.007].map(x=><group key={x} position={[x,0,0]}><Tube points={winding} r={.0025} color={C.copper} metal/></group>)}<Cable a={winding[0]} b={add(winding[0],vec(0,-.08))} r={.003}/><Cable a={winding.at(-1)!} b={add(winding.at(-1)!,vec(0,-.08))} r={.003}/><Label at={vec(0,-p.radius-.045)} color={C.gold}>{p.turns} turns · winding shown schematically</Label><VectorArrow origin={vec(0,p.radius,0)} direction={vec(0,0,p.current)} length={.08} label="I" color={C.gold}/></>}
    {p.source==='earth'&&<><mesh><sphereGeometry args={[.105,36,24]}/><meshStandardMaterial color="#254d74" metalness={.25} roughness={.45}/></mesh>{[-.6,0,.6].map(a=><mesh key={a} rotation={[Math.PI/2+a,0,0]}><torusGeometry args={[.107,.001,5,64]}/><meshBasicMaterial color="#63a3b5" transparent opacity={.55}/></mesh>)}<Cable a={vec(0,-.15)} b={vec(0,.15)} r={.0015} color={C.white}/><Label at={vec(0,-.17)}>Earth · uniform local field model</Label></>}
  </group>;
}
function Compass({p}:{p:Params}) {
  const b=sourceField(p,p.compass),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),new THREE.Vector3(...tuple(b)).normalize()),e=useWorld().extent;
  return <group><mesh><sphereGeometry args={[e*.065,20,16]}/><meshPhysicalMaterial color="#b0d9ec" transparent opacity={.1} roughness={.1} depthWrite={false}/></mesh><group quaternion={magnitude(b)>0?q:undefined} visible={magnitude(b)>0}><Pole at={vec(e*.018,0)} size={[e*.036,e*.008,e*.009]} color={C.red} label=""/><Pole at={vec(-e*.018,0)} size={[e*.036,e*.008,e*.009]} color={C.blue} label=""/></group></group>;
}
export function Apparatus({tab,p,view,plane,onChange}:{tab:TabId;p:Params;view:ViewOptions;plane:DragPlane;onChange:(p:Partial<Params>)=>void}) {
  const world=useWorld();
  const paths=useMemo(()=>tab==='fields'?spatialFieldLines(p,world.low?'low':'high'):tab==='resultant'||tab==='wires'?[p.wire1,p.wire2].flatMap((at,i)=>{const current=i?p.current2:p.current;return current===0?[]:[-.12,.12].flatMap(z=>[.05,.09,.15].map(r=>circularLine(r,add(at,vec(0,0,z)),'xy',Math.sign(current))));}):[],[tab,p.source,p.radius,p.length,p.orientation,Math.sign(p.current),Math.sign(p.current2),p.wire1,p.wire2,world.low]);
  const vectors=staticVectors(tab,p),max=Math.max(...vectors.map(v=>magnitude(v.value)),1e-30);
  if(tab==='fields')return <><Source p={p}/>{view.fields&&<FieldStreams paths={paths} vectors={view.vectors}/>}<Draggable name="Field probe P" label="P" position={p.probe} param="probe" plane={plane} onChange={onChange}><ProbeBall/></Draggable><Draggable name="Compass" label="C" position={p.compass} param="compass" plane={plane} onChange={onChange}><Compass p={p}/></Draggable>{view.vectors&&vectors.map(v=><VectorArrow key={v.label} origin={v.origin} direction={v.value} length={world.extent*.22} label="B" color={C.blue}/>)}</>;
  if(tab==='resultant')return <>{[p.wire1,p.wire2].map((at,i)=><Draggable key={i} name={i?'Wire B':'Wire A'} label={i?'B':'A'} position={at} param={i?'wire2':'wire1'} onChange={onChange}><Wire current={i?p.current2:p.current} label={i?'I₂':'I₁'}/></Draggable>)}{view.fields&&<FieldStreams paths={paths} vectors={view.vectors}/>}<Draggable name="Observation point P" label="P" position={p.probe} param="probe" onChange={onChange}><ProbeBall/></Draggable>{view.vectors&&vectors.map((v,i)=><VectorArrow key={v.label} origin={v.origin} direction={v.value} length={world.extent*.38*magnitude(v.value)/max} label={v.label} color={[C.blue,C.gold,C.mint][i]}/>)}</>;
  if(tab==='motor'){
    const d=vec(sine(p.angle),0,p.fieldSign*cosine(p.angle)),a=scale(d,-p.length/2),b=scale(d,p.length/2),e=world.extent;
    return <><Pole opacity={.46} at={vec(0,0,-.15)} size={[.32,.26,.06]} color={p.fieldSign>0?C.red:C.blue} label={p.fieldSign>0?'N':'S'}/><Pole opacity={.46} at={vec(0,0,.15)} size={[.32,.26,.06]} color={p.fieldSign>0?C.blue:C.red} label={p.fieldSign>0?'S':'N'}/><Cable a={a} b={b} r={.006}/>{view.fields&&<ArrowLattice origins={[-.1,0,.1].flatMap(x=>[-.08,.08].map(y=>vec(x,y,-.1*p.fieldSign)))} direction={vec(0,0,p.field*p.fieldSign)} length={.18}/>} {view.vectors&&<><VectorArrow direction={scale(d,p.current)} length={e*.3} label="I" color={C.gold}/><VectorArrow direction={vec(0,motorForce(p))} length={e*.32} label="F" color={C.red}/></>}</>;
  }
  if(tab==='wires'){
    const force=wireForce(p),at=[vec(-p.separation/2,0),vec(p.separation/2,0)];
    return <>{at.map((v,i)=><group key={i}><Wire length={p.length} at={v} current={i?p.current2:p.current} label={i?'I₂':'I₁'}/>{view.vectors&&<VectorArrow origin={v} direction={vec((i?-1:1)*force,0)} length={world.extent*.25} labelOffset={i?9:-9} label={i?'F₂/L':'F₁/L'} color={C.red}/>}</group>)}{view.fields&&<FieldStreams paths={at.flatMap((v,i)=>(i?p.current2:p.current)===0?[]:[.04,.075,.11].map(r=>circularLine(r,v,'xy',Math.sign(i?p.current2:p.current))))} vectors={view.vectors}/>}</>;
  }
  return null;
}

export function SelectorEquipment({p,path}:{p:Params;path:Vec[]}) {
  const end=path.at(-1)!,w=useWorld(),e=w.extent,maxX=path.reduce((a,v)=>Math.max(a,v.x),.3),halfY=path.reduce((a,v)=>Math.max(a,Math.abs(v.y)),.125);
  const centreX=(SELECTOR.entrance+SELECTOR.exit)/2,plateY=SELECTOR.halfHeight+.007,apertureY=(SELECTOR.halfHeight+SELECTOR.slitHalfHeight)/2,apertureHeight=SELECTOR.halfHeight-SELECTOR.slitHalfHeight;
  return <><Cable a={vec(-.39,0)} b={vec(-.3,0)} r={.018} color={C.steel}/><Label at={vec(-.35,.045)}>Source</Label>
    <Pole at={vec(centreX,plateY)} size={[SELECTOR.exit-SELECTOR.entrance,.014,.13]} color={C.gold} label="+"/><Pole at={vec(centreX,-plateY)} size={[SELECTOR.exit-SELECTOR.entrance,.014,.13]} color={C.blue} label="−"/>
    <mesh position={[centreX,0,0]}><boxGeometry args={[SELECTOR.exit-SELECTOR.entrance,SELECTOR.halfHeight*2,.13]}/><meshBasicMaterial color={C.blue} transparent opacity={.035} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    {[SELECTOR.entrance,SELECTOR.slitX].flatMap(x=>[-1,1].map(s=><Pole key={`${x}-${s}`} at={vec(x,s*apertureY,0)} size={[SELECTOR.wallThickness,apertureHeight,.15]} color={C.steel} label=""/>))}
    <Label at={vec(-.13,.17)}>Crossed fields</Label><Label at={vec(.04,.15)}>Exit slit</Label>
    {p.analyser&&<><mesh position={[(ANALYSER_X+maxX)/2,0,-.075]}><boxGeometry args={[maxX-ANALYSER_X,halfY*2+.04,.016]}/><meshStandardMaterial color="#172d43" metalness={.5} roughness={.3}/></mesh><Label at={vec(.19,.12)}>Magnetic analyser · E = 0</Label></>}
    <mesh position={tuple(end)}><sphereGeometry args={[e*.025,16,12]}/><meshStandardMaterial color={C.mint} emissive={C.mint} emissiveIntensity={.6}/></mesh><Label at={add(end,vec(0,-e*.07))}>Detector / impact</Label>
  </>;
}
