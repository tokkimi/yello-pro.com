'use client';

import {useEffect,useState} from 'react';
import {defaults,money,totals,type Data,type RecordItem} from '@/lib/model';
import {invoiceState,outstanding,safePaymentUrl} from '@/lib/billing';
import {scheduleEnd,scheduleFrom} from '@/lib/schedule';
import {SharedProjectTools} from './project-client-tools';
import {clientRequestsFrom,type ClientRequest} from '@/lib/client-requests';

/*
 * Client space organised in nine sections (Billdr portal map, Yello Pro wording).
 * Everything shown here was already filtered and redacted by the server for this client:
 * drafts, internal notes, costs, unpublished reports, selections, logs and schedules never reach the browser.
 */
const sections=['Vue d’ensemble','Contrats','Soumissions','Sélections','Factures','Rapports','Fichiers','Échéancier','Journal','Demandes'] as const;
type Section=typeof sections[number];
type Props={records:RecordItem[];demo:boolean;onOpen:(id:string)=>void;onUpdate:(record:RecordItem)=>void};
const title=(r:RecordItem)=>String(r.data.title||r.data.number||r.data.name||'Document');
const date=(value:unknown)=>String(value||'').slice(0,10)||'—';

function Empty({children}:{children:React.ReactNode}){return <div className="portal-empty"><p>{children}</p></div>}
function Rows({head,rows,empty}:{head:string[];rows:React.ReactNode[][];empty:string}){
 if(!rows.length)return <Empty>{empty}</Empty>;
 return <div className="vendor-table" role="region" aria-label="Liste" tabIndex={0}><table><thead><tr>{head.map((h,i)=><th key={i}>{h||<span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default function ClientPortal({records,demo,onOpen,onUpdate}:Props){
 const projects=records.filter(r=>r.kind==='project'&&!r.data.archived);
 const [projectId,setProjectId]=useState(projects[0]?.id||'');
 const [section,setSection]=useState<Section>('Vue d’ensemble');
 useEffect(()=>{if(!projects.some(p=>p.id===projectId)&&projects[0])setProjectId(projects[0].id)},[projects,projectId]);
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
 const project=projects.find(p=>p.id===projectId);
 if(!project)return <section className="panel client-portal"><h2>Votre espace client</h2><Empty>Aucun projet n’est encore partagé avec vous.</Empty></section>;
 const own=records.filter(r=>r.project_id===project.id);
 const quotes=own.filter(r=>r.kind==='quote'&&r.data.document_type!=='change_order');
 const changes=own.filter(r=>r.kind==='quote'&&r.data.document_type==='change_order');
 const contracts=own.filter(r=>r.kind==='contract'&&!r.data.partner_id);
 const invoices=own.filter(r=>r.kind==='invoice');
 const files=own.filter(r=>r.kind==='document');
 const reports:Data[]=Array.isArray(project.data.construction_reports)?project.data.construction_reports:[];
 const logs:Data[]=Array.isArray(project.data.operations?.dailyLogs)?project.data.operations.dailyLogs:[];
 const schedule=project.data.schedule_published===true?scheduleFrom(project.data.schedule):[];
 const selections:Data[]=Array.isArray(project.data.selections)?project.data.selections:[];
 const requests=clientRequestsFrom(project.data.client_requests);
 const phases=records.filter(r=>r.kind==='phase'&&r.project_id===project.id&&!r.data.archived);
 const progress=phases.length?Math.round(phases.reduce((s,p)=>s+Math.max(0,Math.min(100,Number(p.data.progress||0))),0)/phases.length):null;
 const signed=contracts.filter(r=>r.data.status==='Signé');
 const contractValue=signed.reduce((s,r)=>s+(Number(r.data.amount)||totals(r.data).total),0)+quotes.filter(q=>q.data.status==='Accepté'&&!signed.some(c=>c.data.quote_id===q.id)).reduce((s,q)=>s+totals(q.data).total,0)+changes.filter(q=>q.data.status==='Accepté').reduce((s,q)=>s+totals(q.data).total,0);
 const issued=invoices.filter(r=>!['Brouillon','Annulée'].includes(String(r.data.status)));
 const invoiced=issued.reduce((s,r)=>s+totals(r.data).total,0),paid=issued.reduce((s,r)=>s+Number(r.data.paid||0),0);
 const pending=[...quotes.filter(q=>q.data.status==='Envoyé').map(q=>({id:q.id,label:`Soumission à examiner : ${title(q)}`})),...changes.filter(q=>q.data.status==='Envoyé').map(q=>({id:q.id,label:`Ordre de changement à approuver : ${title(q)}`})),...contracts.filter(c=>c.data.status==='Envoyé').map(c=>({id:c.id,label:`Contrat à signer : ${title(c)}`})),...issued.filter(i=>totals(i.data).total-Number(i.data.paid||0)>0.004).map(i=>({id:i.id,label:`Facture avec solde : ${title(i)}`}))];
 const waitingChoices=selections.filter(s=>!s.decision).length;
 const counts:Partial<Record<Section,number>>={'Contrats':contracts.length+changes.length,'Soumissions':quotes.length,'Sélections':selections.length,'Factures':issued.length,'Rapports':reports.length,'Fichiers':files.length,'Échéancier':schedule.length,'Journal':logs.length,'Demandes':requests.filter(r=>r.status==='Nouvelle'||r.status==='En étude').length};
 const open=(id:string)=><button className="btn ghost" onClick={()=>onOpen(id)}>Ouvrir</button>;
 return <section className="panel client-portal">
  <header className="portal-header"><div><p className="eyebrow">ESPACE CLIENT</p><h2>{String(project.data.title||'Projet')}</h2><p className="muted">{String(project.data.address||'Adresse à confirmer')} · {String(project.data.status||'')}</p></div>{projects.length>1&&<label>Projet<select value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{String(p.data.title||'Projet')}</option>)}</select></label>}</header>
  <nav className="portal-nav" aria-label="Rubriques de l’espace client">{sections.map(name=><button key={name} aria-current={section===name?'page':undefined} className={section===name?'active':''} onClick={()=>setSection(name)}>{name}{counts[name]?<span>{counts[name]}</span>:null}</button>)}</nav>
  <div className="portal-body">
   {section==='Vue d’ensemble'&&<>
    <dl className="portal-kpis">{[['Valeur du contrat',contractValue],['Facturé',invoiced],['Payé',paid],['Solde à payer',Math.max(0,invoiced-paid)],['Reste à facturer',Math.max(0,contractValue-invoiced)]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>
    {progress!==null&&<div className="fm-card"><div className="fm-card-head"><div><p className="eyebrow">Avancement du chantier</p><h3>{progress} %</h3></div></div><div className="fm-progress"><span style={{width:progress+'%'}}/></div><ul className="portal-phases">{phases.map(p=><li key={p.id}><span>{String(p.data.title||p.data.name||'Phase')}</span><small>{String(p.data.status||'')} · {Number(p.data.progress||0)} %</small></li>)}</ul></div>}
    <h3>Actions en attente</h3>
    {pending.length||waitingChoices?<ul className="portal-pending">{pending.map(p=><li key={p.id}><span>{p.label}</span>{open(p.id)}</li>)}{waitingChoices>0&&<li><span>{waitingChoices} choix de matériaux à faire</span><button className="btn ghost" onClick={()=>setSection('Sélections')}>Choisir</button></li>}</ul>:<Empty>Aucune action ne vous est demandée pour le moment.</Empty>}
    <div className="portal-contact"><b>{defaults.name}</b><span>{defaults.phone}</span><a href={`mailto:${defaults.email}`}>{defaults.email}</a><small>Licence RBQ {defaults.rbq}</small></div>
   </>}
   {section==='Contrats'&&<><Rows head={['Contrat','Date','Statut','Total','']} rows={contracts.map(c=>[title(c),date(c.data.date||c.created_at),String(c.data.status||''),money(Number(c.data.amount)||totals(c.data).total),open(c.id)])} empty="Aucun contrat n’a encore été partagé."/><h3>Ordres de changement</h3><Rows head={['Ordre de changement','Reçu le','Statut','Total','']} rows={changes.map(c=>[title(c),date(c.data.date||c.created_at),String(c.data.status||''),money(totals(c.data).total),open(c.id)])} empty="Aucun ordre de changement."/></>}
   {section==='Soumissions'&&<Rows head={['Soumission','Reçue le','Validité','Statut','Total','']} rows={quotes.map(q=>[title(q),date(q.data.date||q.created_at),String(q.data.validity||'—'),String(q.data.status||''),money(totals(q.data).total),open(q.id)])} empty="Aucune soumission n’a encore été partagée."/>}
   {section==='Sélections'&&(selections.length?<><p className="muted">Votre choix est enregistré et horodaté. Il ne modifie jamais un contrat signé : un écart de prix fera l’objet d’un ordre de changement à approuver.</p><SharedProjectTools project={project} demo={demo} onUpdate={onUpdate}/></>:<Empty>Aucune sélection de matériaux n’est encore partagée. Elle apparaîtra ici lorsque l’équipe la publiera.</Empty>)}
   {section==='Factures'&&<Rows head={['Facture','Émise le','Échéance','Description','Total','Solde','Statut','']} rows={issued.map(i=>[String(i.data.number||'—'),date(i.data.date),date(i.data.due),String(i.data.title||''),money(totals(i.data).total),money(Math.max(0,totals(i.data).total-Number(i.data.paid||0))),invoiceState(i.data,today),<div key={i.id} className="module-actions">{open(i.id)}{outstanding(i.data)>0&&safePaymentUrl(i.data.payment_url)&&<a className="btn primary" href={safePaymentUrl(i.data.payment_url)} target="_blank" rel="noopener noreferrer">Payer en ligne</a>}</div>])} empty="Aucune facture émise."/>}
   {section==='Rapports'&&<Rows head={['Rapport','Reçu le','Avancement','Notes']} rows={reports.map(r=>[String(r.title||'Rapport'),date(r.date),`${Number(r.progress||0)} %`,String(r.notes||'')])} empty="Aucun rapport de chantier publié pour le moment."/>}
   {section==='Fichiers'&&<Rows head={['Fichier','Ajouté le','']} rows={files.map(f=>[String(f.data.name||f.data.title||'Fichier'),date(f.created_at),<a key="d" className="btn ghost" href={`/api/documents?id=${f.id}`}>Télécharger</a>])} empty="Aucun fichier partagé avec vous."/>}
   {section==='Échéancier'&&(project.data.schedule_published===true?<Rows head={['Étape','Début','Fin','Avancement']} rows={schedule.map(a=>[a.kind==='group'?<b key="t">{a.title}</b>:a.kind==='milestone'?`◆ ${a.title}`:a.title,a.start||'À planifier',a.start?scheduleEnd(a):'—',`${a.progress} %`])} empty="L’échéancier publié ne contient pas encore d’étape."/>:<Empty>L’échéancier est en préparation. Il apparaîtra ici lorsque l’équipe le publiera.</Empty>)}
   {section==='Demandes'&&<Requests projectId={project.id} requests={requests} demo={demo}/>}
   {section==='Journal'&&<Rows head={['Date','Travaux réalisés','Suites']} rows={logs.map(l=>[date(l.date),String(l.summary||''),String(l.blockers||'')])} empty="Aucune entrée de journal n’a été partagée avec vous."/>}
  </div>
 </section>;
}

function Requests({projectId,requests,demo}:{projectId:string;requests:ClientRequest[];demo:boolean}){
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState<ClientRequest[]>([]);
 const all=[...requests,...sent.filter(x=>!requests.some(r=>r.id===x.id))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 async function submit(){if(title.trim().length<3)return;if(demo){setMessage('Démonstration : la demande n’est pas transmise.');return}setBusy(true);setMessage('');try{const response=await fetch('/api/portal/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,title,description})});const body=await response.json();if(!response.ok)throw new Error(body.error);setSent(old=>[...old,body.request]);setTitle('');setDescription('');setMessage('Demande transmise à l’équipe.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <div className="portal-requests">
  <form className="vendor-form" onSubmit={e=>{e.preventDefault();void submit()}} aria-label="Nouvelle demande"><label className="wide">Que souhaitez-vous modifier ou ajouter ?<input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="wide">Détails (facultatif)<textarea rows={3} maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="module-actions wide"><button className="btn primary" disabled={busy||title.trim().length<3}>{busy?'Envoi…':'Envoyer la demande'}</button></div><p className="muted small wide">Une demande n’engage rien : l’équipe l’étudie et vous proposera un ordre de changement à approuver si elle modifie le prix ou le délai.</p></form>
  {message&&<p role="status" className="muted">{message}</p>}
  <Rows head={['Demande','Envoyée le','Statut','Réponse']} rows={all.map(r=>[<span key="t"><b>{r.title}</b>{r.description&&<><br/><small>{r.description}</small></>}</span>,date(r.createdAt),r.status,r.response||'—'])} empty="Aucune demande pour le moment."/>
 </div>;
}
