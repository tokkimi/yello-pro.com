import test from 'node:test';
import assert from 'node:assert/strict';
import {redact} from '../lib/redact';
import type {Profile,RecordItem} from '../lib/model';

const project=(data:Record<string,unknown>):RecordItem=>({id:'p1',kind:'project',client_id:'c1',project_id:null,version:1,created_at:'',updated_at:'',data});
const client:Profile={id:'u-client',name:'Client A',email:'a@example.test',role:'client',client_id:'c1'};
const worker:Profile={id:'u-worker',name:'Prestataire',email:'w@example.test',role:'worker',client_id:null};
const full={title:'Cuisine',schedule:[{id:'s',title:'Démolition',start:'2026-10-12',days:2,assignee:'Équipe interne'}],operations:{vendorBills:[{id:'b',subtotal:900}],vendorPayments:[{id:'p',amount:900}],priceRequests:[{id:'r',responses:[{supplier:'X',subtotal:1}]}],timesheets:[{hourlyRate:40}],dailyLogs:[{id:'l1',summary:'privé',sharedWithClient:false},{id:'l2',summary:'partagé',sharedWithClient:true}]},communication_note:'interne',selections:[{id:'x',published:false,options:[{name:'Option',cost:10,price:20}]}]};

test('client and worker never receive supplier finance, rates or unpublished items',()=>{
 for(const user of [client,worker]){
  const out=redact(user,project(full));
  const text=JSON.stringify(out);
  for(const secret of ['vendorBills','vendorPayments','priceRequests','hourlyRate','communication_note','privé','"cost"'])assert.equal(text.includes(secret),false,`${user.role} must not see ${secret}`);
  assert.deepEqual(out.data.schedule,[],'unpublished schedule is withheld');
  assert.deepEqual(out.data.selections,[]);
  assert.deepEqual(out.data.operations.dailyLogs.map((x:any)=>x.id),['l2']);
 }
});

test('a published schedule shows dates and progress but not who is assigned',()=>{
 const out=redact(client,project({...full,schedule_published:true}));
 assert.equal(out.data.schedule.length,1);
 assert.equal(out.data.schedule[0].title,'Démolition');
 assert.equal(out.data.schedule[0].assignee,'');
});

test('admin keeps the full record',()=>{
 const admin:Profile={id:'u-admin',name:'Admin',email:'x@example.test',role:'admin',client_id:null};
 assert.deepEqual(redact(admin,project(full)).data,full);
});
