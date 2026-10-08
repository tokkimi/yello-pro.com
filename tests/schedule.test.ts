import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleFrom,scheduleEnd,recalculateSchedule,scheduleError} from '../lib/schedule';
import {redact} from '../lib/redact';

test('schedule uses working days, holidays and independent snapshots',()=>{
 const items=scheduleFrom([{id:'a',title:'Préparation',start:'2026-10-09',days:2},{id:'b',title:'Pose',days:1,predecessor:'a'}]);
 assert.equal(scheduleEnd(items[0]),'2026-10-12');
 assert.equal(scheduleEnd(items[0],true,['2026-10-12']),'2026-10-13');
 const result=recalculateSchedule(items);assert.equal(result[1].start,'2026-10-13');assert.equal(items[1].start,'');
 assert.equal(scheduleFrom([{id:'x',start:'2026-02-31'}])[0].start,'');
 assert.match(scheduleError([{...items[0],predecessor:'b'},items[1]]),/cycle/);
});
test('client contract projection never exposes cached internal totals',()=>{
 const record:any={id:'q',kind:'contract',data:{lines:[{description:'Pose',quantity:1,price:100,margin:25}],totals:{baseSubtotal:100,profit:25},costs:100,internal_costs:100,profit:25,admin_notes:'secret'},client_id:'c'};
 const output=redact({id:'c',role:'client'} as any,record).data;
 assert.equal(output.totals,undefined);assert.equal(output.costs,undefined);assert.equal(output.profit,undefined);assert.equal(output.admin_notes,undefined);assert.equal(output.lines[0].price,125);
});

test('nested groups, move/resize helpers and group spans',async()=>{
 const {scheduleFrom,scheduleError,shiftActivity,resizeActivity,groupSpan,depth}=await import('../lib/schedule');
 const rows=scheduleFrom([{id:'g',title:'Gros œuvre',kind:'group'},{id:'s',title:'Sous-groupe',kind:'group',parent:'g'},{id:'a',title:'A',start:'2026-10-12',days:2,parent:'s'},{id:'m',title:'Jalon',kind:'milestone',start:'2026-10-20',parent:'g'}]);
 assert.equal(depth(rows,'a'),2);
 assert.deepEqual(groupSpan(rows,'g',true,[]),{start:'2026-10-12',end:'2026-10-20'});
 assert.equal(shiftActivity(rows[2],3).start,'2026-10-15');
 assert.equal(resizeActivity(rows[2],-5).days,1,'never below one day');
 assert.equal(resizeActivity(rows[3],4).days,0,'a milestone keeps zero duration');
 assert.match(scheduleError(scheduleFrom([{id:'g',title:'G',kind:'group',parent:'h'},{id:'h',title:'H',kind:'group',parent:'g'}])),/lui-même/);
 assert.match(scheduleError(scheduleFrom([{id:'a',title:'A',parent:'zz'}])),/groupe absent/);
});
