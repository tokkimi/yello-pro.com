'use client';

import {useEffect,useRef,useState} from 'react';
import {extensionTemplate,fromRooms,planSchema,type Plan} from '@/lib/plan';
import {money,totals,type RecordItem,type Data,type Kind} from '@/lib/model';
import PlanEditor from './plan-editor';
import PlanInvitations from './plan-invitations';
import ProjectOperations from './project-operations';
import {projectSettingsFrom} from '@/lib/settings-model';
import {professionalsFrom} from '@/lib/directory';
import OperationsCentre from './operations-centre';
import ProjectClientTools from './project-client-tools';
import ScheduleEditor from './schedule-editor';
import {catalogueFrom,starterCatalogue} from '@/lib/catalogue';

type Props={
 record:RecordItem;visits:RecordItem[];documents:RecordItem[];projectRecords:RecordItem[];email:string;users?:Data[];
 demo:boolean;userId:string;onSave:(data:Data)=>Promise<RecordItem>;onUpload:(file:File,visibility?:'client'|'internal',caption?:string)=>Promise<void>
};
type Finance={contractValue:number;invoiced:number;paid:number;debit:number;balance:number};
const projectStatusOptions=['Planifi\u00e9','\u00c0 soumissionner','Visite planifi\u00e9e','Soumission envoy\u00e9e','Soumission sign\u00e9e','En construction','En cours','En pause','Termin\u00e9','Compl\u00e9t\u00e9','Archiv\u00e9'];
function financeFor(projectId:string,rows:RecordItem[]):Finance{const related=rows.filter(row=>row.project_id===projectId),contracts=related.filter(row=>row.kind==='contract'&&!row.data.partner_id&&row.data.status==='Signé'),quotes=related.filter(row=>row.kind==='quote'&&row.data.status==='Accepté'),linkedQuoteIds=new Set(contracts.map(contract=>String(contract.data.quote_id||'')).filter(Boolean));const contractValue=contracts.reduce((sum,contract)=>sum+(Number(contract.data.amount)||totals(contract.data).total),0)+quotes.filter(quote=>!linkedQuoteIds.has(quote.id)).reduce((sum,quote)=>sum+totals(quote.data).total,0);const invoices=related.filter(row=>row.kind==='invoice'&&!['Brouillon','Annulée'].includes(String(row.data.status)));const invoiced=invoices.reduce((sum,invoice)=>sum+totals(invoice.data).total,0),paid=invoices.reduce((sum,invoice)=>sum+Number(invoice.data.paid||0),0);return {contractValue,invoiced,paid,debit:Math.max(0,invoiced-paid),balance:Math.max(0,contractValue-invoiced)}}

