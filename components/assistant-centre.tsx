'use client';

import {useMemo,useState} from 'react';
import {Play,Plus,Send,Star,Trash2} from 'lucide-react';
import type {Data,RecordItem} from '@/lib/model';
import {isDue,nextRun,routineKinds,routinesFrom,runRoutine,type Routine,type RoutineKind} from '@/lib/routines';

type Props={records:RecordItem[];settings:Data;demo:boolean;onSaveRoutines:(routines:Routine[])=>Promise<unknown>};
const suggestions=['Résume les opérations de la semaine','Quelles factures sont en retard ?','Quels projets sont actifs ?','Quelles dépenses restent à payer ?','Où en est le pipeline de ventes ?','Quelle est la position comptes clients / fournisseurs ?'];
const days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});

/** Assistant (chat over computed company data, read-only) and routines (saved reports run explicitly). */
export default function AssistantCentre(props:Props){
 const [tab,setTab]=useState<'Chat'|'Routines'>('Chat');
 return <section className="panel assistant-centre"><div className="vendor-tabs" role="tablist" aria-label="Assistant">{(['Chat','Routines'] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Chat'?<Chat {...props}/>:<Routines {...props}/>}</section>;
}

function Chat({demo}:Props){
 const [messages,setMessages]=useState<{role:'user'|'assistant';content:string}[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function send(text:string){const content=text.trim();if(!content||busy)return;if(demo){setError('Mode démonstration : l’assistant n’interroge aucun service IA.');return}const next=[...messages,{role:'user' as const,content}];setMessages(next);setDraft('');setBusy(true);setError('');try{const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next.slice(-20)})});const body=await response.json();if(!response.ok)throw new Error(body.error);setMessages([...next,{role:'assistant',content:body.reply}])}catch(e){setError((e as Error).message);setMessages(messages);setDraft(content)}finally{setBusy(false)}}
 return <div className="assistant-chat">
  <div><h2>Assistant</h2><p className="muted">Répond à partir des chiffres calculés de Yello Pro (factures, dépenses, projets, pipeline). Il ne modifie ni n’envoie rien.</p></div>
  {!messages.length&&<div className="assistant-suggestions">{suggestions.map(s=><button key={s} type="button" onClick={()=>void send(s)} disabled={busy}>{s}</button>)}</div>}
  <ol className="assistant-thread" aria-live="polite">{messages.map((m,i)=><li key={i} className={m.role}><b>{m.role==='user'?'Vous':'Assistant'}</b><p>{m.content}</p></li>)}{busy&&<li className="assistant"><b>Assistant</b><p>Réflexion…</p></li>}</ol>
  {error&&<p className="error" role="alert">{error}</p>}
  <form className="assistant-composer" onSubmit={e=>{e.preventDefault();void send(draft)}}><label className="sr-only" htmlFor="assistant-input">Votre question</label><textarea id="assistant-input" rows={2} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Posez une question sur vos projets, factures ou dépenses…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send(draft)}}}/><button className="btn primary" disabled={!draft.trim()||busy} aria-label="Envoyer"><Send size={16}/></button></form>
  {messages.length>0&&<button type="button" className="btn ghost" onClick={()=>{setMessages([]);setError('')}}>Nouvelle conversation</button>}
 </div>;
}

