'use client';

import {useMemo,useState} from 'react';
import {AlertTriangle,CalendarClock,CircleDollarSign,Clock,Hourglass} from 'lucide-react';
import {money,type RecordItem} from '@/lib/model';
import {healthLabel,projectHealth,type ProjectHealth} from '@/lib/project-health';
import {clientDecisions,type Decision} from '@/lib/billing';
import {clientRequestsFrom,requestStatuses,type ClientRequest} from '@/lib/client-requests';

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
const icons={schedule:Clock,budget:CircleDollarSign,client:Hourglass,tasks:AlertTriangle,cash:CircleDollarSign} as const;
const tone={on_track:'ok',at_risk:'warn',off_track:'danger',done:'neutral'} as const;

const progressLabel=(p:ProjectHealth)=>`Avancement ${p.progress} %`+(p.expected!==null?`, attendu ${p.expected} %`:'');
function Stat({label,value,hint,toneName}:{label:string;value:string|number;hint?:string;toneName?:string}){return <div className="fm-stat"><span>{label}</span><strong className={toneName}>{value}</strong>{hint&&<small>{hint}</small>}</div>}

/** Portfolio steering (Follow My Future "Project health"), in Yello Pro colours. */
export function HealthCentre({records,clients,onOpen}:{records:RecordItem[];clients:RecordItem[];onOpen:(id:string)=>void}){
 const [show,setShow]=useState<'live'|'risk'|'done'>('live'),[group,setGroup]=useState<'none'|'client'|'manager'>('none');
 const all=useMemo(()=>records.filter(r=>r.kind==='project'&&!r.data.archived).map(p=>projectHealth(p,records,today())),[records]);
 const live=all.filter(p=>p.status!=='done');
 const shown=(show==='risk'?live.filter(p=>p.status!=='on_track'):show==='done'?all.filter(p=>p.status==='done'):live).sort((a,b)=>a.score-b.score);
 const clientName=(id:string|null)=>String(clients.find(c=>c.id===id)?.data.name||'Client à préciser');
 const groups:[string,ProjectHealth[]][]=group==='none'?[['',shown]]:[...shown.reduce((m,p)=>{const k=group==='client'?clientName(p.clientId):p.manager||'Sans responsable';m.set(k,[...(m.get(k)||[]),p]);return m},new Map<string,ProjectHealth[]>())];
 const upcoming=live.filter(p=>p.nextDeadline&&p.nextDeadline.date<=new Date(Date.now()+14*86_400_000).toISOString().slice(0,10)).sort((a,b)=>a.nextDeadline!.date.localeCompare(b.nextDeadline!.date));
 const margin=live.reduce((s,p)=>s+(p.margin||0),0);
 return <section className="fm-page">
  <header className="fm-header"><div><p className="eyebrow">Projets</p><h1>Santé des projets</h1><p>Chaque chantier en un coup d’œil : échéancier, budget, attentes du client et rentabilité.</p></div></header>
  <div className="fm-stats"><Stat label="Projets actifs" value={live.length}/><Stat label="Sur la bonne voie" value={live.filter(p=>p.status==='on_track').length} toneName="ok"/><Stat label="À surveiller" value={live.filter(p=>p.status==='at_risk').length} toneName="warn"/><Stat label="En difficulté" value={live.filter(p=>p.status==='off_track').length} toneName="danger"/><Stat label="Tâches en retard" value={live.reduce((s,p)=>s+p.overdueTasks,0)}/><Stat label="Marge prévue" value={money(margin)} hint="Contrat ou facturé − coût prévu"/></div>
  <div className="fm-toolbar"><div className="fm-chips" role="group" aria-label="Filtrer">{([['live','En cours'],['risk','À risque'],['done','Terminés']] as const).map(([k,l])=><button key={k} aria-pressed={show===k} onClick={()=>setShow(k)}>{l}</button>)}</div><div className="fm-chips" role="group" aria-label="Regrouper">{([['none','Sans regroupement'],['client','Par client'],['manager','Par responsable']] as const).map(([k,l])=><button key={k} aria-pressed={group===k} onClick={()=>setGroup(k)}>{l}</button>)}</div></div>
  <div className="fm-two">
   <div className="fm-list">{groups.map(([name,rows])=><div key={name||'all'}>{name&&<p className="eyebrow fm-group">{name}</p>}{rows.map(p=><article key={p.projectId} className="fm-health-row">
    <button type="button" className="fm-row-main" onClick={()=>onOpen(p.projectId)}><div className={`fm-score ${tone[p.status]}`} aria-label={`Score ${p.score} sur 100`}>{p.score}</div><div className="fm-row-title"><b>{p.title}</b><small>{clientName(p.clientId)}{p.manager?` · ${p.manager}`:''}</small></div><span className={`state-pill ${tone[p.status]}`}>{healthLabel[p.status]}</span></button>
    <div className="fm-progress" aria-label={progressLabel(p)}><span style={{width:p.progress+"%"}}/>{p.expected!==null&&<i style={{left:p.expected+"%"}} title={"Attendu aujourd’hui : "+p.expected+" %"}/>}</div>
    <dl className="fm-mini"><div><dt>Avancement</dt><dd>{p.progress} %{p.expected!==null?` / ${p.expected} %`:''}</dd></div><div><dt>Budget</dt><dd>{p.budget?`${p.budgetUsedPct} % utilisé`:'Non défini'}</dd></div><div><dt>Marge</dt><dd>{p.margin===null?'—':`${money(p.margin)}${p.marginPct!==null?` (${p.marginPct} %)`:''}`}</dd></div><div><dt>Échéance</dt><dd>{p.nextDeadline?`${p.nextDeadline.date}`:'—'}</dd></div></dl>
    {p.alerts.length>0&&<ul className="fm-alerts">{p.alerts.map((a,i)=>{const Icon=icons[a.kind];return <li key={i} className={a.level}><Icon size={14}/>{a.text}</li>})}</ul>}
   </article>)}</div>)}{!shown.length&&<div className="portal-empty"><p>{show==='risk'?'Aucun projet à risque. Tout va bien !':'Aucun projet ici.'}</p></div>}</div>
   <aside className="fm-side"><p className="eyebrow"><CalendarClock size={14}/> Échéances des 14 prochains jours</p>{upcoming.length?<ul>{upcoming.map(p=><li key={p.projectId}><button type="button" onClick={()=>onOpen(p.projectId)}><b>{p.nextDeadline!.date}</b><span>{p.nextDeadline!.label}</span><small>{p.title}</small></button></li>)}</ul>:<p className="muted">Rien d’urgent.</p>}</aside>
  </div>
 </section>;
}

