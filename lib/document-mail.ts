import {money,totals,type Data} from './model';
import {renderTemplate,templatesFrom,variablesFor,type TemplateId} from './email-templates';

/** Subject and text of a document e-mail, built from the saved default message for that document type. */
export function documentMail(record:{kind:string;data:Data},recipient:Data,settings:Data){
 const id:TemplateId|null=record.kind==='quote'?(record.data.document_type==='change_order'?'change_order':'quote'):record.kind==='invoice'?'invoice':null;
 const contact=`Pour toute question : ${settings.phone||''} · ${settings.email||''}`;
 if(!id){const label=record.kind==='contract'?'Votre contrat':record.kind==='specification'?'Votre cahier des charges':'Votre document';return {subject:`${settings.name||'Yello Pro'} — ${label} ${record.data.number||''}`.trim(),text:`Bonjour ${recipient.name||''},\n\nVeuillez trouver votre document en pièce jointe.\n\n${contact}\n\n${settings.name||'Yello Pro'}`}}
 const template=templatesFrom(settings.email_templates).find(x=>x.id===id)!;
 const total=totals(record.data).total;
 const values:Record<string,string>={client_name:String(recipient.name||''),project_address:String(record.data.address||recipient.address||''),company_name:String(settings.name||'Yello Pro'),name:String(settings.name||''),phone_number:String(settings.phone||''),ref_number:String(record.data.number||''),signature:`${settings.name||'Yello Pro'}\n${contact}`,amount:money(total),total_amount:money(total),invoice_description:String(record.data.title||''),due_date:String(record.data.due||'')};
 const allowed=variablesFor(template);
 return {subject:renderTemplate(template.subject,values,allowed).text,text:renderTemplate(template.body,values,allowed).text};
}
