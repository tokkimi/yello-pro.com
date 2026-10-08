import type {Data,Kind,Role} from './model';

/** Twelve event families (Billdr shows twelve; the grouping below is Yello Pro's own — H). */
export const notificationFamilies=[
 {id:'projects',label:'Projets et phases'},
 {id:'quotes',label:'Soumissions'},
 {id:'contracts',label:'Contrats et ordres de changement'},
 {id:'invoices',label:'Factures et paiements clients'},
 {id:'expenses',label:'Dépenses'},
 {id:'procurement',label:'Achats et fournisseurs'},
 {id:'schedule',label:'Échéancier et tâches'},
 {id:'timesheets',label:'Feuilles de temps'},
 {id:'field',label:'Journal et rapports de chantier'},
 {id:'selections',label:'Sélections de matériaux'},
 {id:'messages',label:'Messages et documents'},
 {id:'team',label:'Équipe, clients et accès'}
] as const;
export type Family=typeof notificationFamilies[number]['id'];
/** Only in-app is delivered today. E-mail needs RESEND_API_KEY + MAIL_FROM; SMS and push have no provider. */
export const channels=[{id:'inapp',label:'Dans l’application',available:true},{id:'email',label:'Courriel',available:false},{id:'sms',label:'SMS',available:false},{id:'push',label:'Push',available:false}] as const;
export type Channel=typeof channels[number]['id'];
export type Matrix=Record<Role,Record<Family,Record<Channel,boolean>>>;
const roles:Role[]=['admin','worker','client'];

export function defaultMatrix():Matrix{
 const visible:Record<Role,Family[]>={admin:notificationFamilies.map(x=>x.id),worker:['projects','schedule','timesheets','field','messages','procurement'],client:['quotes','contracts','invoices','schedule','field','selections','messages']};
 return Object.fromEntries(roles.map(role=>[role,Object.fromEntries(notificationFamilies.map(f=>[f.id,{inapp:visible[role].includes(f.id),email:false,sms:false,push:false}]))])) as Matrix;
}
export function matrixFrom(value:unknown):Matrix{
 const base=defaultMatrix(),source=value&&typeof value==='object'?value as Data:{};
 for(const role of roles)for(const f of notificationFamilies)for(const c of channels){const v=source?.[role]?.[f.id]?.[c.id];if(typeof v==='boolean')base[role][f.id][c.id]=v}
 return base;
}
/** Mixed state for an "all channels" or "whole family" checkbox. */
export function aggregate(values:boolean[]):'on'|'off'|'mixed'{return values.every(Boolean)?'on':values.some(Boolean)?'mixed':'off'}

/** Business events derived from a saved record. Saving without a status change produces none. */
export function businessEvents(kind:Kind,before:Data|undefined,after:Data):{action:string;family:Family;status?:string}[]{
 const events:{action:string;family:Family;status?:string}[]=[];
 const status=String(after.status||''),previous=String(before?.status||'');
 const changed=status&&status!==previous;
 const push=(action:string,family:Family)=>events.push({action,family,...(changed&&/^(quote|change_order|contract|invoice|phase|task|project)_/.test(action)&&!['project_created'].includes(action)?{status}:{})});
 if(!before){
  if(kind==='project')push('project_created','projects');
  if(kind==='request')push('request_received','projects');
  if(kind==='client')push('client_created','team');
 }
 if(changed){
  if(kind==='quote')push(after.document_type==='change_order'?`change_order_${slug(status)}`:`quote_${slug(status)}`,after.document_type==='change_order'?'contracts':'quotes');
  if(kind==='contract')push(`contract_${slug(status)}`,'contracts');
  if(kind==='invoice')push(`invoice_${slug(status)}`,'invoices');
  if(kind==='phase')push(`phase_${slug(status)}`,'projects');
  if(kind==='task')push(`task_${slug(status)}`,'schedule');
  if(kind==='project')push(`project_${slug(status)}`,'projects');
 }
 if(kind==='project'){
  const published=(list:unknown)=>new Set((Array.isArray(list)?list:[]).filter((x:any)=>x?.published===true).map((x:any)=>String(x.id)));
  const newly=(a:unknown,b:unknown)=>[...published(b)].some(id=>!published(a).has(id));
  if(newly(before?.selections,after.selections))push('selection_published','selections');
  if(newly(before?.construction_reports,after.construction_reports))push('report_published','field');
  const shared=(ops:any)=>new Set((ops?.dailyLogs||[]).filter((x:any)=>x.sharedWithClient===true).map((x:any)=>String(x.id)));
  if([...shared(after.operations)].some(id=>!shared(before?.operations).has(id)))push('journal_shared','field');
  if(after.schedule_published===true&&before?.schedule_published!==true)push('schedule_published','schedule');
  const sentOrders=(ops:any)=>new Set((ops?.purchaseOrders||[]).filter((x:any)=>['Envoyé','Partiellement reçu','Reçu'].includes(x.status)).map((x:any)=>String(x.id)));
  if([...sentOrders(after.operations)].some(id=>!sentOrders(before?.operations).has(id)))push('purchase_order_marked_sent','procurement');
  const bills=(ops:any)=>new Set((ops?.vendorBills||[]).filter((x:any)=>!['Brouillon','Annulée'].includes(x.status)).map((x:any)=>String(x.id)));
  if([...bills(after.operations)].some(id=>!bills(before?.operations).has(id)))push('vendor_bill_recorded','procurement');
  const approved=(ops:any)=>(ops?.timesheets||[]).filter((x:any)=>x.status==='Approuvée').length;
  if(approved(after.operations)>approved(before?.operations))push('timesheet_approved','timesheets');
 }
 return events;
}
const slug=(status:string)=>status.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');

