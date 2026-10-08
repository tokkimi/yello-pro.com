'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,Move3d} from 'lucide-react';
import type {Material} from '@/lib/materials';
// Dependency-free parametric room preview built from the visit measurements with
// CSS 3D transforms. Floor, walls and an optional counter take the chosen
// materials so the client can picture the renovation. It is a schematic preview,
// not a photorealistic render.
type Room={name?:string;length?:number;width?:number;height?:number;unit?:string};
const faceBg=(m:Material|null,fallback:string)=>({backgroundColor:m?.color||fallback,backgroundImage:m?.texture||'none',backgroundSize:m?.texture?'auto,auto,auto,auto':undefined});
export default function Room3D({room,floor,walls,counter}:{room:Room;floor:Material|null;walls:Material|null;counter?:Material|null}){
 const [rot,setRot]=useState({x:-14,y:-30});
 const [auto,setAuto]=useState(true);
 const drag=useRef<{x:number;y:number}|null>(null);
 const raf=useRef<any>(null);
 useEffect(()=>{
  if(!auto)return;
  const tick=()=>{setRot(r=>({...r,y:r.y+0.25}));raf.current=requestAnimationFrame(tick);};
  raf.current=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(raf.current);
 },[auto]);
 const unit=room?.unit||'pi';
 const L=Math.max(Number(room?.length)||0,1),Wd=Math.max(Number(room?.width)||0,1),Hh=Math.max(Number(room?.height)||0,1);
 const scale=210/Math.max(L,Wd,Hh);
 const w=Math.round(L*scale),d=Math.round(Wd*scale),h=Math.round(Hh*scale);
 const down=(e:React.PointerEvent)=>{drag.current={x:e.clientX,y:e.clientY};setAuto(false);(e.target as HTMLElement).setPointerCapture?.(e.pointerId);};
 const move=(e:React.PointerEvent)=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};setRot(r=>({y:r.y+dx*0.5,x:Math.max(-82,Math.min(12,r.x-dy*0.4))}));};
 const up=()=>{drag.current=null;};
 const wallStyle=faceBg(walls,'#e9e6dd'),floorStyle=faceBg(floor,'#c9a87c'),ceilStyle={backgroundColor:'#f4f3ee'};
 const sheen=(m:Material|null)=>m?.sheen?<span className="r3d-sheen" style={{opacity:(m.sheen||0)*0.4}}/>:null;
 return <div className="room-3d">
  <div className="room-3d-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
   <div className="room-3d-box" style={{width:w,height:h,transform:`translateZ(-${d/2}px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`}}>
    {/* back wall */}
    <div className="r3d-face" style={{...wallStyle,width:w,height:h,transform:`translateZ(-${d/2}px) rotateY(180deg)`,filter:'brightness(.9)'}}>{sheen(walls)}</div>
    {/* left wall */}
    <div className="r3d-face" style={{...wallStyle,width:d,height:h,left:(w-d)/2,transform:`rotateY(-90deg) translateZ(-${w/2}px)`,filter:'brightness(.8)'}}>{sheen(walls)}</div>
    {/* right wall */}
    <div className="r3d-face" style={{...wallStyle,width:d,height:h,left:(w-d)/2,transform:`rotateY(90deg) translateZ(-${w/2}px)`,filter:'brightness(1.02)'}}>{sheen(walls)}</div>
    {/* floor */}
    <div className="r3d-face" style={{...floorStyle,width:w,height:d,top:(h-d)/2,transform:`rotateX(90deg) translateZ(-${h/2}px)`,filter:'brightness(.97)'}}>{sheen(floor)}</div>
    {/* ceiling */}
    <div className="r3d-face" style={{...ceilStyle,width:w,height:d,top:(h-d)/2,transform:`rotateX(-90deg) translateZ(-${h/2}px)`,filter:'brightness(1.08)',opacity:.85}}/>
    {/* optional counter slab against the back wall */}
    {counter&&<div className="r3d-counter" style={{width:Math.round(w*0.62),height:Math.round(h*0.34),left:w*0.19,top:h-Math.round(h*0.34),transform:`translateZ(-${d/2-Math.round(d*0.16)}px)`}}>
     <div className="r3d-face" style={{...faceBg(counter,'#e7e3da'),width:Math.round(w*0.62),height:Math.round(d*0.16),transform:`rotateX(-90deg) translateY(${Math.round(d*0.16)/2}px)`,filter:'brightness(1.05)'}}>{sheen(counter)}</div>
     <div className="r3d-face" style={{...faceBg(counter,'#e7e3da'),width:Math.round(w*0.62),height:Math.round(h*0.34),filter:'brightness(.92)'}}>{sheen(counter)}</div>
    </div>}
   </div>
  </div>
  <div className="room-3d-bar">
   <span><Move3d size={14}/>{room?.name||'Pièce'} · {L} × {Wd} × {Hh} {unit}</span>
   <div className="button-row">
    <button type="button" className={`r3d-toggle ${auto?'on':''}`} onClick={()=>setAuto(a=>!a)}>{auto?'Rotation auto':'Manuel'}</button>
    <button type="button" className="icon-button" aria-label="Réinitialiser la vue" onClick={()=>{setRot({x:-14,y:-30});}}><RotateCcw size={15}/></button>
   </div>
  </div>
 </div>;
}
