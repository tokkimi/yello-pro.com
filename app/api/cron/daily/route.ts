import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {workspaceDb} from '@/lib/supabase';
import {defaults,money,type RecordItem} from '@/lib/model';
import {autoReminderDue,outstanding,reminderSettingsFrom,remindersOf} from '@/lib/billing';
import {renderTemplate,templatesFrom,variablesFor} from '@/lib/email-templates';
import {sendMail,siteUrl} from '@/lib/mailer';
import {isDue,routinesFrom,runRoutine} from '@/lib/routines';
import {activeRecords} from '@/lib/client-trash';

export const maxDuration=120;
const same=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));

/**
 * Daily job (Vercel Cron, Authorization: Bearer $CRON_SECRET). Idempotent: automatic payment reminders are
 * recorded per (invoice, offset) and routines only run when due, so a second run the same day does nothing.
 */
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||!same(req.headers.get('authorization')||'',`Bearer ${secret}`))return NextResponse.json({error:'Non autorisé.'},{status:401});
 const workspaceId=new URL(req.url).searchParams.get('workspace');
 if(!workspaceId||!/^[0-9a-f-]{36}$/i.test(workspaceId))return NextResponse.json({error:'Espace entreprise requis.'},{status:400});
 const tenantDb=workspaceDb(workspaceId);
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
 const settingsRow=(await tenantDb.from('records').select('*').eq('kind','settings').limit(1).maybeSingle()).data as RecordItem|null;
 const settings:Record<string,any>={...defaults,...(settingsRow?.data||{})};
 const report={reminders:0,reminderFailures:0,emailNotConfigured:false,routines:0};
 const rules=reminderSettingsFrom(settings.invoice_reminders);
 if(rules.enabled){
  const invoices=(await tenantDb.from('records').select('*').eq('kind','invoice').in('data->>status',['Émise','Partiellement payée'])).data as RecordItem[]||[];
  const template=templatesFrom(settings.email_templates).find(t=>t.id==='invoice_reminder')!;
  for(const inv of invoices){
   const offset=autoReminderDue(inv.data,rules,today);if(offset===null)continue;
   const client=inv.client_id?(await tenantDb.from('records').select('data').eq('id',inv.client_id).maybeSingle()).data?.data||{}:{};
   const to=String(client.billing_email||client.email||'').trim();if(!to)continue;
   const values={client_name:String(client.name||''),company_name:String(settings.name),name:String(settings.name),phone_number:String(settings.phone),ref_number:String(inv.data.number||''),signature:String(settings.name),amount:money(outstanding(inv.data)),due_date:String(inv.data.due||''),invoice_description:String(inv.data.title||''),project_address:String(inv.data.address||client.address||'')};
   const link=inv.data.public_token?`${siteUrl(req)}/f/${inv.data.public_token}`:`${siteUrl(req)}/connexion`;
   const result=await sendMail({to,settings,subject:renderTemplate(template.subject,values,variablesFor(template)).text,text:`${renderTemplate(template.body,values,variablesFor(template)).text}\n\n${template.button} : ${link}${inv.data.payment_url?`\nPayer en ligne : ${inv.data.payment_url}`:''}`,idempotencyKey:`auto-reminder-${inv.id}-${offset}`});
   if(result.status==='non configuré'){report.emailNotConfigured=true;break}
   const log={at:new Date().toISOString(),kind:'automatique',offset,to,status:result.status==='envoyé'?'envoyé':'échec'};
   await tenantDb.from('records').update({data:{...inv.data,reminders:[...remindersOf(inv.data),log].slice(-30)},version:inv.version+1}).eq('id',inv.id).eq('version',inv.version);
   if(result.status==='envoyé'){report.reminders++;await tenantDb.from('audit_log').insert({action:'automatic_reminder_sent',record_id:inv.id,details:{family:'invoices',offset}})}else report.reminderFailures++;
  }
 }
 const routines=routinesFrom(settings.routines);
 if(settingsRow&&routines.some(r=>isDue(r,new Date()))){
  const records=activeRecords(((await tenantDb.from('records').select('*').in('kind',['project','invoice','expense','quote','request','task'])).data||[]) as RecordItem[]);
  const at=new Date().toISOString();
  const next=routines.map(r=>{if(!isDue(r,new Date()))return r;report.routines++;return {...r,lastRun:at,runs:[{id:crypto.randomUUID(),at,lines:runRoutine(r.kind,records,today)},...r.runs].slice(0,20)}});
  await tenantDb.from('records').update({data:{...settingsRow.data,routines:next},version:settingsRow.version+1}).eq('id',settingsRow.id).eq('version',settingsRow.version);
 }
 return NextResponse.json({ok:true,report});
}
