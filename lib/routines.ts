import {money,round,totals,type Data,type RecordItem} from './model';
import {operationsFrom} from './project-operations';
import {ledgerCost,supplierLedger} from './vendor-finance';

/*
 * Routines = saved reports computed from Yello Pro's own data (no AI needed, no invented figures).
 * They run when someone clicks "Exécuter" or opens a due routine; there is no background scheduler yet.
 */
export const routineKinds=[
 {id:'receivables_payables',label:'Comptes clients et comptes fournisseurs'},
 {id:'overdue_invoices',label:'Factures clients en retard'},
 {id:'active_projects',label:'Projets actifs et avancement'},
 {id:'pending_expenses',label:'Dépenses et factures fournisseur à payer'},
 {id:'pipeline',label:'Pipeline commercial (demandes et soumissions)'}
] as const;
export type RoutineKind=typeof routineKinds[number]['id'];
export type Routine={id:string;title:string;kind:RoutineKind;weekday:number;hour:number;active:boolean;favorite:boolean;tags:string[];lastRun:string;runs:{id:string;at:string;lines:string[]}[]};

export function routinesFrom(value:unknown):Routine[]{
 return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&routineKinds.some(k=>k.id===x.kind)).map((x:any)=>({id:String(x.id),title:String(x.title||'Routine').slice(0,120),kind:x.kind,weekday:Math.min(7,Math.max(1,Number(x.weekday)||1)),hour:Math.min(23,Math.max(0,Number(x.hour)||8)),active:x.active!==false,favorite:x.favorite===true,tags:Array.isArray(x.tags)?x.tags.map(String).slice(0,8):[],lastRun:String(x.lastRun||''),runs:Array.isArray(x.runs)?x.runs.slice(0,20).map((r:any)=>({id:String(r.id),at:String(r.at),lines:Array.isArray(r.lines)?r.lines.map(String):[]})):[]})):[];
}
/** Next weekly occurrence after `from` (local time). */
export function nextRun(routine:Pick<Routine,'weekday'|'hour'>,from:Date){
 const d=new Date(from);d.setMinutes(0,0,0);d.setHours(routine.hour);
 const iso=d.getDay()||7;let add=(routine.weekday-iso+7)%7;if(add===0&&d<=from)add=7;d.setDate(d.getDate()+add);return d;
}
export const isDue=(routine:Routine,now:Date)=>routine.active&&(!routine.lastRun||nextRun(routine,new Date(routine.lastRun))<=now);

export function runRoutine(kind:RoutineKind,records:RecordItem[],today:string):string[]{
 const by=(k:string)=>records.filter(r=>r.kind===k);
 const issued=by('invoice').filter(r=>!['Brouillon','Annulée'].includes(String(r.data.status)));
 const due=(r:RecordItem)=>round(totals(r.data).total-Number(r.data.paid||0));
 const projects=by('project');
 const ledger=supplierLedger(projects,by('expense'),operationsFrom);
 switch(kind){
  case 'receivables_payables':{const ar=issued.reduce((s,r)=>s+Math.max(0,due(r)),0);const ap=ledgerCost(ledger).payable;return [`Comptes clients : ${money(ar)} sur ${issued.filter(r=>due(r)>0).length} facture(s).`,`Comptes fournisseurs (factures reconnues et dépenses à payer) : ${money(ap)}.`,`Position nette : ${money(ar-ap)}.`,`Projets signés ou en construction : ${projects.filter(p=>/sign|construction|en cours/i.test(String(p.data.status))).length}.`]}
  case 'overdue_invoices':{const late=issued.filter(r=>due(r)>0&&String(r.data.due||'')&&String(r.data.due)<today);return late.length?late.map(r=>`${r.data.number||r.data.title||'Facture'} — échue le ${r.data.due} — solde ${money(due(r))}`):['Aucune facture client en retard.']}
  case 'active_projects':{const active=projects.filter(p=>!p.data.archived&&!/termin|complét|archiv/i.test(String(p.data.status)));return active.length?active.map(p=>{const tasks=records.filter(r=>r.kind==='task'&&r.project_id===p.id);const done=tasks.filter(t=>t.data.status==='Validée').length;return `${p.data.title||'Projet'} — ${p.data.status||''} — ${done}/${tasks.length} tâche(s) validée(s)`}):['Aucun projet actif.']}
  case 'pending_expenses':{const open=ledger.filter(r=>(r.family==='Dépense'||r.family==='Facture fournisseur')&&r.balance>0);return open.length?open.map(r=>`${r.family} ${r.reference||''} — ${r.supplier||'Fournisseur'} — ${money(r.balance)}${r.dueOn?` (échéance ${r.dueOn})`:''}`):['Rien à payer.']}
  case 'pipeline':{const reqs=by('request');const quotes=by('quote').filter(q=>q.data.document_type!=='change_order');const sum=(rows:RecordItem[])=>money(rows.reduce((s,r)=>s+totals(r.data).total,0));return [`Demandes ouvertes : ${reqs.filter(r=>!['Gagnée','Perdue'].includes(String(r.data.status))).length}.`,`Soumissions en préparation : ${quotes.filter(q=>['Brouillon','Validé'].includes(String(q.data.status))).length} (${sum(quotes.filter(q=>['Brouillon','Validé'].includes(String(q.data.status))))}).`,`Soumissions envoyées : ${quotes.filter(q=>q.data.status==='Envoyé').length} (${sum(quotes.filter(q=>q.data.status==='Envoyé'))}).`,`Soumissions acceptées : ${quotes.filter(q=>q.data.status==='Accepté').length} (${sum(quotes.filter(q=>q.data.status==='Accepté'))}).`]}
 }
}
/** Compact, non-confidential company summary given to the assistant as context (no personal notes). */
export function assistantContext(records:RecordItem[],today:string,settings:Data){
 return [`Date : ${today}. Entreprise : ${settings.name||'Yello Pro'}.`,...routineKinds.flatMap(k=>[`## ${k.label}`,...runRoutine(k.id,records,today).slice(0,25)])].join('\n');
}