function Routines({records,settings,demo,onSaveRoutines}:Props){
 const saved=useMemo(()=>routinesFrom(settings.routines),[settings.routines]);
 const [routines,setRoutines]=useState<Routine[]>(saved),[selected,setSelected]=useState(saved[0]?.id||''),[query,setQuery]=useState(''),[draft,setDraft]=useState<Routine|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 async function persist(next:Routine[]){setError('');try{await onSaveRoutines(next);setRoutines(next)}catch(e){setError((e as Error).message)}}
 async function run(routine:Routine){setBusy(routine.id);const at=new Date().toISOString();const lines=runRoutine(routine.kind,records,today());await persist(routines.map(r=>r.id===routine.id?{...r,lastRun:at,runs:[{id:crypto.randomUUID(),at,lines},...r.runs].slice(0,20)}:r));setSelected(routine.id);setBusy('')}
 const shown=routines.filter(r=>r.title.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.title.localeCompare(b.title,'fr'));
 const current=routines.find(r=>r.id===selected);
 const due=routines.filter(r=>isDue(r,new Date()));
 return <div className="assistant-routines">
  <div className="module-toolbar"><input className="settings-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une routine" aria-label="Rechercher une routine"/><button className="btn primary" onClick={()=>setDraft({id:crypto.randomUUID(),title:routineKinds[0].label,kind:routineKinds[0].id,weekday:1,hour:8,active:true,favorite:false,tags:[],lastRun:'',runs:[]})}><Plus size={15}/>Nouvelle routine</button></div>
  <p className="muted">Les routines calculent des rapports à partir de vos données réelles, sans IA. Elles s’exécutent quand vous cliquez « Exécuter » ; l’exécution automatique en arrière-plan n’est pas encore branchée{due.length?` — ${due.length} routine(s) sont dues maintenant`:''}.{demo?' Démonstration : résultats non conservés après rechargement.':''}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  {draft&&<form className="vendor-form" onSubmit={e=>{e.preventDefault();if(!draft.title.trim()){setError('Donnez un titre à la routine.');return}void persist([draft,...routines.filter(r=>r.id!==draft.id)]).then(()=>{setSelected(draft.id);setDraft(null)})}} aria-label="Routine"><label>Titre<input required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Rapport<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as RoutineKind})}>{routineKinds.map(k=><option key={k.id} value={k.id}>{k.label}</option>)}</select></label><label>Jour<select value={draft.weekday} onChange={e=>setDraft({...draft,weekday:Number(e.target.value)})}>{days.map((d,i)=><option key={d} value={i+1}>Chaque {d}</option>)}</select></label><label>Heure<input type="number" min="0" max="23" value={draft.hour} onChange={e=>setDraft({...draft,hour:Number(e.target.value)})}/></label><label className="wide">Étiquettes (séparées par des virgules)<input value={draft.tags.join(', ')} onChange={e=>setDraft({...draft,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label><div className="module-actions wide"><button className="btn primary">Enregistrer</button><button type="button" className="btn ghost" onClick={()=>setDraft(null)}>Annuler</button></div></form>}
  <div className="routine-layout">
   <ul className="routine-list">{shown.map(r=><li key={r.id} className={r.id===selected?'active':''}><button type="button" className="routine-open" onClick={()=>setSelected(r.id)}><b>{r.title}</b><small>Chaque {days[r.weekday-1]} à {r.hour} h · prochaine : {nextRun(r,new Date(r.lastRun||Date.now())).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'})}{r.lastRun?` · dernière : ${new Date(r.lastRun).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'})}`:''}</small>{r.tags.length>0&&<small>{r.tags.join(' · ')}</small>}</button><div className="vendor-actions"><button className="icon-button" aria-label={r.favorite?`Retirer ${r.title} des favoris`:`Ajouter ${r.title} aux favoris`} aria-pressed={r.favorite} onClick={()=>void persist(routines.map(x=>x.id===r.id?{...x,favorite:!x.favorite}:x))}><Star size={15} fill={r.favorite?'currentColor':'none'}/></button><label className="note-visibility"><input type="checkbox" checked={r.active} onChange={e=>void persist(routines.map(x=>x.id===r.id?{...x,active:e.target.checked}:x))}/>Active</label><button className="btn secondary" disabled={busy===r.id} onClick={()=>void run(r)}><Play size={14}/>Exécuter</button><button className="btn ghost" onClick={()=>setDraft(structuredClone(r))}>Modifier</button><button className="icon-button" aria-label={`Supprimer ${r.title}`} onClick={()=>{if(window.confirm(`Supprimer la routine « ${r.title} » et son historique ?`))void persist(routines.filter(x=>x.id!==r.id))}}><Trash2 size={15}/></button></div></li>)}{!shown.length&&<li className="portal-empty"><p>Aucune routine. Créez-en une, par exemple « Comptes clients et fournisseurs » chaque lundi à 8 h.</p></li>}</ul>
   <div className="routine-history"><h3>Historique{current?` — ${current.title}`:''}</h3>{current?.runs.length?current.runs.map(run=><article key={run.id}><small>{new Date(run.at).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'})} · terminé</small><ul>{run.lines.map((l,i)=><li key={i}>{l}</li>)}</ul></article>):<p className="muted">Aucun résultat. Consulter une routine ne l’exécute pas : cliquez « Exécuter ».</p>}</div>
  </div>
 </div>;
}
