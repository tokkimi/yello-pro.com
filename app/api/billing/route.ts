import {NextResponse} from 'next/server';
import {z} from 'zod';
import {identity,db} from '@/lib/supabase';
import {sameOrigin} from '@/lib/access';
import {defaults,money,type Data,type RecordItem} from '@/lib/model';
import {invoiceState,manualReminderAllowed,outstanding,remindersOf,safePaymentUrl,type ReminderLog} from '@/lib/billing';
import {renderTemplate,templatesFrom,variablesFor} from '@/lib/email-templates';
import {sendMail,siteUrl} from '@/lib/mailer';

const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('link'),id:z.string().uuid()}),
 z.object({action:z.literal('revoke'),id:z.string().uuid()}),
 z.object({action:z.literal('payment_url'),id:z.string().uuid(),url:z.union([z.literal(''),z.url().max(500).refine(u=>Boolean(safePaymentUrl(u)),'Le lien de paiement doit commencer par https://')])}),
 z.object({action:z.literal('remind'),id:z.string().uuid()})
]);

/** Follow-up fields of issued documents (link, payment link, reminders). The document itself stays frozen. */
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();
 if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 if(user.role!=='admin')return NextResponse.json({error:'Accès refusé.'},{status:403});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Demande invalide.'},{status:400});
 const input=parsed.data;
 const record=(await (await db()).from('records').select('*').eq('id',input.id).maybeSingle()).data as RecordItem|null;
 if(!record||!['invoice','quote','contract'].includes(record.kind))return NextResponse.json({error:'Document introuvable.'},{status:404});
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
 let patch:Data={};let mailStatus:string|undefined;
 if(input.action==='link'||input.action==='revoke'||input.action==='payment_url'){
  if(record.kind!=='invoice')return NextResponse.json({error:'Réservé aux factures.'},{status:400});
  if(record.data.status==='Brouillon')return NextResponse.json({error:'Émettez la facture avant de créer son lien client.'},{status:400});
  patch=input.action==='link'?{public_token:record.data.public_token||crypto.randomUUID()}:input.action==='revoke'?{public_token:null}:{payment_url:input.url||null};
 }else{
  const waiting=record.kind==='invoice'?['Émise','Vue','Partiellement payée','En retard'].includes(invoiceState(record.data,today))&&outstanding(record.data)>0:record.data.status==='Envoyé';
  if(!waiting)return NextResponse.json({error:'Ce document n’attend rien du client.'},{status:400});
  if(!manualReminderAllowed(record.data))return NextResponse.json({error:'Un rappel a déjà été envoyé dans les dernières 20 heures.'},{status:429});
  const client=record.client_id?(await (await db()).from('records').select('data').eq('id',record.client_id).maybeSingle()).data?.data||{}:{};
  const to=String(client.billing_email||client.email||'').trim();
  if(!to)return NextResponse.json({error:'Le client n’a pas d’adresse courriel.'},{status:400});
  const settings=(await (await db()).from('records').select('data').eq('kind','settings').limit(1).maybeSingle()).data?.data||defaults;
  const id=record.kind==='invoice'?'invoice_reminder':record.data.document_type==='change_order'?'change_order_reminder':'quote_reminder';
  const template=templatesFrom(settings.email_templates).find(t=>t.id===id)!;
  const link=record.kind==='invoice'&&record.data.public_token?`${siteUrl(req)}/f/${record.data.public_token}`:`${siteUrl(req)}/connexion`;
  const values={client_name:String(client.name||''),project_address:String(record.data.address||client.address||''),company_name:String(settings.name||'Yello Pro'),name:String(settings.name||''),phone_number:String(settings.phone||''),ref_number:String(record.data.number||record.data.title||''),signature:String(settings.name||'Yello Pro'),amount:money(outstanding(record.data)),total_amount:money(outstanding(record.data)),due_date:String(record.data.due||''),invoice_description:String(record.data.title||'')};
  const vars=variablesFor(template);
  const text=`${renderTemplate(template.body,values,vars).text}\n\n${template.button} : ${link}${record.data.payment_url?`\nPayer en ligne : ${record.data.payment_url}`:''}`;
  const result=await sendMail({to,settings,subject:renderTemplate(template.subject,values,vars).text,text,idempotencyKey:`reminder-${record.id}-${today}`});
  if(result.status==='non configuré')return NextResponse.json({error:'Service de courriel non configuré (RESEND_API_KEY et MAIL_FROM) : aucun rappel n’a été envoyé.',configured:false},{status:503});
  const log:ReminderLog={at:new Date().toISOString(),kind:'manuel',offset:null,to,status:result.status==='envoyé'?'envoyé':'échec'};
  patch={reminders:[...remindersOf(record.data),log].slice(-30)};mailStatus=result.status;
  if(result.status==='échec'){await save(record,patch);return NextResponse.json({error:`Le service de courriel a refusé le rappel (${result.error}).`},{status:502})}
 }
 const saved=await save(record,patch);
 if(!saved)return NextResponse.json({error:'Le document a changé. Rechargez puis réessayez.'},{status:409});
 await (await db()).from('audit_log').insert({actor_id:user.id,action:input.action==='remind'?'payment_reminder_sent':`invoice_${input.action}`,record_id:record.id,details:{family:record.kind==='invoice'?'invoices':'quotes'}});
 return NextResponse.json({record:saved,mailStatus});
}
async function save(record:RecordItem,patch:Data){
 const {data}=await (await db()).from('records').update({data:{...record.data,...patch},version:record.version+1,updated_at:new Date().toISOString()}).eq('id',record.id).eq('version',record.version).select().maybeSingle();
 return data as RecordItem|null;
}
