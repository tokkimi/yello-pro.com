import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromRooms,clientPlan,extensionTemplate,planSchema,bounds} from '../lib/plan';
test('plan converts feet to metres and retains relative dimensions',()=>{const p=fromRooms([{name:'Cuisine',length:10,width:20,height:8,unit:'pi'}]);assert.equal(p.rooms[0].length,3.048);assert.equal(p.rooms[0].width,6.096);assert.equal(bounds(p).h,6.096);});
test('client plan allowlist removes financial and internal data',()=>{const p=fromRooms();const cleaned=clientPlan({...p,price:12000,notes:'SECRET',rooms:p.rooms.map(r=>({...r,price:99,notes:'PRIVATE'}))} as any);assert(!JSON.stringify(cleaned).includes('price'));assert(!JSON.stringify(cleaned).includes('SECRET'));assert(!JSON.stringify(cleaned).includes('PRIVATE'));});
test('invalid geometry is rejected before validation',()=>{const p=fromRooms();p.rooms[0].width=-1;assert.equal(planSchema.safeParse(p).success,false);});
test('extension template contains editable rooms and construction elements',()=>{const plan=extensionTemplate();assert.equal(plan.rooms.length,8);assert(plan.elements.length>=8);assert(plan.elements.some(element=>element.kind==='island'));assert.equal(planSchema.safeParse(plan).success,true);});
