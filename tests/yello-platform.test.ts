import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {scopeClient} from '../lib/tenant-scope';
import {verifyStripe} from '../lib/stripe-platform';
import {canUse} from '../lib/plans';
test('tenant queries and storage cannot cross workspace boundaries',()=>{
 const id='11111111-1111-4111-8111-111111111111',calls:any[]=[];
 const q:any={select(){return this},update(){return this},delete(){return this},eq(...args:any[]){calls.push(args);return this},insert(value:any){calls.push(value);return this}};
 const scoped=scopeClient({from:(_table:string)=>q,storage:{from:(_bucket:string)=>({download:(path:string)=>path})}},id);
 scoped.from('records').select();assert.deepEqual(calls[0],['workspace_id',id]);
 scoped.from('records').insert({kind:'task'});assert.equal(calls[1].workspace_id,id);
 assert.throws(()=>scoped.from('records').insert({workspace_id:'another'}));
 assert.throws(()=>scoped.from('workspaces'));assert.throws(()=>scoped.storage.from('documents').download('../other/file'));
 assert.equal(scoped.storage.from('documents').download('file.pdf'),id+'/file.pdf');
});
test('Stripe signature refuses changed payloads and expired events',()=>{const time=1700000000,body='{"id":"evt_test"}',secret='test-secret',hash=createHmac('sha256',secret).update(`${time}.${body}`).digest('hex'),sig=`t=${time},v1=${hash}`;assert.equal(verifyStripe(body,sig,secret,time*1000),true);assert.equal(verifyStripe(body+' ',sig,secret,time*1000),false);assert.equal(verifyStripe(body,sig,secret,(time+301)*1000),false)});
test('progressive plans preserve basics and unlock advanced capabilities',()=>{assert.equal(canUse('essential','projects'),true);assert.equal(canUse('essential','invoices'),false);assert.equal(canUse('business','invoices'),true);assert.equal(canUse('business','timesheets'),false);assert.equal(canUse('scale','automation'),true)});
