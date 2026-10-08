import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSnapshot} from '../lib/record-sync';
import {isPlatformOwner} from '../lib/platform-owner';
import type {RecordItem} from '../lib/model';
const row=(id:string,version:number):RecordItem=>({id,kind:'task',data:{title:'Task'},version,client_id:null,project_id:null,created_at:'',updated_at:''});
test('an old poll cannot overwrite a newer save and concurrent creates remain visible',()=>{const result=reconcileSnapshot([row('a',3),row('b',1)],[row('a',2)],true);assert.equal(result.find(r=>r.id==='a')?.version,3);assert.ok(result.find(r=>r.id==='b'));assert.deepEqual(reconcileSnapshot([row('a',3),row('b',1)],[row('a',3)],false).map(r=>r.id),['a'])});
test('platform privilege requires an explicit Auth UUID, never an email or ordinary role',()=>{const id='11111111-1111-4111-8111-111111111111';assert.equal(isPlatformOwner(id,id),true);assert.equal(isPlatformOwner(id,''),false);assert.equal(isPlatformOwner('admin',id),false);assert.equal(isPlatformOwner('owner@example.com','owner@example.com'),false)});

test('unchanged snapshots retain identity so polling does not reset active controls',()=>{const current=[row('a',1)];assert.equal(reconcileSnapshot(current,[row('a',1)],false),current)});
