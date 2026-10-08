import test from 'node:test';
import assert from 'node:assert/strict';
import type {RecordItem,Profile} from '../lib/model';
import {projectHealth} from '../lib/project-health';
import {autoReminderDue,clientDecisions,invoiceState,manualReminderAllowed,reminderSettingsFrom,publicInvoiceAllowed,safePaymentUrl} from '../lib/billing';
import {weeklyReportDraft} from '../lib/weekly-report';
import {redact} from '../lib/redact';

const rec=(id:string,kind:any,data:any,project_id:string|null=null,client_id:string|null='c1',updated='2026-10-07T12:00:00Z'):RecordItem=>({id,kind,data,client_id,project_id,version:1,created_at:'2026-09-01T00:00:00Z',updated_at:updated});
const inv=(data:any)=>({lines:[{quantity:1,price:1000}],tps:5,tvq:9.975,status:'Émise',date:'2026-09-01',due:'2026-10-01',paid:0,...data});

test('public invoice access stops for deleted clients, withdrawn project access and drafts',()=>{
 const client=rec('c1','client',{}),project=rec('p','project',{}),invoice=rec('i','invoice',inv({public_token:'token'}),'p');
 assert.equal(publicInvoiceAllowed(invoice,client,project),true);
 for(const data of [{deleted_at:'2026-10-08'},{access:{client:false}},{status:'Brouillon'}])assert.equal(publicInvoiceAllowed({...invoice,data:{...invoice.data,...data}},client,project),false);
 assert.equal(publicInvoiceAllowed(invoice,{...client,data:{deleted_at:'2026-10-08'}},project),false);
 assert.equal(publicInvoiceAllowed(invoice,client,{...project,data:{access:{client:false}}}),false);
 assert.equal(publicInvoiceAllowed(invoice,rec('other','client',{}),project),false);
 assert.equal(publicInvoiceAllowed(invoice,client,{...project,client_id:'other'}),false);
});

test('payment links accept HTTPS only, without embedded credentials',()=>{
 assert.equal(safePaymentUrl('https://pay.example.test/invoice'),'https://pay.example.test/invoice');
 for(const value of ['javascript:alert(1)','https:garbage','http://pay.example.test','https://user:pass@pay.example.test',null])assert.equal(safePaymentUrl(value),'');
 const invoice=rec('i','invoice',inv({payment_url:'https://pay.example.test/invoice',public_token:'token'}),'p');
 assert.equal(redact({id:'c',role:'client',name:'C',email:'c@test',client_id:'c1'},invoice).data.payment_url,'https://pay.example.test/invoice');
 assert.equal(redact({id:'w',role:'worker',name:'W',email:'w@test',client_id:null},invoice).data.payment_url,undefined);
});

test('health profit excludes taxes and supplier contracts from customer revenue',()=>{
 const project=rec('p','project',{status:'Terminé'});
 const quote=rec('q','quote',{status:'Accepté',lines:[{quantity:1,price:1000}]},'p');
 const contract=rec('k','contract',{status:'Signé',quote_id:'q',amount:1149.75},'p');
 const supplier=rec('s','contract',{status:'Signé',partner_id:'worker',amount:5000},'p');
 const waitingSupplier=rec('w','contract',{status:'Envoyé',partner_id:'worker'},'p');
 const expense=rec('e','expense',{net:600},'p');
 const health=projectHealth(project,[project,quote,contract,supplier,waitingSupplier,expense],'2026-10-08');
 assert.equal(health.contract,1149.75);assert.equal(health.margin,400);assert.equal(health.marginPct,40);assert.deepEqual(health.clientWaits,[]);
});

test('invoice state is derived from dates and payments, never from a button',()=>{
 assert.equal(invoiceState(inv({}),'2026-09-15'),'Émise');
 assert.equal(invoiceState(inv({first_viewed_at:'2026-09-02'}),'2026-09-15'),'Vue');
 assert.equal(invoiceState(inv({paid:200}),'2026-09-15'),'Partiellement payée');
 assert.equal(invoiceState(inv({}),'2026-10-08'),'En retard');
 assert.equal(invoiceState(inv({paid:1149.75}),'2026-10-08'),'Payée');
 assert.equal(invoiceState(inv({status:'Brouillon'}),'2026-10-08'),'Brouillon');
});

