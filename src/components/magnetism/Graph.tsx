import { useState } from 'react';
import { ChartNoAxesCombined, RotateCcw } from 'lucide-react';
import type { PlotData } from '../../types/magnetism';
import { format } from '../../lib/physics/magnetism/core';
export function Graph({data}:{data:PlotData}) {
  const [hover,setHover]=useState<number|null>(null);
  const points=data.points.filter(p=>Number.isFinite(p.y)),xMin=Math.min(...data.points.map(p=>p.x),data.operating.x),xMax=Math.max(...data.points.map(p=>p.x),data.operating.x);
  const operatingY=Number.isFinite(data.operating.y)?data.operating.y:0;
  const low=Math.min(0,operatingY,...points.map(p=>p.y)),high=Math.max(0,operatingY,...points.map(p=>p.y)),span=high-low||1;
  const yMin=low<0?low-span*0.08:0,yMax=high+span*0.12;
  const px=(x:number)=>82+(x-xMin)/(xMax-xMin||1)*334,py=(y:number)=>183-(y-yMin)/(yMax-yMin)*143;
  const inspectX=xMin+(xMax-xMin)*(hover||0);
  const active=hover===null||!points.length?data.operating:points.reduce((a,b)=>Math.abs(a.x-inspectX)<Math.abs(b.x-inspectX)?a:b);
  const inspect=(e:React.PointerEvent<SVGSVGElement>)=>{const point=e.currentTarget.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(e.currentTarget.getScreenCTM()!.inverse());setHover(Math.max(0,Math.min(1,(local.x-82)/334)));};
  return <section className="card graph-card"><div className="card-heading"><h2><ChartNoAxesCombined size={16}/>Live graph</h2><span className="live-label"><i/> LIVE</span><button className="icon-button" aria-label="Reset graph inspection" title="Reset graph inspection" onClick={()=>setHover(null)}><RotateCcw size={14}/></button></div><div className="graph-subtitle">{data.yLabel} vs {data.xLabel.toLowerCase()}</div><svg className="graph" viewBox="0 0 450 236" role="img" aria-label={`${data.yLabel} in ${data.yUnit} versus ${data.xLabel} in ${data.xUnit}`} tabIndex={0} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key)){e.preventDefault();setHover(h=>e.key==='Escape'?null:e.key==='Home'?0:e.key==='End'?1:Math.max(0,Math.min(1,(h??0.5)+(e.key==='ArrowRight'?0.01:-0.01))));}}} onPointerDown={inspect} onPointerMove={inspect} onPointerLeave={e=>{if(e.pointerType==='mouse')setHover(null);}}>
    {[0,1,2,3].map(i=>{const y=yMin+(yMax-yMin)*i/3;return <g key={i}><line x1="82" x2="416" y1={py(y)} y2={py(y)} className="graph-grid"/><text x="72" y={py(y)+4} textAnchor="end">{format(y)}</text></g>;})}
    {[0,1,2,3,4].map(i=>{const x=xMin+(xMax-xMin)*i/4;return <g key={i}><text x={px(x)} y="202" textAnchor="middle">{format(x)}</text></g>;})}
    {points.length?<path d={`M${points.map(p=>`${px(p.x)},${py(p.y)}`).join(' L')}`} fill="none" stroke="var(--mint)" strokeWidth="2.5"/>:<text x="249" y="110" textAnchor="middle">No finite orbit radius at B = 0</text>}
    {Number.isFinite(active.y)&&<><line x1={px(active.x)} x2={px(active.x)} y1="40" y2="183" stroke="var(--mint)" strokeDasharray="3 5" opacity="0.25"/><circle cx={px(active.x)} cy={py(active.y)} r="5" fill="var(--mint)" stroke="var(--panel)" strokeWidth="3"/></>}
    <text transform="translate(15,115) rotate(-90)" textAnchor="middle">{data.yLabel} ({data.yUnit})</text><text x="240" y="226" textAnchor="middle">{data.xLabel} ({data.xUnit})</text>
  </svg><div className="graph-value"><span>{hover===null?'Operating point':'Inspecting'}</span><b>{format(active.x,data.xUnit)} <span>→</span> {format(active.y,data.yUnit)}</b></div><p className="graph-caption">{data.caption}</p></section>;
}
