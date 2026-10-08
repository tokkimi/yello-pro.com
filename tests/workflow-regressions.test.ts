import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {contractError,contractFromQuote} from '../lib/contracts';
import {activeRecords,clientTrash} from '../lib/client-trash';
import {allowsPerson} from '../lib/access';
import {financialOverview} from '../lib/financial-overview';
import {accountingBundle,selectBundleRecords} from '../lib/accounting-bundle';
import {RecordItem,Profile} from '../lib/model';

const id=(last:string)=>`00000000-0000-4000-8000-${last.padStart(12,'0')}`;
const row=(kind:RecordItem['kind'],last:string,data:any,client_id:string|null=null,project_id:string|null=null):RecordItem=>({id:id(last),kind,data,client_id,project_id,version:1,created_at:'2026-09-01T00:00:00Z',updated_at:'2026-09-01T00:00:00Z'});

test('unfinished contract stays draft; sharing requires agreed scope, terms and 100 percent schedule',()=>{
 const draft={title:'Cuisine',number:'CTR-1',status:'Brouillon',lines:[],payment_schedule:[]};
 assert.equal(contractError(draft),null);
 const sent={...draft,status:'Envoyé',scope:'Rénover la cuisine',terms:'Conditions convenues',lines:[{description:'Démolition',quantity:1,price:100}],payment_schedule:[{label:'Dépôt',percent:60}]};
 assert.match(String(contractError(sent)),/100/);
 assert.equal(contractError({...sent,payment_schedule:[{label:'Dépôt',percent:60},{label:'Fin',percent:40}]}),null);
 assert.match(String(contractError({...sent,end:'2026-08-01',start:'2026-09-01'})),/fin prévue/);
 const copied=contractFromQuote({lines:[{description:'Mur',quantity:2,price:35}],payment_schedule:[{label:'Fin',percent:100}],markup:10});
 copied.lines[0].price=0;assert.equal(copied.markup,10);assert.equal(copied.payment_schedule[0].percent,100);
});

test('client trash hides every linked record and restore exposes them again',()=>{
 const client=row('client','1',{name:'Client A',deleted_at:'2026-09-20'});
 const project=row('project','2',{title:'Cuisine'},client.id);
 const invoice=row('invoice','3',{title:'Facture'},client.id,project.id);
 const other=row('client','4',{name:'Client B'});
 assert.deepEqual(clientTrash([client,project,invoice,other]).map(record=>record.id),[client.id]);
 assert.deepEqual(activeRecords([client,project,invoice,other]).map(record=>record.id),[other.id]);
 assert.equal(activeRecords([{...client,data:{name:'Client A'}},project,invoice,other]).length,4);
});

test('sharing permits only the selected client and project workers',()=>{
 const client={id:id('1'),name:'Client A',email:'a@example.com',role:'client',client_id:id('1')} as Profile;
 const worker={id:id('5'),name:'Prestataire',email:'p@example.com',role:'worker',client_id:null} as Profile;
 const contract=row('contract','6',{access:{client:false,workers:[]}},client.id,id('2'));
 assert.equal(allowsPerson(client,contract),false);assert.equal(allowsPerson(worker,contract),false);
 assert.equal(allowsPerson({...client,client_id:id('4')},contract),false);
 assert.equal(allowsPerson(worker,{...contract,data:{access:{client:true,workers:[worker.id]}}}),true);
});

test('financial dashboard and ZIP select the same client, project and period without unrelated receipts',async()=>{
 const clientA=row('client','1',{name:'A'}),clientB=row('client','9',{name:'B'});
 const invoice=row('invoice','2',{date:'2026-05-02',status:'Émise',paid:50,lines:[{description:'Travaux',quantity:1,price:100}],tps:0,tvq:0},clientA.id,id('3'));
 const expense=row('expense','4',{date:'2026-05-03',title:'Peinture',supplier:'Fournisseur',net:20,tps:0,tvq:0,posted:true},clientA.id,id('3'));
 const receipt=row('document','5',{name:'recu.pdf',parent_id:expense.id,path:'test/recu.pdf'},clientA.id,id('3'));
 const foreign=row('invoice','7',{date:'2026-05-02',status:'Émise',lines:[{description:'Autre',quantity:1,price:900}],tps:0,tvq:0},clientB.id,id('8'));
 const records=[clientA,clientB,invoice,expense,receipt,foreign];
 const filter={from:'2026-01-01',to:'2026-12-31',scope:'client' as const,client_id:clientA.id,project_id:id('3')};
 const stats=financialOverview(records,2026,clientA.id,id('3'));
 assert.equal(stats.billed,100);assert.equal(stats.paid,50);assert.equal(stats.spent,20);
 const selected=selectBundleRecords(records,filter);
 assert.deepEqual(selected.invoices.map(record=>record.id),[invoice.id]);assert.deepEqual(selected.documents.map(record=>record.id),[receipt.id]);
 const bytes=await accountingBundle(records,filter,undefined,undefined,async()=>new TextEncoder().encode('%PDF-1.4 test receipt'));
 const zip=await JSZip.loadAsync(bytes);
 assert(zip.file(/02-factures\/.*pdf/).length===1);assert(zip.file(/04-justificatifs\/.*recu.pdf/).length===1);
 assert(!Object.keys(zip.files).some(name=>name.includes(foreign.id)));
});