export default function ProjectPlan({record,visits,documents,projectRecords,email,demo,userId,onSave,onUpload,users=[]}:Props){
 const [plan,setPlan]=useState<Plan|null>(record.data.plan||null);
 const [removedDocuments,setRemovedDocuments]=useState<string[]>([]);
 const [open,setOpen]=useState(false);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState<Plan|null>(null);
 const [saved,setSaved]=useState(!!record.data.plan);
 const [changed,setChanged]=useState(false);
 const finance=financeFor(record.id,projectRecords);
 const projectRows=projectRecords.filter(row=>row.project_id===record.id);
 const [activeTab,setActiveTab]=useState('overview');
 const [selectedFolder,setSelectedFolder]=useState<string|null>(null);
 const key=`yello-pro-project-plan-${userId}-${record.id}`;
 const saveRef=useRef(onSave);
 const recordDataRef=useRef(record.data);
 saveRef.current=onSave;
 recordDataRef.current=record.data;
 const starterPlan=()=>fromRooms([{name:'Pièce principale',length:5,width:4,height:2.5,unit:'m'}]);

 useEffect(()=>{
  try{
   const raw=localStorage.getItem(key);
   if(!raw)return;
   const candidate=JSON.parse(raw);
   if(planSchema.safeParse(candidate).success)setRecovery(candidate);
  }catch{}
 },[key]);

 useEffect(()=>{
  const anchor=document.getElementById('project-plans');if(!anchor)return;
  const tabs=[['overview','Sommaire'],['communications','Communications'],['files','Fichiers'],['quotes','Soumissions'],['changes','Changements'],['contracts','Contrat'],['selections','Sélections'],['invoices','Factures'],['expenses','Dépenses'],['timesheets','Feuille de temps'],['reports','Rapports'],['pilotage','Budget'],['orders','Achats'],['agenda','Échéancier'],['tasks','Tâches'],['phases','Phases'],['journal','Journal'],['plans','Plans 2D / 3D']] as const;
  const areas:Record<string,string[]>={selections:[],invoices:[],expenses:[],timesheets:[],reports:[],overview:['.project-finance-summary','.project-entry-grid','.project-top-actions'],communications:['.project-communications-panel'],files:['.project-files-panel'],pilotage:['.project-operations-surface'],orders:['.project-operations-surface'],journal:['.project-operations-surface'],plans:['.project-plan-panel'],phases:['.project-phases'],tasks:['.project-workboard[data-project-section="tasks"]'],legacyAgenda:['.project-workboard[data-project-section="agenda"]'],agenda:[],contracts:['.project-workboard[data-project-section="contracts"]'],quotes:['.project-workboard[data-project-section="quotes"]'],changes:['.project-workboard[data-project-section="changes"]']};
  const nodes=Array.from(new Set(Object.values(areas).flatMap(selectors=>selectors.flatMap(selector=>Array.from(document.querySelectorAll<HTMLElement>(selector))))));
  const nav=document.createElement('nav');nav.className='project-mini-tabs';nav.setAttribute('aria-label','Sections du projet');
  const more=document.createElement('details');more.className='project-tabs-more';more.innerHTML='<summary>Plus <span>⌄</span></summary><div></div>';const moreBody=more.querySelector('div');
  const primary=new Set(['overview','communications','files','quotes','changes','contracts']);
  const buttons=tabs.map(([key,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.tab=key;button.setAttribute('role','tab');if(primary.has(key))nav.append(button);else moreBody?.append(button);return button});
  nav.append(more);
  const select=(key:string)=>{nodes.forEach(node=>node.classList.add('project-tab-hidden'));(areas[key]||[]).forEach(selector=>document.querySelectorAll<HTMLElement>(selector).forEach(node=>node.classList.remove('project-tab-hidden')));anchor.dataset.projectTab=key;try{sessionStorage.setItem('yello-pro-project-tab-'+record.id,key)}catch{}setActiveTab(key);buttons.forEach(button=>{const active=button.dataset.tab===key;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});more.removeAttribute('open')};
  const onOpenTab=(event:Event)=>{const key=(event as CustomEvent<string>).detail;if(areas[key])select(key)};
  window.addEventListener('mgpro:open-project-tab',onOpenTab);
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.tab||'overview')));
  anchor.prepend(nav);anchor.dataset.projectTab='overview';let initial='overview';try{initial=sessionStorage.getItem('yello-pro-project-tab-'+record.id)||'overview'}catch{}select(areas[initial]?initial:'overview');
  return()=>{window.removeEventListener('mgpro:open-project-tab',onOpenTab);nav.remove();nodes.forEach(node=>node.classList.remove('project-tab-hidden'));};
 },[record.id]);

 useEffect(()=>{
  if(!changed||!plan||demo)return;
  const timer=window.setTimeout(async()=>{
   setBusy(true);
   try{
    await saveRef.current({...recordDataRef.current,plan});
    localStorage.removeItem(key);
    setRecovery(null);
    setSaved(true);
    setChanged(false);
    setMessage('Plan enregistré automatiquement dans le projet.');
   }catch(error){
    setMessage(`${(error as Error).message} Le plan reste conservé sur cet appareil.`);
   }finally{setBusy(false)}
  },900);
  return()=>window.clearTimeout(timer);
 },[changed,plan,demo,key]);

 function change(next:Plan){
  setPlan(next);
  setSaved(false);
  setChanged(true);
  try{
   localStorage.setItem(key,JSON.stringify(next));
   setMessage(demo?'Démonstration : modification temporaire.':'Modifications sauvegardées ici, puis enregistrées automatiquement dans le projet.');
  }catch{
   setMessage('Stockage local indisponible. Gardez cette page ouverte pendant l’enregistrement.');
  }
 }

 async function persist(){
  if(!plan)return;
  setBusy(true);
  try{
   await saveRef.current({...recordDataRef.current,plan});
   localStorage.removeItem(key);
   setRecovery(null);
   setSaved(true);
   setChanged(false);
   setMessage('Plan enregistré dans le projet. Vous pouvez le rouvrir à tout moment.');
  }catch(error){
   setMessage(`${(error as Error).message} Le plan reste conservé sur cet appareil.`);
  }finally{setBusy(false)}
 }

 async function removePdf(document:RecordItem){
  if(!window.confirm(`Supprimer définitivement « ${document.data.name} » ?`))return;
  setBusy(true);
  try{
   if(!demo){
    const response=await fetch('/api/documents',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:document.id})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Suppression impossible.');
    setMessage(result.warning||'PDF supprimé du projet et du stockage.');
   }else setMessage('Démonstration : PDF retiré de cette session.');
   setRemovedDocuments(ids=>[...ids,document.id]);
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }

 async function resetPlan(){
  if(!window.confirm('Supprimer le plan 2D/3D de ce projet ? Le brouillon de cet appareil sera aussi retiré.'))return;
  setBusy(true);
  try{
   const data={...recordDataRef.current};
   delete data.plan;
   if(!demo)await saveRef.current(data);
   localStorage.removeItem(key);
   setPlan(null);
   setOpen(false);
   setSaved(false);
   setChanged(false);
   setRecovery(null);
   setMessage(demo?'Démonstration : plan retiré.':'Plan 2D/3D supprimé du projet.');
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }

 const pdfs=documents.filter(document=>document.data.mime==='application/pdf'&&!removedDocuments.includes(document.id));
 const visitPlans=visits.filter(visit=>visit.data.plan);
 const usablePlan=!!plan&&planSchema.safeParse(plan).success;
 const openTasks=projectRows.filter(row=>row.kind==='task'&&row.data.status!=='Validée'),phases=projectRows.filter(row=>row.kind==='phase'&&!row.data.archived),nextVisit=visits.filter(visit=>String(visit.data.date||visit.data.start||'').slice(0,10)>=new Date().toISOString().slice(0,10)&&visit.data.status!=='Annulée').sort((a,b)=>String(a.data.date||a.data.start||'9999').localeCompare(String(b.data.date||b.data.start||'9999')))[0],progress=phases.length?Math.round(phases.reduce((sum,phase)=>sum+Math.max(0,Math.min(100,Number(phase.data.progress||0))),0)/phases.length):0;
 const fileFolders=[['Plans & relevés',documents.filter(document=>document.data.mime==='application/pdf').length],['Photos',documents.filter(document=>String(document.data.mime||'').startsWith('image/')).length],['Soumissions',projectRows.filter(row=>row.kind==='quote'&&!(row.data.change_order||row.data.document_type==='change_order')).length],['Ordres de changement',projectRows.filter(row=>row.kind==='quote'&&(row.data.change_order||row.data.document_type==='change_order')).length],['Contrats',projectRows.filter(row=>row.kind==='contract').length],['Factures',projectRows.filter(row=>row.kind==='invoice').length],['Dépenses',projectRows.filter(row=>row.kind==='expense').length]];
 const folderDocuments=selectedFolder==='Plans & relevés'?documents.filter(document=>document.data.mime==='application/pdf'):selectedFolder==='Photos'?documents.filter(document=>String(document.data.mime||'').startsWith('image/')):[];
 const folderRecords=projectRows.filter(row=>selectedFolder==='Soumissions'?row.kind==='quote'&&!(row.data.change_order||row.data.document_type==='change_order'):selectedFolder==='Ordres de changement'?row.kind==='quote'&&(row.data.change_order||row.data.document_type==='change_order'):selectedFolder==='Contrats'?row.kind==='contract':selectedFolder==='Factures'?row.kind==='invoice':selectedFolder==='Dépenses'?row.kind==='expense':false);
 const triggerAction=(label:string)=>{const action=[...document.querySelectorAll<HTMLButtonElement>('.detail-actions button')].find(button=>button.textContent?.includes(label));action?.click()};
 return <><section className="project-finance-summary" aria-label="Suivi financier du projet"><article className="finance-value"><span>Valeur du contrat</span><strong>{money(finance.contractValue)}</strong><small>Signé et accepté</small></article><article className="finance-invoiced"><span>Facturé à ce jour</span><strong>{money(finance.invoiced)}</strong><small>Factures émises</small></article><article className="finance-paid"><span>Payé à ce jour</span><strong>{money(finance.paid)}</strong><small>Paiements reçus</small></article><article className="finance-debit"><span>Compte débiteur</span><strong>{money(finance.debit)}</strong><small>À encaisser</small></article><article className="finance-balance"><span>Solde du contrat</span><strong>{money(finance.balance)}</strong><small>Reste à facturer</small></article></section><section className="project-entry-grid" aria-label="Accueil du projet"><article><p className="eyebrow">À FAIRE MAINTENANT</p><h3>{openTasks.length?openTasks.length+' tâche'+(openTasks.length>1?'s':''):'Aucune tâche urgente'}</h3><p>{openTasks[0]?.data.title||'Le chantier est à jour.'}</p><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-tab',{detail:'tasks'}))}>Voir les tâches</button></article><article><p className="eyebrow">PROCHAIN RENDEZ-VOUS</p><h3>{nextVisit?.data.title||'Aucune visite planifiée'}</h3><p>{nextVisit?(nextVisit.data.date||nextVisit.data.start||'Date à préciser'):'Ajoutez une visite depuis les actions du projet.'}</p><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-tab',{detail:'agenda'}))}>Voir l’agenda</button></article><article><p className="eyebrow">SUIVI DU CHANTIER</p><h3>{progress}% d’avancement</h3><p>{phases.length?phases.length+' phase'+(phases.length>1?'s':'')+' active(s)':'Créez les phases du projet.'}</p><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-tab',{detail:'phases'}))}>Voir les phases</button></article><article><p className="eyebrow">PLANS ET FICHIERS</p><h3>{documents.length} document{documents.length>1?'s':''}</h3><p>{plan?'Plan 2D / 3D disponible':'Ajoutez un plan ou un PDF de référence.'}</p><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-tab',{detail:'plans'}))}>Ouvrir les plans</button></article></section><section className="project-top-actions"><header><div><p className="eyebrow">ACTIONS DU DOSSIER</p><h2>Piloter le projet</h2></div><label>Statut<select value={record.data.status||'Planifié'} onChange={event=>void onSave({...record.data,status:event.target.value})}>{projectStatusOptions.map(status=><option key={status}>{status}</option>)}</select></label></header><div>{['Ajouter une phase','Ajouter une tâche','Faire un relevé','Créer une soumission','Ajouter un ordre de changement','Créer le cahier des charges'].map(action=><button key={action} type="button" onClick={()=>triggerAction(action)}>{action}</button>)}<button type="button" onClick={()=>document.querySelector<HTMLInputElement>('.detail-actions .upload-button input')?.click()}>Ajouter photos / PDF</button><button className="archive-action" type="button" onClick={()=>triggerAction('Archiver le projet')}>Archiver le projet</button></div></section><section className="panel project-plan-panel">
  <div className="panel-title"><div><p className="eyebrow">PLANS DU DOSSIER</p><h2>Plans 2D & 3D</h2></div>{saved&&<span className="saved-indicator">Enregistré</span>}</div>
  <div className="detail-body">
   <p>Le plan reste relié au projet, même après la visite. Ajoutez le PDF de référence, reprenez les pièces et ouvrez la visualisation 3D quand vous le souhaitez.</p>
   <label className="upload-button">Ajouter le PDF du plan<input type="file" accept="application/pdf" disabled={busy||demo} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setBusy(true);try{if(file.size>4*1024*1024)throw Error('Le PDF doit faire moins de 4 Mo.');await onUpload(file);setMessage('PDF conservé sur cet appareil et prêt à être transféré.')}catch(error){setMessage((error as Error).message)}finally{setBusy(false);event.target.value=''}}}/></label>
   {pdfs.length>0&&<div className="plan-document-list">{pdfs.map(document=><div className="plan-document" key={document.id}><a href={`/api/documents?id=${document.id}`} target="_blank" rel="noreferrer">PDF · {document.data.name}</a><button type="button" className="plan-document-delete" disabled={busy} onClick={()=>removePdf(document)} aria-label={`Supprimer ${document.data.name}`}>Supprimer</button></div>)}</div>}
   <p className="muted">Le PDF sert de référence : il n’est pas converti automatiquement en géométrie. Le plan 2D reste modifiable pièce par pièce avant la prévisualisation 3D.</p>
   {recovery&&<button className="btn secondary" onClick={()=>{setPlan(recovery);setSaved(false);setChanged(true);setRecovery(null);setOpen(true)}}>Reprendre les modifications non enregistrées</button>}
   {!plan&&<div className="button-row"><button className="btn primary" onClick={()=>{change(starterPlan());setOpen(true)}}>Créer le plan 2D</button>{pdfs.length>0&&<button className="btn secondary" onClick={()=>{change(extensionTemplate());setOpen(true)}}>Créer un relevé maison / agrandissement</button>}{visitPlans.map(visit=><button className="btn secondary" key={visit.id} onClick={()=>{change(structuredClone(visit.data.plan));setOpen(true)}}>Reprendre le plan : {visit.data.title}</button>)}</div>}
   {plan&&!usablePlan&&<div className="notice"><b>Ce plan n’a pas de mesures utilisables.</b><p>Il faut au moins une pièce avec longueur, largeur et hauteur. Créez une base propre puis adaptez les cotes à partir du PDF.</p><button className="btn primary" disabled={busy} onClick={()=>{change(starterPlan());setOpen(true)}}>Réinitialiser avec une pièce mesurée</button><button className="btn secondary" disabled={busy} onClick={()=>{change(extensionTemplate());setOpen(true)}}>Créer le relevé maison / agrandissement</button><button className="btn danger-outline" disabled={busy} onClick={resetPlan}>Supprimer ce plan</button></div>}
   {plan&&usablePlan&&<><div className="button-row"><button className="btn primary" onClick={()=>setOpen(value=>!value)}>{open?'Fermer la visualisation':plan.validated?'Visualiser en 3D':'Ouvrir le plan 2D'}</button><button className="btn secondary" disabled={busy} onClick={persist}>Enregistrer maintenant</button><button className="btn danger-outline" disabled={busy} onClick={resetPlan}>Supprimer le plan 2D/3D</button></div>{open&&<PlanEditor value={plan} onChange={change} initialView="design" references={pdfs.map(document=>({id:document.id,name:document.data.name,href:`/api/documents?id=${document.id}`}))}/>} {saved&&plan.validated&&<PlanInvitations id={record.id} email={email} demo={demo}/>}</>}
   {message&&<p role="status">{message}</p>}
  </div>

 </section><div className="project-operations-surface"><ProjectOperations record={record} demo={demo} onSave={onSave} onUpload={onUpload} phases={projectRows.filter(x=>x.kind==='phase').map(x=>({id:x.id,title:String(x.data.title||x.data.name||'Phase')}))} suppliers={[...professionalsFrom(projectRecords.find(x=>x.kind==='settings')?.data.directory).filter(x=>!x.archived).map(x=>({name:x.company||x.name,email:x.email})),...users.filter(x=>x.active!==false&&x.role!=='client').map(x=>({name:String(x.name||''),email:String(x.email||'')}))]} fieldMode="journal" section={activeTab==='journal'?'field':activeTab==='orders'?'orders':'budget'}/></div>{activeTab==='agenda'&&<SchedulePublication record={record} onSave={onSave}/>}{activeTab==='agenda'&&<ScheduleEditor key={record.id+'-schedule'} value={record.data.schedule} calendar={(()=>{const p=projectSettingsFrom(projectRecords.find(x=>x.kind==='settings')?.data||{});return {workWeek:p.work_week,holidays:p.holidays.filter(Boolean)}})()} templates={[...starterCatalogue,...catalogueFrom(projectRecords.find(x=>x.kind==='settings')?.data.catalogue)].filter(x=>x.activities.length).map(x=>({id:x.id,name:x.name,activities:x.activities}))} onSave={schedule=>onSave({...record.data,schedule})}/>}{activeTab==='timesheets'&&<OperationsCentre key="project-timesheets" section="timesheets" projects={[record]} clients={projectRecords.filter(x=>x.kind==='client')} quotes={projectRows.filter(x=>x.kind==='quote')} people={users.filter(x=>x.active!==false&&x.role!=='client')} onSave={(_,data)=>onSave(data)} onOpen={()=>{}}/>}{(activeTab==='selections'||activeTab==='reports')&&<ProjectClientTools key={activeTab} project={record} records={projectRecords} section={activeTab==='selections'?'selections':'construction_reports'} onSave={onSave}/>} {(activeTab==='invoices'||activeTab==='expenses')&&<ProjectFinancialRecords project={record} rows={projectRows} section={activeTab}/>}