const familyByPrefix:[string,Family][]=[['change_order','contracts'],['contract','contracts'],['quote','quotes'],['invoice','invoices'],['payment','invoices'],['credit','invoices'],['phase','projects'],['project','projects'],['request','projects'],['task','schedule'],['schedule','schedule'],['selection','selections'],['report','field'],['journal','field'],['purchase_order','procurement'],['vendor','procurement'],['timesheet','timesheets'],['client','team'],['accounting','expenses'],['document','messages'],['send','messages'],['sent','messages']];
export function familyOf(action:string,kind?:string):Family{
 const hit=familyByPrefix.find(([prefix])=>action.startsWith(prefix));if(hit)return hit[1];
 const byKind:Record<string,Family>={quote:'quotes',contract:'contracts',invoice:'invoices',expense:'expenses',partner_quote:'procurement',task:'schedule',visit:'projects',project:'projects',phase:'projects',message:'messages',document:'messages',journal:'field',client:'team',request:'projects'};
 return byKind[kind||'']||'projects';
}
const words:Record<string,string>={user_save:'Dossier enregistré',issue:'Facture émise',payment:'Paiement enregistré',credit:'Avoir enregistré',post:'Dépense comptabilisée',pay:'Dépense réglée',send:'Document envoyé par courriel',sent:'Document envoyé par courriel',selection_decision:'Choix de matériau du client',selection_published:'Sélections publiées au client',report_published:'Rapport de chantier publié au client',journal_shared:'Journal partagé avec le client',schedule_published:'Échéancier publié au client',purchase_order_marked_sent:'Bon de commande marqué envoyé (suivi manuel)',vendor_bill_recorded:'Facture fournisseur enregistrée',timesheet_approved:'Heures approuvées',timesheet_submitted:'Heures soumises pour approbation',payment_reminder_sent:'Rappel envoyé au client par courriel',invoice_link:'Lien client de la facture créé',invoice_revoke:'Lien client de la facture révoqué',invoice_payment_url:'Lien de paiement mis à jour',invoice_viewed:'Facture consultée par le client',client_request:'Nouvelle demande du client',automatic_reminder_sent:'Rappel automatique envoyé par courriel',project_created:'Projet créé',request_received:'Nouvelle demande',client_created:'Client ajouté',document_delete:'Document supprimé',accounting_bundle_sent:'Dossier comptable transmis',accounting_report_sent:'Rapport comptable transmis'};
/** Human label. A manual status change says "marqué", never that an e-mail was sent. */
export function notificationLabel(action:string,details?:{status?:unknown}){
 if(words[action])return words[action];
 const match=/^(quote|change_order|contract|invoice|phase|task|project)_(.+)$/.exec(action);
 if(match){const subject={quote:'Soumission',change_order:'Ordre de changement',contract:'Contrat',invoice:'Facture',phase:'Phase',task:'Tâche',project:'Projet'}[match[1]];const state=typeof details?.status==='string'&&details.status?details.status:match[2].replaceAll('_',' ');return `${subject} : statut « ${state} »${/envoy/.test(match[2])?' (marqué manuellement)':''}`}
 return 'Action enregistrée';
}
export function inAppAllowed(matrix:Matrix,role:Role,family:Family){return matrix[role]?.[family]?.inapp!==false}