/** Everything waiting on clients, with ages and reminders (Follow My Future "Client decisions"). */
export function DecisionsCentre({records,clients,demo,onOpen,onUpdated,onSaveProject}:{records:RecordItem[];clients:RecordItem[];demo:boolean;onOpen:(id:string)=>void;onUpdated:(record:RecordItem)=>void;onSaveProject:(project:RecordItem,data:Record<string,unknown>)=>Promise<unknown>}){
 const items=useMemo(()=>clientDecisions(records,today()),[records]);
 const [kind,setKind]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const shown=items.filter(i=>!kind||i.kind===kind);
 const byClient=[...shown.reduce((m,d)=>{const k=String(clients.find(c=>c.id===d.clientId)?.data.name||'Client à préciser');m.set(k,[...(m.get(k)||[]),d]);return m},new Map<string,Decision[]>())];
 async function remind(d:Decision){if(demo){setMessage('Démonstration : aucun rappel envoyé.');return}setBusy(d.key);setMessage('');try{const response=await fetch('/api/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remind',id:d.recordId})});const body=await response.json();if(!response.ok)throw new Error(body.error);onUpdated(body.record);setMessage(`Rappel envoyé : ${d.title}.`)}catch(e){setMessage((e as Error).message)}finally{setBusy('')}}
 const old=items.filter(i=>i.days>=7).length,amount=items.filter(i=>i.kind==='Paiement').reduce((s,i)=>s+(i.amount||0),0);
 return <section className="fm-page">
  <header className="fm-header"><div><p className="eyebrow">Projets</p><h1>Décisions des clients</h1><p>Approbations, signatures, choix et paiements qui attendent vos clients, du plus ancien au plus récent.</p></div></header>
  <div className="fm-stats"><Stat label="En attente" value={items.length}/><Stat label="Depuis 7 jours et plus" value={old} toneName={old?'danger':undefined}/><Stat label="Paiements attendus" value={money(amount)}/><Stat label="Choix de matériaux" value={items.filter(i=>i.kind==='Choix').length}/></div>
  <div className="fm-chips" role="group" aria-label="Type">{['','Approbation','Signature','Choix','Paiement'].map(k=><button key={k||'all'} aria-pressed={kind===k} onClick={()=>setKind(k)}>{k||'Tout'}</button>)}</div>
  {message&&<p role="status" className="muted">{message}</p>}
  {byClient.length?byClient.map(([name,rows])=><div key={name} className="fm-list"><p className="eyebrow fm-group">{name}</p>{rows.map(d=><article key={d.key} className="fm-decision"><span className={`state-pill ${d.days>=7?'danger':d.days>=3?'warn':'neutral'}`}>{d.kind}</span><div className="fm-row-title"><b>{d.title}</b><small>Depuis {d.days} j{d.amount?` · ${money(d.amount)}`:''}{d.reminders?` · ${d.reminders} rappel(s), dernier le ${new Date(d.lastReminder!).toLocaleDateString('fr-CA')}`:''}</small></div><div className="module-actions"><button className="btn ghost" onClick={()=>onOpen(d.recordId)}>Ouvrir</button>{d.kind!=='Choix'&&<button className="btn secondary" disabled={busy===d.key} onClick={()=>void remind(d)}>{busy===d.key?'Envoi…':'Relancer'}</button>}</div></article>)}</div>):<div className="portal-empty"><p>Rien n’attend vos clients pour le moment.</p></div>}
  <ClientRequests records={records} clients={clients} onOpen={onOpen} onSaveProject={onSaveProject}/>
  <p className="muted small">Une relance manuelle est limitée à une par document toutes les 20 heures. Sans service de courriel configuré, aucune relance n’est envoyée ni comptée.</p>
 </section>;
}

