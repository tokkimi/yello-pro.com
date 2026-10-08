/*
 * Thirteen default messages (same list as the Billdr settings screen, wording is Yello Pro's own).
 * Variables use [variable] tokens. Rendering only substitutes known tokens from a safe dictionary;
 * an unknown token stays visible and is reported instead of silently becoming an empty string.
 */
export const commonVariables=['client_name','project_address','company_name','name','phone_number','ref_number','signature'] as const;
export type TemplateId='bid_request'|'visit_scheduled'|'visit_rescheduled'|'construction_report'|'change_order'|'change_order_reminder'|'quote'|'quote_reminder'|'invoice'|'invoice_reminder'|'purchase_order'|'selection_invite'|'credit_note';
export type EmailTemplate={id:TemplateId;label:string;subject:string;body:string;button:string;attachPdf:boolean;extra:string[]};
const sign='\n\n[signature]';
export const defaultTemplates:EmailTemplate[]=[
 {id:'bid_request',label:'Demande de prix',subject:'Demande de prix — [project_address]',body:'Bonjour [vendor_name],\n\nNous vous invitons à chiffrer les travaux décrits pour le projet situé au [project_address]. Merci de nous transmettre votre prix avant le [due_date].'+sign,button:'Consulter la demande',attachPdf:true,extra:['vendor_name','due_date']},
 {id:'visit_scheduled',label:'Visite planifiée',subject:'Votre visite avec [company_name]',body:'Bonjour [client_name],\n\nNous confirmons notre visite le [visit_date] à [visit_time] au [project_address].'+sign,button:'Voir le rendez-vous',attachPdf:false,extra:['visit_date','visit_time']},
 {id:'visit_rescheduled',label:'Visite replanifiée',subject:'Nouvelle date de visite — [company_name]',body:'Bonjour [client_name],\n\nNotre visite est déplacée au [visit_date] à [visit_time]. Merci de nous indiquer si ce moment vous convient.'+sign,button:'Voir le rendez-vous',attachPdf:false,extra:['visit_date','visit_time']},
 {id:'construction_report',label:'Rapport de construction',subject:'Avancement de votre projet — [project_address]',body:'Bonjour [client_name],\n\nUn nouveau rapport d’avancement est disponible dans votre espace client.'+sign,button:'Consulter le rapport',attachPdf:false,extra:[]},
 {id:'change_order',label:'Ordre de changement',subject:'Ordre de changement [ref_number]',body:'Bonjour [client_name],\n\nVous trouverez l’ordre de changement [ref_number] d’un montant de [amount] à approuver.'+sign,button:'Consulter et approuver',attachPdf:true,extra:['amount']},
 {id:'change_order_reminder',label:'Rappel d’ordre de changement',subject:'Rappel : ordre de changement [ref_number]',body:'Bonjour [client_name],\n\nL’ordre de changement [ref_number] attend toujours votre approbation.'+sign,button:'Consulter et approuver',attachPdf:true,extra:['amount']},
 {id:'quote',label:'Soumission',subject:'Votre soumission [ref_number] — [company_name]',body:'Bonjour [client_name],\n\nVoici notre soumission [ref_number] pour le projet situé au [project_address], d’un total de [total_amount].'+sign,button:'Consulter la soumission',attachPdf:true,extra:['total_amount']},
 {id:'quote_reminder',label:'Rappel de soumission',subject:'Rappel : soumission [ref_number]',body:'Bonjour [client_name],\n\nNous restons disponibles pour répondre à vos questions sur la soumission [ref_number].'+sign,button:'Consulter la soumission',attachPdf:true,extra:['total_amount']},
 {id:'invoice',label:'Facture',subject:'Facture [ref_number] — [company_name]',body:'Bonjour [client_name],\n\nVoici la facture [ref_number] : [invoice_description]. Montant : [amount].'+sign,button:'Consulter la facture',attachPdf:true,extra:['amount','invoice_description','due_date']},
 {id:'invoice_reminder',label:'Rappel de facture',subject:'Rappel : facture [ref_number]',body:'Bonjour [client_name],\n\nLa facture [ref_number] de [amount] arrive à échéance le [due_date].'+sign,button:'Consulter la facture',attachPdf:true,extra:['amount','invoice_description','due_date']},
 {id:'purchase_order',label:'Bon de commande',subject:'Bon de commande [purchase_order_reference]',body:'Bonjour [vendor_name],\n\nVeuillez trouver le bon de commande [purchase_order_reference] pour le projet situé au [project_address].'+sign,button:'Consulter le bon',attachPdf:true,extra:['vendor_name','purchase_order_reference','total_amount']},
 {id:'selection_invite',label:'Invitation aux sélections',subject:'Vos choix de matériaux — [project_address]',body:'Bonjour [client_name],\n\nDes options de matériaux sont prêtes. Faites vos choix depuis votre espace client.'+sign,button:'Faire mes choix',attachPdf:false,extra:[]},
 {id:'credit_note',label:'Note de crédit',subject:'Note de crédit [ref_number]',body:'Bonjour [client_name],\n\nUne note de crédit [ref_number] de [amount] a été appliquée à votre dossier.'+sign,button:'Consulter le document',attachPdf:true,extra:['amount']}
];
export const variablesFor=(template:Pick<EmailTemplate,'extra'>)=>[...commonVariables,...template.extra];
const tokenPattern=/\[([a-z_]+)\]/g;
export function templatesFrom(value:unknown):EmailTemplate[]{
 const saved=Array.isArray(value)?value:[];
 return defaultTemplates.map(base=>{const x=saved.find((t:any)=>t&&t.id===base.id);if(!x)return {...base};return {...base,subject:String(x.subject??base.subject).slice(0,300),body:String(x.body??base.body).slice(0,10000),button:String(x.button??base.button).slice(0,60),attachPdf:typeof x.attachPdf==='boolean'?x.attachPdf:base.attachPdf}});
}
export function templateErrors(template:EmailTemplate){
 const errors:string[]=[];
 if(!template.subject.trim())errors.push('Le sujet est requis.');
 if(!template.body.trim())errors.push('Le message est requis.');
 const allowed=new Set<string>(variablesFor(template));
 const unknown=[...`${template.subject} ${template.body}`.matchAll(tokenPattern)].map(m=>m[1]).filter(name=>!allowed.has(name));
 if(unknown.length)errors.push(`Variable inconnue : ${[...new Set(unknown)].map(x=>`[${x}]`).join(', ')}.`);
 return errors;
}
/** Plain-text rendering. Missing values keep their token so a human sees what is not filled in. */
export function renderTemplate(text:string,values:Partial<Record<string,string>>,allowed:readonly string[]){
 const missing=new Set<string>(),unknown=new Set<string>();
 const output=text.replace(tokenPattern,(token,name:string)=>{if(!allowed.includes(name)){unknown.add(name);return token}const value=values[name];if(value===undefined||value===''){missing.add(name);return token}return value});
 return {text:output,missing:[...missing],unknown:[...unknown]};
}
export const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const sampleValues:Record<string,string>={client_name:'Client Exemple',project_address:'123, rue Fictive, Laval',company_name:'Yello Pro',name:'Votre nom',phone_number:'514-000-0000',ref_number:'S-0001',signature:'L’équipe Yello Pro',amount:'1 234,56 $',total_amount:'12 345,67 $',invoice_description:'Acompte de démarrage',vendor_name:'Fournisseur Exemple',purchase_order_reference:'BC-0001',due_date:'2026-11-01',visit_date:'2026-10-20',visit_time:'9 h 00'};
