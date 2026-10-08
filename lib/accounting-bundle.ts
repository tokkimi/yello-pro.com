import JSZip from 'jszip';
import {accountingReport,journalCsv} from './accounting';
import {expenseTotal} from './financial-overview';
import {makePdf} from './pdf';
import {Data,RecordItem,defaults,money} from './model';

export type BundleFilter={from:string;to:string;scope:'company'|'client'|'partner';client_id?:string;project_id?:string;partner_id?:string};
const dateOf=(record:RecordItem)=>String(record.data.date||record.created_at||'').slice(0,10);
export function selectBundleRecords(records:RecordItem[],filter:BundleFilter,partner?:{id:string;name:string}){
 const byPeriod=(record:RecordItem)=>dateOf(record)>=filter.from&&dateOf(record)<=filter.to;
 const partnerQuotes=new Set(records.filter(record=>record.kind==='partner_quote'&&record.data.partner_id===partner?.id).map(record=>record.id));
 const belongs=(record:RecordItem)=>filter.scope==='company'||filter.scope==='client'?filter.scope==='company'||record.client_id===filter.client_id&&(!filter.project_id||record.project_id===filter.project_id):record.kind==='expense'&&(record.data.supplier_id===partner?.id||partnerQuotes.has(record.data.partner_quote_id)||String(record.data.supplier||'').trim().toLowerCase()===String(partner?.name||'').trim().toLowerCase());
 const invoices=records.filter(record=>record.kind==='invoice'&&byPeriod(record)&&belongs(record)&&!['Brouillon','Annulée'].includes(record.data.status));
 const expenses=records.filter(record=>record.kind==='expense'&&byPeriod(record)&&belongs(record)&&record.data.posted);
 const financialIds=new Set([...invoices,...expenses].map(record=>record.id));
 const partnerExpenseIds=new Set(records.filter(record=>record.kind==='expense'&&dateOf(record)<=filter.to&&belongs(record)).map(record=>record.id));
 const journals=records.filter(record=>record.kind==='journal'&&dateOf(record)<=filter.to&&(filter.scope==='partner'?partnerExpenseIds.has(record.data.source_id):belongs(record)));
 const documents=records.filter(record=>record.kind==='document'&&financialIds.has(record.data.parent_id));
 return {invoices,expenses,journals,documents};
}
const safe=(name:string)=>name.normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').slice(0,100)||'document';
export async function accountingBundle(records:RecordItem[],filter:BundleFilter,settings:Data=defaults,partner?:{id:string;name:string},loadDocument?:(record:RecordItem)=>Promise<Uint8Array>){
 const selected=selectBundleRecords(records,filter,partner);
 if(selected.documents.length>150)throw new Error('Trop de justificatifs pour un seul export. Choisissez une période plus courte.');
 const zip=new JSZip();
 const report=accountingReport(selected.journals,filter.from,filter.to);
 const title=filter.scope==='partner'?`Prestataire ${partner?.name||''}`:filter.scope==='client'?`Client ${records.find(record=>record.id===filter.client_id)?.data.name||''}`:'Entreprise Yello Pro';
 const lines=[title,`Période : ${filter.from} au ${filter.to}`,`Factures : ${selected.invoices.length}`,`Dépenses : ${selected.expenses.length}`,`Justificatifs : ${selected.documents.length}`,...report.reportLines];
 zip.file('01-rapport/rapport-comptable.pdf',await makePdf('Rapport comptable',{reportLines:lines},{},settings));
 zip.file('01-rapport/journal.csv',journalCsv(report.journals));
 zip.file('01-rapport/index.txt',`Yello Pro — ${title}\nPériode : ${filter.from} au ${filter.to}\nFactures : ${selected.invoices.length}\nDépenses : ${selected.expenses.length}\nÉcritures : ${report.journals.length}\nJustificatifs originaux : ${selected.documents.length}\n`);
 for(const invoice of selected.invoices){const client=records.find(record=>record.id===invoice.client_id)?.data||{};const name=safe(String(invoice.data.number||invoice.id));zip.file(`02-factures/${name}-${invoice.id.slice(0,8)}.pdf`,await makePdf('Facture',invoice.data,client,settings));}
 for(const expense of selected.expenses){const data=expense.data;const lines=[`Dépense : ${data.title||expense.id}`,`Date : ${dateOf(expense)}`,`Fournisseur : ${data.supplier||'Non renseigné'}`,`Catégorie : ${data.category||'Autre'}`,`Montant hors taxes : ${money(Number(data.net||0))}`,`TPS : ${money(Number(data.tps||0))}`,`TVQ : ${money(Number(data.tvq||0))}`,`Total : ${money(expenseTotal(data))}`,`Statut : ${data.status||'À payer'}`,`Référence : ${data.reference||''}`];zip.file(`03-depenses/${safe(String(data.title||expense.id))}-${expense.id.slice(0,8)}.pdf`,await makePdf('Justificatif de dépense',{reportLines:lines},{},settings));}
 let totalBytes=0;
 for(const document of selected.documents){if(!loadDocument)throw new Error('Le stockage des justificatifs est inaccessible.');const bytes=await loadDocument(document);totalBytes+=bytes.byteLength;if(totalBytes>18*1024*1024)throw new Error('Le dossier dépasse 18 Mo. Choisissez une période plus courte.');zip.file(`04-justificatifs/${document.data.parent_id}/${safe(String(document.data.name||document.id))}-${document.id.slice(0,8)}`,bytes);}
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
}
