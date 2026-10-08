'use client';

import {useEffect,useRef,useState} from 'react';

type Props={title:string;description:string;defaultName:string;busy?:boolean;onSign:(name:string,image:string)=>void};

export default function SignatureCapture({title,description,defaultName,busy=false,onSign}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);
 const drawing=useRef(false);
 const [hasInk,setHasInk]=useState(false);
 const [name,setName]=useState(defaultName);
 const [consent,setConsent]=useState(false);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  const ratio=window.devicePixelRatio||1;
  const width=element.clientWidth,height=element.clientHeight;
  element.width=Math.round(width*ratio);element.height=Math.round(height*ratio);
  const context=element.getContext('2d');if(!context)return;
  context.scale(ratio,ratio);context.strokeStyle='#263b34';context.lineWidth=2.5;context.lineCap='round';context.lineJoin='round';
 },[]);
 const position=(event:React.PointerEvent<HTMLCanvasElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();return {x:event.clientX-bounds.left,y:event.clientY-bounds.top}};
 const start=(event:React.PointerEvent<HTMLCanvasElement>)=>{const point=position(event),context=canvas.current?.getContext('2d');if(!context)return;drawing.current=true;event.currentTarget.setPointerCapture(event.pointerId);context.beginPath();context.moveTo(point.x,point.y);context.lineTo(point.x+.01,point.y+.01);context.stroke();setHasInk(true)};
 const move=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const point=position(event),context=canvas.current?.getContext('2d');context?.lineTo(point.x,point.y);context?.stroke()};
 const clear=()=>{const element=canvas.current;if(!element)return;element.getContext('2d')?.clearRect(0,0,element.width,element.height);setHasInk(false)};
 return <form className="signature-capture" onSubmit={event=>{event.preventDefault();if(!hasInk||!consent||name.trim().length<2)return;onSign(name.trim(),canvas.current?.toDataURL('image/png')||'')}}>
  <h3>{title}</h3><p>{description}</p>
  <label>Nom du signataire<input value={name} onChange={event=>setName(event.target.value)} minLength={2} required/></label>
  <div className="signature-canvas-head"><span>Signez dans le cadre</span><button type="button" onClick={clear}>Effacer</button></div>
  <canvas ref={canvas} aria-label="Zone de signature dessinée" onPointerDown={start} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/>
  <label className="signature-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} required/> J’ai lu le document et je confirme mon accord.</label>
  <button className="btn primary" disabled={busy||!hasInk||!consent||name.trim().length<2}>Signer le document</button>
 </form>;
}
