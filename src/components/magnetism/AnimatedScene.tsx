import { Component, lazy, Suspense, useState, type ComponentProps, type ReactNode } from 'react';
import { useSimulationClock } from '../../hooks/useSimulationClock';
import { Scene } from './Scene';
const ThreeScene=lazy(()=>import('./three/ThreeScene'));
let supported:boolean|undefined;
function webglAvailable(){
  if(supported!==undefined)return supported;
  if(typeof WebGL2RenderingContext==='undefined')return supported=false;
  try{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');supported=!!gl;gl?.getExtension('WEBGL_lose_context')?.loseContext();return supported;}catch{return supported=false;}
}
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode;onError:()=>void},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export function AnimatedScene({playing,slow,resetVersion,stepVersion,...props}:Omit<ComponentProps<typeof Scene>,'time'>&{playing:boolean;slow:boolean;resetVersion:number;stepVersion:number}) {
  const [reason,setReason]=useState(()=>new URLSearchParams(window.location.search).get('renderer')==='svg'?'Compatible view selected.':webglAvailable()?'':'WebGL 2 is unavailable. Showing the compatible scene.');
  const useGL=props.view.dimension==='3D'&&!reason;
  const simulationReset=props.tab==='selector'?`${resetVersion}:${props.p.speed}:${props.p.field}:${props.p.electric}:${props.p.particle}:${props.p.charge}:${props.p.mass}:${props.p.analyser}`:resetVersion;
  const {time,clock}=useSimulationClock(playing,slow,simulationReset,stepVersion,!useGL);
  const svg=<><Scene {...props} time={time}/>{props.tab==='fields'&&props.view.dimension==='2D'&&(props.p.probe.z!==0||props.p.compass.z!==0)&&<div className="gl-fallback">2D projects x–y. Probe z: {(props.p.probe.z*100).toFixed(1)} cm; compass z: {(props.p.compass.z*100).toFixed(1)} cm.<button onClick={()=>props.onChange({probe:{...props.p.probe,z:0},compass:{...props.p.compass,z:0}})}>Reset probe depths</button></div>}</>;
  return useGL?<SceneBoundary fallback={svg} onError={()=>setReason('The 3D renderer could not start. Showing the compatible scene.')}><Suspense fallback={<div className="gl-loading" role="status">Loading 3D laboratory…</div>}><ThreeScene {...props} clock={clock} playing={playing} resetVersion={resetVersion} stepVersion={stepVersion} onFallback={setReason}/></Suspense></SceneBoundary>:<>{props.view.dimension==='3D'&&<div className="gl-fallback">{reason}{webglAvailable()&&<button onClick={()=>setReason('')}>Restore WebGL 3D</button>}</div>}{svg}</>;
}
