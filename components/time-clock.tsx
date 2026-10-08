'use client';

import {useEffect,useState} from 'react';
import {Clock,Play,Square} from 'lucide-react';
import type {RecordItem} from '@/lib/model';
import {shiftHours} from '@/lib/project-operations';

type Running={projectId:string;date:string;start:string};
const key='yello-pro-time-clock';
const now=()=>new Date().toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Montreal'}).replace(' h ',':').slice(0,5);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});

/** Field clock-in/clock-out. The running shift is kept on the device until it is submitted; nothing is sent before. */
export default function TimeClock({projects,demo}:{projects:RecordItem[];demo:boolean}){
 const [running,setRunning]=useState<Running|null>(null),[projectId,setProjectId]=useState(projects[0]?.id||''),[form,setForm]=useState<{date:string;start:string;end:string;breakMinutes:number;note:string}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.projectId)setRunning(saved)}catch{}},[]);
 function start(){if(!projectId)return;const r={projectId,date:today(),start:now()};setRunning(r);try{localStorage.setItem(key,JSON.stringify(r))}catch{};setMessage(`Quart commencé à ${r.start}.`)}
 function stop(){if(!running)return;setForm({date:running.date,start:running.start,end:now(),breakMinutes:0,note:''});setProjectId(running.projectId)}
 async function submit(){if(!form)return;setMessage('');let hours=0;try{hours=shiftHours(form.start,form.end,form.breakMinutes)}catch(e){setMessage((e as Error).message);return}if(demo){setMessage(`Démonstration : ${hours} h calculées, rien n’est enregistré.`);return}setBusy(true);try{const response=await fetch('/api/timesheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,...form})});const body=await response.json();if(!response.ok)throw new Error(body.error);setMessage(`${body.hours} h envoyées pour approbation.`);setForm(null);setRunning(null);try{localStorage.removeItem(key)}catch{}}catch(e){setMessage(`${(e as Error).message} Le quart reste sur cet appareil.`)}finally{setBusy(false)}}
 const project=projects.find(p=>p.id===(running?.projectId||projectId));
 return <section className="panel time-clock" aria-label="Pointage">
  <div className="panel-title"><div><p className="eyebrow">POINTAGE</p><h2>{running?`En cours depuis ${running.start}`:'Feuille de temps'}</h2><small>{project?String(project.data.title||'Projet'):'Aucun projet assigné'}</small></div><Clock size={22}/></div>
  {!projects.length?<p className="muted">Aucun projet ne vous est assigné.</p>:!form?<div className="module-actions">{!running&&<label>Projet<select value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{String(p.data.title||'Projet')}</option>)}</select></label>}{running?<button className="btn primary" onClick={stop}><Square size={15}/>Terminer le quart</button>:<button className="btn primary" onClick={start}><Play size={15}/>Commencer</button>}<button className="btn ghost" onClick={()=>setForm({date:today(),start:'08:00',end:'16:00',breakMinutes:30,note:''})}>Saisir à la main</button></div>:<form className="vendor-form" onSubmit={e=>{e.preventDefault();void submit()}}>
   {!running&&<label>Projet<select value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{String(p.data.title||'Projet')}</option>)}</select></label>}
   <label>Date<input type="date" required value={form.date} max={today()} onChange={e=>setForm({...form,date:e.target.value})}/></label>
   <label>Début<input type="time" required value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
   <label>Fin<input type="time" required value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
   <label>Pause (minutes)<input type="number" min="0" max="600" value={form.breakMinutes} onChange={e=>setForm({...form,breakMinutes:Number(e.target.value)})}/></label>
   <label className="wide">Note<input value={form.note} maxLength={500} onChange={e=>setForm({...form,note:e.target.value})}/></label>
   <div className="module-actions wide"><button className="btn primary" disabled={busy}>{busy?'Envoi…':'Envoyer pour approbation'}</button><button type="button" className="btn ghost" onClick={()=>setForm(null)}>Annuler</button></div>
  </form>}
  {message&&<p role="status" className="muted">{message}</p>}
 </section>;
}
