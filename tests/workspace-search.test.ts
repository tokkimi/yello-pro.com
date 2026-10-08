import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchWorkspace} from '../lib/workspace-search';
import type {RecordItem} from '../lib/model';
const row=(id:string,kind:RecordItem['kind'],data:RecordItem['data'],client_id:string|null=null):RecordItem=>({id,kind,data,client_id,project_id:null,version:1,created_at:'',updated_at:''});
test('search matches accents and linked client names without indexing private notes',()=>{
 const records=[row('c','client',{name:'Émilie'}),row('q','quote',{title:'Cuisine',number:'DEV-2026-01',internal_notes:'confidentiel'},'c')];
 assert.equal(searchWorkspace(records,'emilie DEV')[0]?.record.id,'q');
 assert.equal(searchWorkspace(records,'confidentiel').length,0);
 assert.equal(searchWorkspace(records,' ').length,0);
});
test('search excludes deleted, archived and configuration records and limits results',()=>{
 const records=[row('a','project',{title:'Projet',deleted_at:'today'}),row('b','project',{title:'Projet',archived:true}),row('s','settings',{title:'Projet'}),...Array.from({length:20},(_,i)=>row(String(i),'project',{title:'Projet '+i}))];
 const results=searchWorkspace(records,'projet');
 assert.equal(results.length,12);
 assert.ok(results.every(x=>!['a','b','s'].includes(x.record.id)));
});
