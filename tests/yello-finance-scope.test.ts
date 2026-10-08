import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeClient} from '../lib/tenant-scope';
test('finance RPC overwrites any caller-supplied enterprise with the authenticated scope',()=>{
 const workspace='11111111-1111-4111-8111-111111111111';
 let captured:any;
 const client=scopeClient({rpc:(name:string,args:any)=>{captured={name,args};return captured}},workspace);
 client.rpc('finance_operation',{p_workspace:'22222222-2222-4222-8222-222222222222',p_action:'issue',p_id:'record'});
 assert.equal(captured.args.p_workspace,workspace);
 assert.equal(captured.name,'finance_operation');
 assert.throws(()=>client.rpc('invoice_operation',{}),/réservée/);
});
