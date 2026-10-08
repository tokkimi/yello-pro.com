'use client';

import {useState} from 'react';
import {ChevronRight,Plus} from 'lucide-react';
import type {Data,RecordItem} from '@/lib/model';
import {newCandidates,sourceOf,taskCandidates,taskSources,type TaskSource} from '@/lib/task-sources';

type Props={project:RecordItem;tasks:RecordItem[];records:RecordItem[];settings:Data;canEdit:boolean;statuses:string[];onCustom:()=>void;onCreate:(rows:Data[])=>Promise<unknown>;onOpen:(task:RecordItem)=>void};

/** Project tasks with status/source/assignee filters (filters never change a task) and explicit import from six sources. */
export default function ProjectTasks({project,tasks,records,settings,canEdit,statuses,onCustom,onCreate,onOpen}:Props){
 const [status,setStatus]=useState(''),[source,setSource]=useState(''),[assignee,setAssignee]=useState(''),[importing,setImporting]=useState<TaskSource|''>(''),[picked,setPicked]=useState<string[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const people=[...new Set(tasks.map(t=>String(t.data.assignee||'')).filter(Boolean))].sort();
 const shown=tasks.filter(t=>(!status||t.data.status===status)&&(!source||sourceOf(t)===source)&&(!assignee||t.data.assignee===assignee));
 const candidates=importing&&importing!=='Personnalisée'?newCandidates(taskCandidates(importing,project,records,settings),tasks):[];
 function choose(value:string){setMessage('');if(!value)return;if(value==='Personnalisée'){onCustom();return}setImporting(value as TaskSource);setPicked([])}
 async function create(){const rows=candidates.filter(c=>picked.includes(c.ref)).map(c=>({title:c.title,description:c.detail,status:statuses[0]||'À faire',priority:'Normale',due:'',source:c.source,source_ref:c.ref}));if(!rows.length)return;setBusy(true);try{await onCreate(rows);setMessage(`${rows.length} tâche(s) créée(s).`);setImporting('');setPicked([])}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <section className="panel project-workboard project-tasks" data-project-section="tasks">
  <div className="panel-title"><div><p className="eyebrow">TRAVAIL À SUIVRE</p><h2>Tâches</h2><small>{tasks.length} tâche{tasks.length!==1?'s':''} dans ce projet</small></div>{canEdit&&<label className="task-add"><span className="sr-only">Ajouter une tâche depuis</span><select value="" onChange={e=>choose(e.target.value)} aria-label="Ajouter une tâche depuis"><option value="">+ Ajouter une tâche…</option>{taskSources.map(s=><option key={s} value={s}>{s==='Personnalisée'?'Personnalisée (formulaire)':`Depuis : ${s}`}</option>)}</select></label>}</div>
  <div className="module-filters"><label>Statut<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Toutes</option>{taskSources.map(s=><option key={s}>{s}</option>)}</select></label><label>Assigné<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Tous</option>{people.map(p=><option key={p}>{p}</option>)}</select></label></div>
  {importing&&<div className="filter-drawer" role="dialog" aria-label={`Importer depuis ${importing}`}><h3>Ajouter depuis : {importing}</h3>{candidates.length?<><label className="note-visibility"><input type="checkbox" checked={picked.length===candidates.length} onChange={e=>setPicked(e.target.checked?candidates.map(c=>c.ref):[])}/>Tout sélectionner ({candidates.length})</label><ul className="task-candidates">{candidates.map(c=><li key={c.ref}><label className="note-visibility"><input type="checkbox" checked={picked.includes(c.ref)} onChange={e=>setPicked(e.target.checked?[...picked,c.ref]:picked.filter(x=>x!==c.ref))}/><span><b>{c.title}</b><small>{c.detail}</small></span></label></li>)}</ul></>:<p className="muted">Rien de nouveau à importer depuis cette source (les éléments déjà importés sont ignorés).</p>}<div className="module-actions"><button className="btn secondary" onClick={()=>setImporting('')}>Annuler</button><button className="btn primary" disabled={!picked.length||busy} onClick={()=>void create()}>{busy?'Création…':`Créer ${picked.length} tâche(s)`}</button></div></div>}
  {message&&<p role="status" className="muted">{message}</p>}
  <div className="project-record-list">{shown.map(t=><button className="project-record-row" key={t.id} onClick={()=>onOpen(t)}><div className="project-record-title"><b>{String(t.data.title||'Sans titre')}</b><small>{sourceOf(t)} · {String(t.data.assignee||'Non assignée')} · {String(t.data.due||'Sans échéance')}</small></div><span className="badge">{String(t.data.status||'')}</span><ChevronRight size={17}/></button>)}{!shown.length&&<div className="portal-empty"><p>{tasks.length?'Aucune tâche pour ces filtres.':'Aucune tâche pour ce projet.'}</p>{canEdit&&!tasks.length&&<button className="btn secondary" onClick={onCustom}><Plus size={15}/>Créer une tâche</button>}</div>}</div>
 </section>;
}
