'use client';
import {useEffect,useMemo,useRef,useState,type ComponentType} from 'react';
import {Activity,ArrowLeft,CalendarDays,ClipboardList,FileText,FolderKanban,Hourglass,LayoutDashboard,MapPin,Menu,MessageSquare,Plus,ReceiptText,Search,Users,Wallet,X} from 'lucide-react';
import type {RecordItem} from '@/lib/model';
import {normalizeSearch,searchWorkspace} from '@/lib/workspace-search';
type Icon=ComponentType<{size?:number}>;
export type MenuItem={id:string;name:string;icon:Icon};
type Action={id:string;label:string;icon:Icon;run:()=>void};
type Props={records:RecordItem[];onOpenRecord:(id:string)=>void;role:'admin'|'worker'|'client';view:string;go:(view:string)=>void;start:(kind:string)=>void;items:MenuItem[];menuOpen:boolean;onMenuChange:(open:boolean)=>void;onLogout:()=>void};
const groups=[
 {name:'Vue d’ensemble',ids:['dashboard','notifications']},
 {name:'Clients & projets',ids:['requests','clients','projects','health','decisions','tasks','agenda']},
 {name:'Terrain',ids:['visits','timesheets','dailyLogs']},
 {name:'Documents & finances',ids:['quotes','catalogue','priceRequests','purchaseOrders','invoices','expenses','suppliers','accounting','documents']},
 {name:'Équipe & échanges',ids:['messages','contacts','partners','team','assistant']},
 {name:'Entreprise & abonnement',ids:['settings','subscription','profile','platform','seo']}
];
/** The same dialog serves quick actions and the complete menu, on desktop and phone. */
export default function MobileTabbar({records,onOpenRecord,role,view,go,start,items,menuOpen,onMenuChange,onLogout}:Props){
 const [quick,setQuick]=useState(false),[full,setFull]=useState(false),[query,setQuery]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),content=useRef<HTMLDivElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const searchInput=useRef<HTMLInputElement>(null);
 const open=quick||menuOpen,complete=full||menuOpen;
 const close=()=>{setQuick(false);setFull(false);setQuery('');onMenuChange(false)};
 useEffect(()=>{const el=dialog.current;if(!el)return;if(open){if(!el.open)el.showModal();const previous=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';return()=>{document.documentElement.style.overflow=previous}}else if(el.open)el.close()},[open]);
 useEffect(()=>{content.current?.scrollTo({top:0});if(open&&complete)closeButton.current?.focus({preventScroll:true})},[complete,open]);
 useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')){event.preventDefault();onMenuChange(true);requestAnimationFrame(()=>searchInput.current?.focus())}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[onMenuChange]);
 const results=useMemo(()=>searchWorkspace(records,query),[records,query]);
 const navigate=(id:string)=>{close();go(id)};
 const launch=(kind:string)=>{close();start(kind)};
 const more:Action[]=role==='admin'?[
  {id:'invoice',label:'Nouvelle facture',icon:ReceiptText,run:()=>launch('invoice')},
  {id:'expense',label:'Nouvelle dépense',icon:Wallet,run:()=>launch('expense')},
  {id:'task',label:'Nouvelle tâche',icon:ClipboardList,run:()=>launch('task')},
  {id:'client',label:'Nouveau client',icon:Users,run:()=>launch('client')},
  {id:'agenda',label:'Calendrier',icon:CalendarDays,run:()=>navigate('agenda')},
  {id:'health',label:'Santé des projets',icon:Activity,run:()=>navigate('health')},
  {id:'decisions',label:'Décisions clients',icon:Hourglass,run:()=>navigate('decisions')},
  {id:'invoices',label:'Factures',icon:ReceiptText,run:()=>navigate('invoices')}
 ]:role==='worker'?[
  {id:'messages',label:'Messagerie',icon:MessageSquare,run:()=>navigate('messages')},
  {id:'documents',label:'Documents',icon:FileText,run:()=>navigate('documents')}
 ]:[{id:'documents',label:'Documents',icon:FileText,run:()=>navigate('documents')},{id:'accounting',label:'Factures',icon:ReceiptText,run:()=>navigate('accounting')}];
 const tab=(id:string,label:string,Icon:Icon,run:()=>void,primary=false)=><button key={id} type="button" className={`tab${view===id?' active':''}${primary?' primary':''}`} aria-current={view===id?'page':undefined} onClick={run}><span><Icon size={primary?22:20}/></span>{label}</button>;
 const search=normalizeSearch(query);
 const matches=items.filter(item=>normalizeSearch(item.name).includes(search));
 return <>
  <dialog ref={dialog} className="tools-dialog" aria-labelledby="tools-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===dialog.current)close()}}>
   <header>{complete&&quick&&!menuOpen&&<button type="button" className="icon-button" aria-label="Retour aux actions rapides" onClick={()=>{setFull(false);setQuery('')}}><ArrowLeft size={18}/></button>}<h2 id="tools-title">{complete?'Menu complet':'Actions rapides'}</h2><button ref={closeButton} type="button" className="icon-button" aria-label="Fermer le menu" onClick={close}><X size={20}/></button></header>
   {complete&&<label className="tools-search"><Search size={17}/><input ref={searchInput} autoComplete="off" type="search" aria-label="Rechercher un outil ou un dossier" placeholder="Outil, client, projet, devis…" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   <div ref={content} className="tools-content">
    {complete?<>{results.length>0&&<section className="tools-record-results" aria-label="Dossiers trouvés"><h3>Dossiers · {results.length}{results.length===12?' premiers résultats':''}</h3>{results.map(({record,label,context})=><button type="button" key={record.id} onClick={()=>{close();onOpenRecord(record.id)}}><FileText size={18}/><span><b>{label}</b><small>{context}</small></span><ArrowLeft size={15} style={{transform:'rotate(180deg)'}}/></button>)}</section>}{groups.map(group=>{const rows=matches.filter(item=>group.ids.includes(item.id));return rows.length?<section key={group.name} className="tools-group"><h3>{group.name}</h3><div className="tools-grid">{rows.map(item=><button key={item.id} type="button" aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon size={22}/><span>{item.name}</span></button>)}</div></section>:null})}{!matches.length&&!results.length&&<p className="muted" role="status">Aucun outil ou dossier ne correspond à votre recherche.</p>}<footer className="tools-footer"><button type="button" onClick={()=>{close();onLogout()}}>Se déconnecter</button></footer></>:<div className="tools-grid">{more.map(a=><button key={a.id} type="button" onClick={a.run}><a.icon size={22}/><span>{a.label}</span></button>)}<button type="button" onClick={()=>setFull(true)}><Menu size={22}/><span>Menu complet</span></button></div>}
   </div>
  </dialog>
  <nav className="mobile-tabbar" aria-label="Actions principales">
   {tab('dashboard','Accueil',LayoutDashboard,()=>navigate('dashboard'))}
   {tab('projects','Projets',FolderKanban,()=>navigate('projects'))}
   {role==='admin'?tab('visit','Visite',MapPin,()=>launch('visit'),true):role==='worker'?tab('tasks','Tâches',ClipboardList,()=>navigate('tasks'),true):tab('quotes','Devis',FileText,()=>navigate('quotes'),true)}
   {role==='admin'?tab('quote','Devis',FileText,()=>launch('quote')):tab('messages','Messages',MessageSquare,()=>navigate('messages'))}
   <button type="button" className={`tab${open?' active':''}`} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{setFull(false);setQuick(true)}}><span><Plus size={20}/></span>Plus</button>
  </nav>
 </>;
}