test('automatic reminders: once per offset, 2-day grace, nothing when disabled or paid',()=>{
 const rules=reminderSettingsFrom({enabled:true,offsets:[-3,0,7]});
 assert.equal(autoReminderDue(inv({}),rules,'2026-09-28'),-3);
 assert.equal(autoReminderDue(inv({}),rules,'2026-10-01'),0);
 assert.equal(autoReminderDue(inv({reminders:[{at:'2026-10-01',kind:'automatique',offset:0,to:'x',status:'envoyé'}]}),rules,'2026-10-02'),null,'already sent for this offset');
 assert.equal(autoReminderDue(inv({}),rules,'2026-10-20'),null,'old offsets are not replayed');
 assert.equal(autoReminderDue(inv({}),reminderSettingsFrom({enabled:false}),'2026-10-01'),null);
 assert.equal(autoReminderDue(inv({paid:1149.75}),rules,'2026-10-01'),null);
 assert.equal(manualReminderAllowed({reminders:[{at:new Date(Date.now()-3600_000).toISOString(),kind:'manuel',offset:null,to:'x',status:'envoyé'}]}),false);
 assert.equal(manualReminderAllowed({reminders:[{at:new Date(Date.now()-3600_000).toISOString(),kind:'manuel',offset:null,to:'x',status:'échec'}]}),true,'a failed send does not block a retry');
});

test('client decisions list approvals, signatures, choices and payments oldest first',()=>{
 const records=[rec('q','quote',{status:'Envoyé',number:'S-1',sent_at:'2026-09-28',lines:[{quantity:1,price:100}]},'p'),rec('k','contract',{status:'Envoyé',title:'Cuisine',sent_at:'2026-10-06'},'p'),rec('i','invoice',inv({number:'F-1'}),'p'),rec('p','project',{title:'Cuisine',selections:[{id:'s',title:'Comptoir',published:true,published_at:'2026-10-03'}]},null)];
 const items=clientDecisions(records,'2026-10-08');
 assert.deepEqual(items.map(i=>i.kind),['Approbation','Paiement','Choix','Signature']);
 assert.equal(items[0].days,10);
});

test('project health scores delays, overdue tasks, client waits and budget',()=>{
 const project=rec('p','project',{title:'Cuisine',status:'En cours',start:'2026-09-01',end:'2026-10-11',operations:{costCodes:[{id:'c',code:'01',name:'Général',budget:10000}],vendorBills:[{id:'b',reference:'V',supplier:'S',issuedOn:'2026-09-10',subtotal:9000,tax:0,status:'À payer'}]}});
 const records=[project,rec('t1','task',{title:'A',status:'Validée'},'p'),rec('t2','task',{title:'B',status:'À faire',due:'2026-10-01'},'p'),rec('t3','task',{title:'C',status:'À faire',due:'2026-10-20'},'p'),rec('q','quote',{status:'Envoyé',sent_at:'2026-09-20',lines:[]},'p')];
 const h=projectHealth(project,records,'2026-10-08');
 assert.equal(h.progress,33);
 assert.equal(h.expected,93);
 assert.equal(h.overdueTasks,1);
 assert.ok(h.alerts.some(a=>a.kind==='schedule'&&a.level==='danger'));
 assert.ok(h.alerts.some(a=>a.kind==='client'));
 assert.ok(h.alerts.some(a=>a.kind==='budget'));
 assert.equal(h.status,'off_track');
 assert.ok(h.score<50);
 const done=projectHealth(rec('d','project',{title:'Fini',status:'Terminé'}),[],'2026-10-08');
 assert.equal(done.status,'done');
});

test('weekly report draft summarises the week and is empty when nothing happened',()=>{
 const project=rec('p','project',{title:'Cuisine',operations:{dailyLogs:[{id:'l',date:'2026-10-06',summary:'Pose des armoires'}]}});
 const records=[project,rec('t1','task',{title:'Démolition',status:'Validée'},'p','c1','2026-10-05T10:00:00Z'),rec('t2','task',{title:'Plomberie',status:'En cours'},'p'),rec('t3','task',{title:'Peinture',status:'À faire',due:'2026-10-15'},'p')];
 const draft=weeklyReportDraft(project,records,'2026-10-08');
 assert.match(draft.notes,/Réalisé cette semaine\n• Démolition\n• Pose des armoires/);
 assert.match(draft.notes,/En cours\n• Plomberie/);
 assert.match(draft.notes,/Peinture \(2026-10-15\)/);
 assert.equal(weeklyReportDraft(rec('x','project',{}),[],'2026-10-08').empty,true);
});

test('client requests are visible to the client only, never to field workers',()=>{
 const project=rec('p','project',{title:'X',client_requests:[{id:'r',title:'Ajouter une prise',status:'Nouvelle',createdAt:'2026-10-01',author:'Client'}]},null,'c1');
 const client:Profile={id:'u',name:'C',email:'c@x.test',role:'client',client_id:'c1'};
 const worker:Profile={id:'w',name:'W',email:'w@x.test',role:'worker',client_id:null};
 assert.equal(redact(client,project).data.client_requests.length,1);
 assert.deepEqual(redact(worker,project).data.client_requests,[]);
});