/** Change requests sent by clients from their portal; answering never changes a contract by itself. */
function ClientRequests({records,clients,onOpen,onSaveProject}:{records:RecordItem[];clients:RecordItem[];onOpen:(id:string)=>void;onSaveProject:(project:RecordItem,data:Record<string,unknown>)=>Promise<unknown>}){
 const rows=records.filter(r=>r.kind==='project').flatMap(p=>clientRequestsFrom(p.data.client_requests).map(req=>({project:p,req})));
 const [draft,setDraft]=useState<Record<string,{status:ClientRequest['status'];response:string}>>({}),[message,setMessage]=useState('');
 if(!rows.length)return null;
 async function save(project:RecordItem,req:ClientRequest){const d=draft[req.id];if(!d)return;setMessage('');try{await onSaveProject(project,{...project.data,client_requests:clientRequestsFrom(project.data.client_requests).map(x=>x.id===req.id?{...x,status:d.status,response:d.response.trim()}:x)});setDraft(old=>{const n={...old};delete n[req.id];return n});setMessage('Réponse enregistrée : le client la voit dans son espace.')}catch(e){setMessage((e as Error).message)}}
 return <div className="fm-list"><p className="eyebrow fm-group">Demandes des clients</p>{message&&<p role="status" className="muted">{message}</p>}{rows.sort((a,b)=>b.req.createdAt.localeCompare(a.req.createdAt)).map(({project,req})=>{const d=draft[req.id]||{status:req.status,response:req.response};return <article key={req.id} className="fm-card"><div className="fm-card-head"><div><b>{req.title}</b><p className="muted small">{String(clients.find(c=>c.id===project.client_id)?.data.name||'')} · {String(project.data.title||'')} · {new Date(req.createdAt).toLocaleDateString('fr-CA')} · {req.author}</p></div><span className={`state-pill ${req.status==='Nouvelle'?'warn':req.status==='Refusée'?'danger':'ok'}`}>{req.status}</span></div>{req.description&&<p className="small">{req.description}</p>}<div className="vendor-form compact"><label>Statut<select value={d.status} onChange={e=>setDraft({...draft,[req.id]:{...d,status:e.target.value as ClientRequest['status']}})}>{requestStatuses.map(x=><option key={x}>{x}</option>)}</select></label><label className="wide">Réponse au client<textarea rows={2} value={d.response} onChange={e=>setDraft({...draft,[req.id]:{...d,response:e.target.value}})}/></label><div className="module-actions wide"><button className="btn secondary" disabled={!draft[req.id]} onClick={()=>void save(project,req)}>Enregistrer la réponse</button><button className="btn ghost" onClick={()=>onOpen(project.id)}>Ouvrir le projet</button></div></div></article>})}</div>;
}