<section className="panel project-communications-panel"><div className="panel-title"><div><p className="eyebrow">COMMUNICATIONS DU PROJET</p><h2>Conversations, courriels et notes</h2></div></div><div className="project-communication-grid"><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-communications',{detail:{projectId:record.id,clientId:record.client_id,scope:'client'}}))}><span>💬</span><b>Chat avec le client</b><small>Messages et pièces jointes liés au dossier.</small></button><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-communications',{detail:{projectId:record.id,clientId:record.client_id,scope:'team'}}))}><span>👷</span><b>Équipe & prestataires</b><small>Échanges internes et demandes de prix.</small></button><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-communications',{detail:{projectId:record.id,clientId:record.client_id,scope:'email'}}))}><span>✉️</span><b>Courriels envoyés</b><small>Courriels et documents transmis au client.</small></button><label><span>📝</span><b>Note interne du projet</b><textarea defaultValue={record.data.communication_note||''} placeholder="Ajouter une note pour l’équipe…" onBlur={event=>void onSave({...record.data,communication_note:event.target.value})}/><small>Visible seulement par l’équipe du projet.</small></label></div></section><section className="panel project-files-panel"><div className="panel-title"><div><p className="eyebrow">FICHIERS DU PROJET</p><h2>Dossiers classés</h2></div><label className="upload-button">Ajouter un fichier<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy||demo} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;try{await onUpload(file);setMessage('Fichier ajouté au projet.')}catch(error){setMessage((error as Error).message)}finally{event.target.value=''}}}/></label></div><div className="project-file-folders">{fileFolders.map(([name,count])=><button type="button" className={selectedFolder===name?'active':''} key={String(name)} onClick={()=>setSelectedFolder(String(name))}><span>📁</span><b>{name}</b><small>{count} élément{Number(count)>1?'s':''}</small></button>)}</div>{selectedFolder&&<div className="project-folder-content"><h3>{selectedFolder}</h3>{folderDocuments.map(item=><a href={`/api/documents?id=${item.id}`} target="_blank" rel="noreferrer" key={item.id}>{item.data.name||'Fichier'} <span>Ouvrir ↗</span></a>)}{folderRecords.map(item=><button type="button" key={item.id} onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-record',{detail:{id:item.id,projectId:record.id}}))}>{item.data.title||item.data.number||'Document'} <span>{item.data.status||'Brouillon'} →</span></button>)}{!folderDocuments.length&&!folderRecords.length&&<p>Aucun élément dans ce dossier pour le moment.</p>}</div>}</section></>;
}

