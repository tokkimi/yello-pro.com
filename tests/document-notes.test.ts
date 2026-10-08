import test from 'node:test';
import assert from 'node:assert/strict';
import {documentNotes} from '../lib/document-notes';
import {redact} from '../lib/redact';
import {totals,type Profile,type RecordItem} from '../lib/model';

test('nested notes respect client, provider and administration scopes without modifying saved data',()=>{
 const data={notebook:{text:'Croquis privé'},lines:[{description:'Mur',notes:'Note publique',internal_notes:'Équipe',admin_notes:'Admin'},{notes:'Masquée',show_notes:false}],groups:[{admin_notes:'Groupe privé'}]};
 const client=documentNotes(data,'client'),worker=documentNotes(data,'worker');
 assert.equal(client.lines[0].notes,'Note publique');
 assert.equal(client.lines[0].internal_notes,undefined);
 assert.equal(client.lines[0].admin_notes,undefined);
 assert.equal(client.lines[1].notes,undefined);
 assert.equal(worker.lines[0].internal_notes,'Équipe');
 assert.equal(worker.lines[0].admin_notes,undefined);
 assert.equal(worker.groups[0].admin_notes,undefined);
 assert.equal(worker.notebook,undefined);
 assert.equal(client.notebook,undefined);
 assert.equal(data.lines[0].admin_notes,'Admin');
 assert.equal(documentNotes(data,'admin'),data);
});

test('project clients receive only explicitly shared reports and no payroll or budgets',()=>{
 const user:Profile={id:'client',role:'client',name:'Client',email:'client@example.com',client_id:'c'};
 const record:RecordItem={id:'p',kind:'project',client_id:'c',project_id:null,version:1,created_at:'',updated_at:'',data:{title:'Projet',operations:{timesheets:[{person:'Alex',hourlyRate:90}],budget:[{actual:1000}],dailyLogs:[{id:'a',summary:'Privé'},{id:'b',summary:'Partagé',sharedWithClient:true,admin_notes:'Secret'}]}}};
 const data=redact(user,record).data;
 assert.deepEqual(data.operations.dailyLogs.map((l:any)=>l.id),['b']);
 assert.equal(data.operations.timesheets,undefined);
 assert.equal(data.operations.budget,undefined);
 assert.equal(data.operations.dailyLogs[0].admin_notes,undefined);
});

test('a twenty percent profit margin gives a twenty-five percent markup before taxes',()=>{
 const profit=20,cost=150+300,markup=profit/(100-profit)*100;
 const result=totals({lines:[{quantity:2,price:cost,margin:markup}],tps:5,tvq:9.975});
 assert.equal(result.net,1125);
 assert.equal(result.total,1293.47);
});
