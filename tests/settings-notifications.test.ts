import test from 'node:test';
import assert from 'node:assert/strict';
import {businessEvents,defaultMatrix,familyOf,inAppAllowed,matrixFrom,notificationFamilies,notificationLabel,channels} from '../lib/notifications';
import {defaultTemplates,renderTemplate,templateErrors,templatesFrom,variablesFor} from '../lib/email-templates';
import {documentMail} from '../lib/document-mail';
import {aiInstructions,employeePortalFrom,journalAnswerErrors,projectSettingsFrom} from '../lib/settings-model';
import {serviceStatus} from '../lib/services';
import {recalculateSchedule,scheduleFrom} from '../lib/schedule';

test('thirteen default messages, each valid with its own variables',()=>{
 assert.equal(defaultTemplates.length,13);
 assert.deepEqual(defaultTemplates.flatMap(templateErrors),[]);
 for(const t of defaultTemplates)for(const name of ['client_name','project_address','company_name','name','phone_number','ref_number','signature'])assert.ok(variablesFor(t).includes(name));
});

test('unknown tokens are reported and kept visible, never silently emptied',()=>{
 const [quote]=templatesFrom([{id:'quote',subject:'Soumission [ref_number] [secret]',body:'Bonjour [client_name]'}]).filter(t=>t.id==='quote');
 assert.match(templateErrors(quote).join(),/\[secret\]/);
 const rendered=renderTemplate('Bonjour [client_name] [amount] [unknown]',{client_name:'<b>Alex</b>'},['client_name','amount']);
 assert.equal(rendered.text,'Bonjour <b>Alex</b> [amount] [unknown]');
 assert.deepEqual(rendered.missing,['amount']);assert.deepEqual(rendered.unknown,['unknown']);
 assert.match(templateErrors({...quote,subject:''}).join(),/sujet est requis/);
});

test('document e-mail uses the saved message with real totals',()=>{
 const mail=documentMail({kind:'quote',data:{number:'S-12',lines:[{quantity:1,price:450}],tps:5,tvq:9.975}},{name:'Client Fictif'},{name:'Rénovations MG Pro',phone:'514',email:'a@b.c',email_templates:[{id:'quote',subject:'Devis [ref_number] pour [client_name]',body:'Total [total_amount]'}]});
 assert.equal(mail.subject,'Devis S-12 pour Client Fictif');
 assert.match(mail.text,/517,39/);
});

test('notification matrix: twelve families, only in-app is deliverable, roles have distinct defaults',()=>{
 assert.equal(notificationFamilies.length,12);
 assert.deepEqual(channels.filter(c=>c.available).map(c=>c.id),['inapp']);
 const matrix=defaultMatrix();
 assert.equal(inAppAllowed(matrix,'client','procurement'),false,'clients do not receive supplier events');
 assert.equal(inAppAllowed(matrix,'admin','procurement'),true);
 const custom=matrixFrom({admin:{quotes:{inapp:false}},client:{quotes:{inapp:'yes'}}});
 assert.equal(custom.admin.quotes.inapp,false);assert.equal(custom.client.quotes.inapp,true,'invalid values fall back to the default');
});

test('business events: status changes, explicit publications and no fake e-mail wording',()=>{
 assert.deepEqual(businessEvents('quote',{status:'Brouillon'},{status:'Brouillon'}),[]);
 const sent=businessEvents('quote',{status:'Validé'},{status:'Envoyé'});
 assert.equal(sent[0].family,'quotes');
 assert.match(notificationLabel(sent[0].action,{status:sent[0].status}),/Envoyé.*marqué manuellement/);
 assert.doesNotMatch(notificationLabel(sent[0].action,{status:'Envoyé'}),/par courriel/);
 const before={selections:[{id:'a',published:false}],construction_reports:[],operations:{dailyLogs:[{id:'l',sharedWithClient:false}]}};
 const after={selections:[{id:'a',published:true}],construction_reports:[{id:'r',published:true}],operations:{dailyLogs:[{id:'l',sharedWithClient:true}]},schedule_published:true};
 assert.deepEqual(businessEvents('project',before,after).map(e=>e.action).sort(),['journal_shared','report_published','schedule_published','selection_published']);
 assert.equal(familyOf('vendor_bill_recorded'),'procurement');
});

test('project settings: payment schedule, working week and holidays drive schedules',()=>{
 const settings=projectSettingsFrom({work_week:[1,2,3,4],holidays:['2026-10-13']});
 assert.equal(settings.payment_schedule.reduce((s,x)=>s+x.percent,0),100);
 const rows=recalculateSchedule(scheduleFrom([{id:'a',title:'A',start:'2026-10-12',days:2},{id:'b',title:'B',days:1,predecessor:'a'}]),settings.work_week,settings.holidays);
 // Monday 12 works, Tuesday 13 is a holiday, Wednesday 14 ends A; Thursday 15 starts B.
 assert.equal(rows[1].start,'2026-10-15');
 const fourDays=recalculateSchedule(scheduleFrom([{id:'a',title:'A',start:'2026-10-15',days:1},{id:'b',title:'B',days:1,predecessor:'a'}]),[1,2,3,4],[]);
 assert.equal(fourDays[1].start,'2026-10-19','Friday is skipped when the week has four days');
});

test('employee journal questions and AI preferences are sanitised',()=>{
 const portal=employeePortalFrom(undefined);
 assert.equal(portal.questions.length,5);
 assert.deepEqual(journalAnswerErrors(portal.questions,{done:''}),['Répondez à « Travaux complétés ».']);
 assert.match(aiInstructions({tone:'concise',instructions:'Toujours en français.'}),/concis.*Toujours en français/);
 assert.match(aiInstructions({}),/N’invente aucun prix/);
});

test('service status reveals only booleans and names what is missing',()=>{
 const status=serviceStatus({NEXT_PUBLIC_SUPABASE_URL:'x',SUPABASE_SERVICE_ROLE_KEY:'secret-value'});
 assert.equal(status.find(s=>s.id==='database')!.ready,true);
 const email=status.find(s=>s.id==='email')!;
 assert.equal(email.ready,false);assert.deepEqual(email.missing,['RESEND_API_KEY','MAIL_FROM']);
 assert.equal(JSON.stringify(status).includes('secret-value'),false);
 assert.equal(status.find(s=>s.id==='sms')!.ready,false);
});

import {brandedEmail} from '../lib/email-branding';
import {makePdf} from '../lib/pdf';
import {PDFDocument} from 'pdf-lib';
test('saved branding renders safe email and valid classic/compact PDFs',async()=>{
 const settings={name:'MG Pro',branding:{accent:'#7c3aed',signature:'Signature MG',emailLogo:'signature',showClientEmail:false,showLicence:false,header:'compact'}};
 const html=brandedEmail('<script>alert(1)</script>',settings);
 assert.ok(html.includes('#7c3aed'));assert.ok(html.includes('Signature MG'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 const bytes=await makePdf('Soumission',{lines:[{description:'Travaux',quantity:1,price:100}]},{name:'Client',email:'private@example.com'},settings);
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>0);
});
