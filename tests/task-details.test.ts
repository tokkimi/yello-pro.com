import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskDetailsError} from '../lib/task-details';
import type {RecordItem} from '../lib/model';
const task=(id:string,project_id:string,dependencies:string[]=[]):RecordItem=>({id,project_id,client_id:null,kind:'task',version:1,created_at:'',updated_at:'',data:{dependencies}});
test('task dependencies reject cross-project links, self-reference and cycles',()=>{const rows=[task('a','p',['b']),task('b','p'),task('c','other')];assert.equal(taskDetailsError({dependencies:['b']},'a','p',rows),null);assert.ok(taskDetailsError({dependencies:['c']},'a','p',rows));assert.ok(taskDetailsError({dependencies:['a']},'a','p',rows));assert.ok(taskDetailsError({dependencies:['a']},'b','p',rows))});
test('checklist rejects duplicate IDs and unbounded text while allowing completion',()=>{const item={id:'step',text:'Valider les mesures',done:true};assert.equal(taskDetailsError({checklist:[item]},undefined,null,[]),null);assert.ok(taskDetailsError({checklist:[item,item]},undefined,null,[]));assert.ok(taskDetailsError({checklist:[{...item,text:'x'.repeat(251)}]},undefined,null,[]))});
