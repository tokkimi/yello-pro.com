'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,ChevronRight,Minus,Plus} from 'lucide-react';
import {addDay,depth,groupSpan,resizeActivity,scheduleEnd,shiftActivity,workingDay,type ScheduleActivity,type WorkWeek} from '@/lib/schedule';

type Props={items:ScheduleActivity[];onChange:(items:ScheduleActivity[])=>void;rule:WorkWeek;holidays:string[];collapsed:string[];onToggle:(id:string)=>void;onOpenList:()=>void};
const zooms=[14,22,36,56];
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
const between=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);

/**
 * Gantt with its own scroll region. Drag a bar to move it, drag its right edge to change its duration, or use the
 * keyboard on a focused bar (← → move one day, Shift + ← → shorten/lengthen, Escape cancels a drag).
 * Changes stay in the draft until "Enregistrer"; "Recalculer les dépendances" then aligns successors.
 */
export default function ScheduleGantt({items,onChange,rule,holidays,collapsed,onToggle,onOpenList}:Props){
 const [zoom,setZoom]=useState(2),[showLinks,setShowLinks]=useState(true),[showOff,setShowOff]=useState(true);
 const [drag,setDrag]=useState<{id:string;mode:'move'|'resize';x:number;delta:number}|null>(null);
 const region=useRef<HTMLDivElement>(null);
 const dragRef=useRef(drag);dragRef.current=drag;
 const width=zooms[zoom];
 const hidden=(item:ScheduleActivity)=>{let cur=item.parent;const seen=new Set<string>();while(cur&&!seen.has(cur)){if(collapsed.includes(cur))return true;seen.add(cur);cur=items.find(x=>x.id===cur)?.parent}return false};
 const rows=items.filter(x=>!hidden(x));
 const range=useMemo(()=>{const starts=items.map(x=>x.start).filter(Boolean).sort();const ends=items.filter(x=>x.start).map(x=>scheduleEnd(x,rule,holidays)).sort();const first=addDay(starts[0]||today(),-3);const last=addDay(ends.at(-1)||addDay(first,40),10);const count=Math.max(42,Math.min(730,between(first,last)+1));return {first,days:Array.from({length:count},(_,i)=>addDay(first,i))}},[items,rule,holidays]);
 const x=(date:string)=>between(range.first,date)*width;
 const preview=(item:ScheduleActivity)=>drag&&drag.id===item.id?(drag.mode==='move'?shiftActivity(item,drag.delta):resizeActivity(item,drag.delta)):item;
 const span=(item:ScheduleActivity)=>{if(item.kind==='group'){const g=groupSpan(items,item.id,rule,holidays);return g}const p=preview(item);return p.start?{start:p.start,end:p.kind==='milestone'?p.start:scheduleEnd(p,rule,holidays)}:null};
 function commit(id:string,mode:'move'|'resize',delta:number){if(!delta)return;const snap=(a:ScheduleActivity)=>{if(!a.start)return a;let start=a.start;for(let i=0;i<14&&!workingDay(start,rule,holidays);i++)start=addDay(start,delta>0?1:-1);return {...a,start}};onChange(items.map(x=>x.id===id?(mode==='move'?snap(shiftActivity(x,delta)):resizeActivity(x,delta)):x))}
 useEffect(()=>{if(!drag)return;const move=(e:PointerEvent)=>setDrag(d=>d?{...d,delta:Math.round((e.clientX-d.x)/width)}:d);const up=()=>{const d=dragRef.current;setDrag(null);if(d)commit(d.id,d.mode,d.delta)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setDrag(null)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('keydown',key);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('keydown',key)}});// eslint-disable-line react-hooks/exhaustive-deps
 function scrollToday(){const el=region.current;if(el)el.scrollLeft=Math.max(0,x(today())-el.clientWidth/3)}
 const rowIndex=new Map(rows.map((r,i)=>[r.id,i]));const ROW=38;
 return <div className="gantt">
  <div className="gantt-tools"><div className="module-actions"><button type="button" className="icon-button" aria-label="Zoom arrière" disabled={zoom===0} onClick={()=>setZoom(z=>z-1)}><Minus size={15}/></button><button type="button" className="icon-button" aria-label="Zoom avant" disabled={zoom===zooms.length-1} onClick={()=>setZoom(z=>z+1)}><Plus size={15}/></button><button type="button" className="btn ghost" onClick={scrollToday}>Aujourd’hui</button></div><label className="note-visibility"><input type="checkbox" checked={showLinks} onChange={e=>setShowLinks(e.target.checked)}/>Afficher les dépendances</label><label className="note-visibility"><input type="checkbox" checked={showOff} onChange={e=>setShowOff(e.target.checked)}/>Griser les jours non ouvrés</label></div>
  <p className="muted">Glissez une barre pour la déplacer, son bord droit pour changer la durée. Au clavier : ← → déplace d’un jour, Maj + ← → change la durée. Les modifications restent dans le brouillon jusqu’à l’enregistrement.</p>
  <div className="gantt-body">
   <ul className="gantt-names" style={{paddingTop:ROW}}>{rows.map(item=><li key={item.id} style={{height:ROW,paddingLeft:8+depth(items,item.id)*14}}>{item.kind==='group'?<button type="button" className="gantt-toggle" aria-expanded={!collapsed.includes(item.id)} aria-label={`${collapsed.includes(item.id)?'Déplier':'Replier'} ${item.title}`} onClick={()=>onToggle(item.id)}>{collapsed.includes(item.id)?<ChevronRight size={14}/>:<ChevronDown size={14}/>}</button>:null}<span className={item.kind}>{item.kind==='milestone'?'◆ ':''}{item.title||'Sans titre'}</span></li>)}</ul>
   <div className="gantt-scroll" ref={region} role="region" aria-label="Frise de l’échéancier" tabIndex={0}>
    <div className="gantt-canvas" style={{width:range.days.length*width,height:ROW*(rows.length+1)}}>
     <div className="gantt-header" style={{height:ROW}}>{range.days.map(d=><span key={d} style={{left:x(d),width}} className={d===today()?'today':''}>{width>=22||d.endsWith('-01')||d.slice(8)==='15'?d.slice(8):''}{d.endsWith('-01')&&<small>{new Date(d+'T12:00:00Z').toLocaleDateString('fr-CA',{month:'short'})}</small>}</span>)}</div>
     {showOff&&range.days.filter(d=>!workingDay(d,rule,holidays)).map(d=><i key={d} className="gantt-off" style={{left:x(d),width,top:ROW,height:ROW*rows.length}}/>)}
     <i className="gantt-today" style={{left:x(today())+width/2,top:0,height:ROW*(rows.length+1)}} aria-hidden="true"/>
     {showLinks&&<svg className="gantt-links" width={range.days.length*width} height={ROW*(rows.length+1)} aria-hidden="true">{rows.filter(r=>r.predecessor&&rowIndex.has(r.predecessor)).map(r=>{const a=span(items.find(x=>x.id===r.predecessor)!),b=span(r);if(!a||!b)return null;const x1=x(a.end)+width,y1=ROW*(rowIndex.get(r.predecessor)!+1)+ROW/2,x2=x(b.start),y2=ROW*(rowIndex.get(r.id)!+1)+ROW/2;return <path key={r.id} d={`M${x1} ${y1} H${Math.max(x1+6,x2-6)} V${y2} H${x2}`} className={x2<x1?'late':''}/>})}</svg>}
     {rows.map((item,i)=>{const s=span(item);if(!s)return <span key={item.id} className="gantt-undated" style={{top:ROW*(i+1)+10,left:8}}>Sans date — <button type="button" onClick={onOpenList}>planifier</button></span>;const left=x(s.start),w=item.kind==='milestone'?0:(between(s.start,s.end)+1)*width-4;
      if(item.kind==='group')return <div key={item.id} className="gantt-group" style={{top:ROW*(i+1)+14,left,width:w}} title={`${item.title} · ${s.start} → ${s.end}`}/>;
      if(item.kind==='milestone')return <button key={item.id} type="button" className="gantt-milestone" style={{top:ROW*(i+1)+10,left:left+width/2-9}} aria-label={`Jalon ${item.title}, le ${s.start}. Flèches pour déplacer.`} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();commit(item.id,'move',e.key==='ArrowLeft'?-1:1)}}} onPointerDown={e=>{e.preventDefault();setDrag({id:item.id,mode:'move',x:e.clientX,delta:0})}}/>;
      return <button key={item.id} type="button" className={`gantt-bar${drag?.id===item.id?' dragging':''}`} style={{top:ROW*(i+1)+7,left,width:Math.max(width-4,w),background:item.color}} aria-label={`${item.title} : du ${s.start} au ${s.end}, ${item.progress} %. Flèches pour déplacer, Maj + flèches pour la durée.`} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();commit(item.id,e.shiftKey?'resize':'move',e.key==='ArrowLeft'?-1:1)}}} onPointerDown={e=>{if((e.target as HTMLElement).dataset.handle)return;e.preventDefault();setDrag({id:item.id,mode:'move',x:e.clientX,delta:0})}}><span className="gantt-progress" style={{width:`${item.progress}%`}}/><span className="gantt-label">{item.progress}%</span><span className="gantt-handle" data-handle="1" onPointerDown={e=>{e.preventDefault();e.stopPropagation();setDrag({id:item.id,mode:'resize',x:e.clientX,delta:0})}}/></button>})}
    </div>
   </div>
  </div>
  {drag&&<p role="status" className="muted">{drag.mode==='move'?'Déplacement':'Durée'} : {drag.delta>0?'+':''}{drag.delta} jour(s) — relâchez pour appliquer, Échap pour annuler.</p>}
 </div>;
}
