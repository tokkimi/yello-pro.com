import {round,totals,type Data,type RecordItem} from './model';

/** Only explicit HTTPS payment links can be presented to a client. */
export function safePaymentUrl(value:unknown){
 if(typeof value!=='string'||value.length>500||!/^https:\/\//i.test(value)||/[\s\\]/.test(value))return '';
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}
}
/** Public invoice links stop working when the client/project is removed or client access is withdrawn. */
export function publicInvoiceAllowed(invoice:RecordItem,client:RecordItem|null,project:RecordItem|null){
 return invoice.kind==='invoice'&&Boolean(invoice.data.public_token)&&!['Brouillon','Annulée'].includes(String(invoice.data.status))&&!invoice.data.deleted_at&&invoice.data.access?.client!==false&&Boolean(invoice.client_id&&client?.id===invoice.client_id&&client.kind==='client'&&!client.data.deleted_at)&&(!invoice.project_id||Boolean(project?.id===invoice.project_id&&project.kind==='project'&&project.client_id===invoice.client_id&&!project.data.deleted_at&&project.data.access?.client!==false));
}

/*
 * Client billing follow-up adapted from Follow My Future: derived invoice status, public view/pay link,
 * payment reminders (manual at most once a day, automatic once per offset) and the client decision center.
 */
export type InvoiceState='Brouillon'|'Émise'|'Vue'|'Partiellement payée'|'Payée'|'En retard'|'Annulée';
export const outstanding=(data:Data)=>round(Math.max(0,totals(data).total-Number(data.paid||0)));
/** Single source of truth for what an invoice is, from its dates and payments (never from a button). */
export function invoiceState(data:Data,today:string):InvoiceState{
 const s=String(data.status||'Brouillon');
 if(s==='Brouillon'||s==='Annulée')return s;
 const total=totals(data).total,paid=Number(data.paid||0);
 if(total>0&&paid>=total-0.004)return 'Payée';
 if(String(data.due||'')&&String(data.due)<today&&outstanding(data)>0)return 'En retard';
 if(paid>0)return 'Partiellement payée';
 if(data.first_viewed_at)return 'Vue';
 return 'Émise';
}
export const daysOverdue=(data:Data,today:string)=>invoiceState(data,today)==='En retard'?Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(String(data.due).slice(0,10)+'T12:00:00Z'))/86_400_000):0;

export type ReminderLog={at:string;kind:'manuel'|'automatique';offset:number|null;to:string;status:'envoyé'|'échec'};
export const remindersOf=(data:Data):ReminderLog[]=>Array.isArray(data.reminders)?data.reminders.filter((r:any)=>r&&typeof r.at==='string'):[];
/** Manual reminder: at most once every 20 hours per document (protects the client's inbox). */
export function manualReminderAllowed(data:Data,now=new Date()){const last=remindersOf(data).filter(r=>r.status==='envoyé').map(r=>Date.parse(r.at)).sort().at(-1);return !last||now.getTime()-last>=20*3600_000}

export type ReminderSettings={enabled:boolean;offsets:number[]};
export const defaultReminderSettings:ReminderSettings={enabled:false,offsets:[-3,0,7,14]};
export function reminderSettingsFrom(value:unknown):ReminderSettings{const x=(value&&typeof value==='object'?value:{}) as Data;const offsets=Array.isArray(x.offsets)?[...new Set(x.offsets.map(Number).filter((n:number)=>Number.isInteger(n)&&n>=-30&&n<=90))].sort((a,b)=>a-b).slice(0,6):defaultReminderSettings.offsets;return {enabled:x.enabled===true,offsets}}
/**
 * Which automatic reminder offset is due today? The latest reached offset within a 2-day grace window,
 * never one already sent (covers a missed day without spamming old invoices).
 */
export function autoReminderDue(data:Data,settings:ReminderSettings,today:string){
 if(!settings.enabled)return null;
 const state=invoiceState(data,today);
 if(!['Émise','Vue','Partiellement payée','En retard'].includes(state)||outstanding(data)<=0||!data.due)return null;
 const fromDue=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(String(data.due).slice(0,10)+'T12:00:00Z'))/86_400_000);
 const sent=new Set(remindersOf(data).filter(r=>r.kind==='automatique'&&r.status==='envoyé').map(r=>r.offset));
 const due=settings.offsets.filter(o=>fromDue>=o&&fromDue-o<=2&&!sent.has(o)).sort((a,b)=>b-a)[0];
 return due===undefined?null:due;
}

export type Decision={key:string;kind:'Approbation'|'Signature'|'Choix'|'Paiement';title:string;recordId:string;projectId:string|null;clientId:string|null;since:string;days:number;amount?:number;reminders:number;lastReminder:string|null};
const age=(since:string,today:string)=>Math.max(0,Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(since.slice(0,10)+'T12:00:00Z'))/86_400_000));
/** Everything currently waiting on a client, oldest first. */
export function clientDecisions(records:RecordItem[],today:string):Decision[]{
 const out:Decision[]=[];
 const meta=(r:RecordItem)=>{const logs=remindersOf(r.data).filter(x=>x.status==='envoyé');return {reminders:logs.length,lastReminder:logs.map(x=>x.at).sort().at(-1)||null}};
 for(const r of records){
  if(r.kind==='quote'&&r.data.status==='Envoyé'){const since=String(r.data.sent_at||r.updated_at);out.push({key:'quote:'+r.id,kind:'Approbation',title:`${r.data.document_type==='change_order'?'Ordre de changement':'Soumission'} ${r.data.number||r.data.title||''}`.trim(),recordId:r.id,projectId:r.project_id,clientId:r.client_id,since,days:age(since,today),amount:totals(r.data).total,...meta(r)})}
  if(r.kind==='contract'&&r.data.status==='Envoyé'&&!r.data.partner_id){const since=String(r.data.sent_at||r.updated_at);out.push({key:'contract:'+r.id,kind:'Signature',title:`Contrat ${r.data.title||''}`.trim(),recordId:r.id,projectId:r.project_id,clientId:r.client_id,since,days:age(since,today),...meta(r)})}
  if(r.kind==='invoice'&&['Émise','Vue','Partiellement payée','En retard'].includes(invoiceState(r.data,today))){const since=String(r.data.due||r.data.date||r.updated_at);out.push({key:'invoice:'+r.id,kind:'Paiement',title:`Facture ${r.data.number||r.data.title||''}`.trim(),recordId:r.id,projectId:r.project_id,clientId:r.client_id,since,days:age(since,today),amount:outstanding(r.data),...meta(r)})}
  if(r.kind==='project')for(const s of (Array.isArray(r.data.selections)?r.data.selections:[]) as Data[])if(s.published===true&&!s.decision){const since=String(s.published_at||s.date||r.updated_at);out.push({key:`selection:${r.id}:${s.id}`,kind:'Choix',title:`Choix « ${s.title||'matériau'} »`,recordId:r.id,projectId:r.id,clientId:r.client_id,since,days:age(since,today),reminders:0,lastReminder:null})}
 }
 return out.filter(d=>d.kind!=='Paiement'||d.since<=today).sort((a,b)=>b.days-a.days);
}