function ProjectFinancialRecords({project,rows,section}:{project:RecordItem;rows:RecordItem[];section:'invoices'|'expenses'}){
 const [tab,setTab]=useState('Sommaire');const invoice=section==='invoices';const records=rows.filter(x=>x.kind===(invoice?'invoice':'expense'));
 const entries=tab==='Paiements'?records.flatMap(record=>(record.data.payments||[]).map((item:Data,index:number)=>({id:record.id+'-'+index,record,data:item}))):tab==='Notes de crédit'?records.flatMap(record=>(record.data.credits||[]).map((item:Data,index:number)=>({id:record.id+'-'+index,record,data:item}))):records.map(record=>({id:record.id,record,data:record.data}));
 return <section className="module-centre"><div className="module-section-heading"><div><h2>{invoice?'Factures du projet':'Dépenses du projet'}</h2><p>{invoice?'Factures, paiements et crédits rattachés à ce chantier.':'Dépenses et justificatifs rattachés à ce chantier.'}</p></div><button className="btn primary" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:create-project-record',{detail:{kind:invoice?'invoice':'expense',projectId:project.id,clientId:project.client_id}}))}>Créer {invoice?'une facture':'une dépense'}</button></div>{invoice&&<div className="module-actions">{['Sommaire','Factures','Paiements','Notes de crédit'].map(name=><button className="btn secondary" aria-pressed={tab===name} key={name} onClick={()=>setTab(name)}>{name}</button>)}</div>}<div className="operations-global-list list">{entries.map(item=><article key={item.id}><div><small>{item.data.date||item.record.data.date} · {item.data.status||item.record.data.status}</small><h3>{item.data.title||item.record.data.title||item.record.data.number||item.record.data.supplier}</h3><strong>{money(tab==='Paiements'||tab==='Notes de crédit'?Number(item.data.amount||0):invoice?totals(item.record.data).total:Number(item.data.net||0)+Number(item.data.tps||0)+Number(item.data.tvq||0))}</strong>{invoice&&['Sommaire','Factures'].includes(tab)&&<p>Réglé : {money(Number(item.data.paid||0))} · Solde : {money(Math.max(0,totals(item.data).total-Number(item.data.paid||0)))}</p>}</div><button className="btn secondary" onClick={()=>window.dispatchEvent(new CustomEvent('mgpro:open-project-record',{detail:{id:item.record.id,projectId:project.id}}))}>Consulter</button></article>)}</div>{!entries.length&&<div className="module-empty"><h3>Aucun élément</h3><p>Les éléments créés pour ce projet apparaîtront ici.</p></div>}</section>
}

/** Explicit client publication of the project schedule; saving the schedule never publishes it by itself. */
function SchedulePublication({record,onSave}:{record:RecordItem;onSave:(data:Data)=>Promise<unknown>}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const published=record.data.schedule_published===true;
 async function toggle(){setBusy(true);setMessage('');try{await onSave({...record.data,schedule_published:!published,schedule_published_at:!published?new Date().toISOString():record.data.schedule_published_at});setMessage(!published?'Échéancier publié : le client voit les dates et l’avancement (sans les responsables).':'Échéancier retiré de l’espace client.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <div className="schedule-publication"><span>{published?'Publié au client':'Non publié : le client voit un état « en préparation »'}</span><button type="button" className="btn secondary" disabled={busy} onClick={()=>void toggle()}>{published?'Retirer de l’espace client':'Publier au client'}</button>{message&&<small role="status">{message}</small>}</div>;
}
