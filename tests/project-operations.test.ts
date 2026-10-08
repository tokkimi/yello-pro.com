import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsFrom,operationTotals,timesheetsForDates,approveTimesheets} from '../lib/project-operations';

test('project operations sanitize incomplete rows and calculate job exposure',()=>{
 const operations=operationsFrom({budget:[{id:'a',name:'Cuisine',budget:10000,actual:2500}],purchaseOrders:[{id:'b',supplier:'Bois',title:'Plancher',amount:1200,status:'Envoyé'},{id:'c',supplier:'X',title:'Annulé',amount:400,status:'Annulé'}],changeOrders:[{id:'d',title:'Mur',amount:700,days:1,status:'Approuvée'}],timesheets:[{id:'e',date:'2026-09-27',person:'Équipe',hours:7.5}]});
 assert.deepEqual(operationTotals(operations),{planned:10000,actual:2500,committed:1200,requested:0,approvedChanges:700,hours:7.5,remaining:6300});
});

test('weekly approval includes weekends but never another week or employee',()=>{
 const sheets=operationsFrom({timesheets:[
  {id:'a',person:'Alex',date:'2026-10-05',hours:8,hourlyRate:30,status:'Brouillon'},
  {id:'b',person:'Alex',date:'2026-10-11',hours:4,hourlyRate:40,status:'Brouillon'},
  {id:'c',person:'Alex',date:'2026-10-12',hours:9,hourlyRate:30,status:'Brouillon'},
  {id:'d',person:'Camille',date:'2026-10-05',hours:7,hourlyRate:25,status:'Brouillon'}
 ]}).timesheets;
 const dates=['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11'];
 const selected=timesheetsForDates(sheets,dates,'Alex');
 assert.equal(selected.reduce((sum,sheet)=>sum+sheet.hours,0),12);
 assert.equal(selected.reduce((sum,sheet)=>sum+sheet.hours*sheet.hourlyRate,0),400);
 assert.deepEqual(approveTimesheets(sheets,dates,'Alex').map(sheet=>sheet.status),['Approuvée','Approuvée','Brouillon','Brouillon']);
 assert.equal(sheets[0].status,'Brouillon');
 assert.deepEqual(timesheetsForDates(sheets,['2026-11-01']),[]);
});
