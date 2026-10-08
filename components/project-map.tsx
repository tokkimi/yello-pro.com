'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Crosshair,Minus,Plus,X} from 'lucide-react';
import type {RecordItem} from '@/lib/model';
import {fit,project,validPoint,type Point} from '@/lib/geo';

type Props={projects:RecordItem[];clientName:(project:RecordItem)=>string;stage:(project:RecordItem)=>string;onOpen:(id:string)=>void;onLocate?:(project:RecordItem,point:Point&{label:string})=>Promise<unknown>;demo:boolean};
const colors:Record<string,string>={'À soumissionner':'#a47d45','Soumission envoyée':'#627c9e','Soumission signée':'#8b6b92','En construction':'#2f7a4a','Complété':'#566d5e','Archivés':'#8b8f8c'};

/** Geographic map: OpenStreetMap tiles with markers placed from stored coordinates (not a card grid). */
export default function ProjectMap({projects,clientName,stage,onOpen,onLocate,demo}:Props){
 const box=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({width:800,height:460});
 const located=projects.filter(p=>validPoint(p.data.geo));
 const missing=projects.filter(p=>!validPoint(p.data.geo));
 const initial=useMemo(()=>fit(located.map(p=>p.data.geo as Point),size.width,size.height),[located.length,size.width,size.height]);// eslint-disable-line react-hooks/exhaustive-deps
 const [zoom,setZoom]=useState(initial.zoom),[center,setCenter]=useState(initial.center),[active,setActive]=useState(''),[drag,setDrag]=useState<{x:number;y:number;cx:number;cy:number}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setZoom(initial.zoom);setCenter(initial.center)},[initial.zoom,initial.center.lat,initial.center.lon]);
 useEffect(()=>{const el=box.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setSize({width:Math.max(260,entry.contentRect.width),height:Math.max(260,Math.min(560,entry.contentRect.width*0.62))}));observer.observe(el);return()=>observer.disconnect()},[]);
 const origin=project(center,zoom),left=origin.x-size.width/2,top=origin.y-size.height/2;
 const tiles:{x:number;y:number;key:string}[]=[];const max=2**zoom;
 for(let tx=Math.floor(left/256);tx<=Math.floor((left+size.width)/256);tx++)for(let ty=Math.floor(top/256);ty<=Math.floor((top+size.height)/256);ty++)if(ty>=0&&ty<max)tiles.push({x:tx,y:ty,key:`${zoom}-${tx}-${ty}`});
 function unproject(x:number,y:number):Point{const scale=256*2**zoom;const lon=x/scale*360-180;const n=Math.PI-2*Math.PI*y/scale;return {lon,lat:180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))}}
 function pan(dx:number,dy:number){setCenter(unproject(origin.x+dx,origin.y+dy))}
 async function locateAll(){if(!onLocate)return;setBusy(true);setMessage('');let done=0,failed=0;for(const p of missing.filter(x=>String(x.data.address||'').trim().length>=4).slice(0,25)){try{const res=await fetch(`/api/geocode?q=${encodeURIComponent(String(p.data.address))}`,{cache:'no-store'});const body=await res.json();if(!res.ok)throw new Error(body.error);await onLocate(p,body.point);done++}catch{failed++}}setBusy(false);setMessage(`${done} projet(s) localisé(s)${failed?`, ${failed} adresse(s) introuvable(s) ou service indisponible`:''}.`)}
 const selected=located.find(p=>p.id===active);
 return <section className="project-map" aria-label="Carte des projets">
  <div className="project-map-tools"><span>{located.length} projet(s) sur la carte{missing.length?` · ${missing.length} sans coordonnées`:''}</span>{onLocate&&missing.length>0&&!demo&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void locateAll()}><Crosshair size={15}/>{busy?'Localisation…':'Localiser les adresses manquantes'}</button>}</div>
  {message&&<p role="status" className="muted">{message}</p>}
  <div ref={box} className="project-map-canvas" style={{height:size.height}} tabIndex={0} aria-label="Carte. Flèches pour déplacer, + et − pour zoomer." onKeyDown={e=>{const step=80;if(e.key==='ArrowLeft')pan(-step,0);else if(e.key==='ArrowRight')pan(step,0);else if(e.key==='ArrowUp')pan(0,-step);else if(e.key==='ArrowDown')pan(0,step);else if(e.key==='+'||e.key==='=')setZoom(z=>Math.min(17,z+1));else if(e.key==='-')setZoom(z=>Math.max(3,z-1));else if(e.key==='Escape')setActive('');else return;e.preventDefault()}} onPointerDown={e=>{if((e.target as HTMLElement).closest('button,a'))return;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);setDrag({x:e.clientX,y:e.clientY,cx:origin.x,cy:origin.y})}} onPointerMove={e=>{if(!drag)return;setCenter(unproject(drag.cx-(e.clientX-drag.x),drag.cy-(e.clientY-drag.y)))}} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}>
   {tiles.map(t=><img key={t.key} alt="" draggable={false} className="map-tile" src={`https://tile.openstreetmap.org/${zoom}/${((t.x%max)+max)%max}/${t.y}.png`} style={{left:t.x*256-left,top:t.y*256-top}}/>)}
   {located.map(p=>{const point=project(p.data.geo as Point,zoom);const s=stage(p);return <button key={p.id} type="button" className={`map-marker${active===p.id?' active':''}`} style={{left:point.x-left,top:point.y-top,background:colors[s]||'#466952'}} aria-label={`${p.data.title||'Projet'} — ${s}`} onClick={()=>setActive(p.id)}/>})}
   {selected&&(()=>{const point=project(selected.data.geo as Point,zoom);return <div className="map-popup" role="dialog" aria-label={String(selected.data.title||'Projet')} style={{left:Math.min(Math.max(8,point.x-left-130),size.width-268),top:Math.max(8,point.y-top-150)}}><button type="button" className="icon-button" aria-label="Fermer" onClick={()=>setActive('')}><X size={14}/></button><small>{String(selected.data.number||'Projet')} · {stage(selected)}</small><b>{String(selected.data.title||'Projet sans titre')}</b><span>{String(selected.data.address||'')}</span><span>{clientName(selected)}</span><button type="button" className="btn primary" onClick={()=>onOpen(selected.id)}>Voir le projet<ArrowUpRight size={14}/></button></div>})()}
   <div className="map-zoom"><button type="button" aria-label="Zoom avant" onClick={()=>setZoom(z=>Math.min(17,z+1))}><Plus size={16}/></button><button type="button" aria-label="Zoom arrière" onClick={()=>setZoom(z=>Math.max(3,z-1))}><Minus size={16}/></button><button type="button" aria-label="Recentrer sur les projets" onClick={()=>{setZoom(initial.zoom);setCenter(initial.center)}}><Crosshair size={16}/></button></div>
   <small className="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></small>
  </div>
  <ul className="map-legend">{Object.entries(colors).map(([label,color])=><li key={label}><i style={{background:color}}/>{label}</li>)}</ul>
  {missing.length>0&&<details className="map-missing"><summary>Projets sans coordonnées ({missing.length})</summary><ul>{missing.map(p=><li key={p.id}><button type="button" className="btn ghost" onClick={()=>onOpen(p.id)}>{String(p.data.title||'Projet')}</button> <small>{String(p.data.address||'Adresse à préciser')}</small></li>)}</ul></details>}
 </section>;
}
