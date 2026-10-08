import test from 'node:test';
import assert from 'node:assert/strict';
import type {RecordItem} from '../lib/model';
import {nextRun,runRoutine,routinesFrom,isDue} from '../lib/routines';
import {newCandidates,taskCandidates} from '../lib/task-sources';
import {folderContent,projectFiles,systemFolders} from '../lib/files';

const rec=(id:string,kind:any,data:any,project_id:string|null=null):RecordItem=>({id,kind,data,client_id:null,project_id,version:1,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z'});

test('routines compute real figures and never run by just being read',()=>{
 const records=[rec('i1','invoice',{number:'F-1',status:'Émise',due:'2026-10-01',lines:[{quantity:1,price:100}],tps:5,tvq:9.975,paid:0}),rec('p','project',{title:'Cuisine',status:'En cours',operations:{vendorBills:[{id:'b',reference:'V1',supplier:'S',issuedOn:'2026-10-01',subtotal:50,tax:0,status:'À payer'}]}})];
 const lines=runRoutine('receivables_payables',records,'2026-10-08');
 assert.match(lines[0],/114,98/);assert.match(lines[1],/50,00/);
 assert.match(runRoutine('overdue_invoices',records,'2026-10-08')[0],/F-1/);
 const [r]=routinesFrom([{id:'r',title:'AR',kind:'receivables_payables',weekday:1,hour:8,lastRun:'2026-10-05T12:00:00Z'}]);
 assert.equal(nextRun(r,new Date('2026-10-08T10:00:00')).getDay(),1);
 assert.equal(isDue(r,new Date('2026-10-08T10:00:00')),false);
 assert.equal(routinesFrom([{kind:'unknown'}]).length,0);
});

test('task import offers each source line once and skips what is already imported',()=>{
 const project=rec('p','project',{schedule:[{id:'a',title:'Démolition',days:1},{id:'g',title:'Groupe',kind:'group'}]});
 const quote=rec('q','quote',{title:'Devis',lines:[{description:'Pose céramique',quantity:10,unit:'pi²'},{description:''}]},'p');
 const records=[project,quote];
 const fromQuote=taskCandidates('Soumission',project,records,{});
 assert.deepEqual(fromQuote.map(c=>c.title),['Pose céramique']);
 assert.deepEqual(taskCandidates('Échéancier',project,records,{}).map(c=>c.title),['Démolition']);
 const done=rec('t','task',{title:'Pose céramique',source_ref:fromQuote[0].ref},'p');
 assert.deepEqual(newCandidates(fromQuote,[done]),[]);
 assert.deepEqual(taskCandidates('Personnalisée',project,records,{}),[]);
});

test('system folders include contracts; generated documents cannot be moved; shared folder mirrors client visibility',()=>{
 assert.equal(systemFolders.length,10);assert.ok(systemFolders.includes('Contrats'));
 const project=rec('p','project',{title:'X',operations:{dailyLogs:[{id:'l',date:'2026-10-02',summary:'ok',sharedWithClient:true}]}});
 const files=projectFiles(project,[project,rec('d1','document',{name:'plan.pdf',mime:'application/pdf',visibility:'client',folder:'Soumissions'},'p'),rec('d2','document',{name:'plan.pdf',mime:'application/pdf'},'p'),rec('q','quote',{number:'S-1',status:'Envoyé'},'p')]);
 assert.equal(files.filter(f=>f.name==='plan.pdf').length,2,'same name, two distinct files');
 assert.equal(files.find(f=>f.id==='doc:q')!.movable,false);
 assert.deepEqual(folderContent(files,'Partagé avec le client').map(f=>f.id).sort(),['d1','doc:q','log:l']);
 assert.deepEqual(folderContent(files,'Soumissions').map(f=>f.id).sort(),['d1','doc:q']);
});
