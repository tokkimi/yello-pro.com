import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,permitted} from '../lib/model';
import {redact} from '../lib/redact';
import {demoRecords,demoUser} from '../lib/demo';
import {makePdf} from '../lib/pdf';
import {PDFDocument} from 'pdf-lib';
test('quote totals round Québec taxes and discounts independently',()=>{assert.deepEqual(totals({lines:[{quantity:2,price:100}],discount:10,tps:5,tvq:9.975}),{subtotal:200,discount:20,net:180,tps:9,tvq:17.96,total:206.96})});
test('empty quote is zero and decimal line amounts are rounded',()=>{assert.equal(totals({lines:[]}).total,0);assert.equal(totals({lines:[{quantity:3,price:19.99}],tps:0,tvq:0}).total,59.97)});
test('worker cannot access accounting, customers or quotes',()=>{for(const kind of ['invoice','expense','quote','client','settings','journal'] as const)assert.equal(permitted('worker',kind),false);assert.equal(permitted('worker','task'),true);assert.equal(permitted('worker','message'),true)});
test('client cannot access internal visits or tasks',()=>{assert.equal(permitted('client','visit'),false);assert.equal(permitted('client','task'),false);assert.equal(permitted('client','invoice'),true)});
test('project payload excludes budgets and internal notes for workers and clients',()=>{const project=demoRecords.find(r=>r.kind==='project')!;for(const role of ['worker','client'] as const){const safe=redact({...demoUser,role},project);assert.equal(safe.data.budget,undefined);assert.equal(safe.data.notes,undefined);assert.equal(safe.data.title,project.data.title)}});
test('long PDF with French text remains valid and paginates',async()=>{const bytes=await makePdf('Soumission — démonstration',{lines:Array.from({length:75},(_,i)=>({description:`Pièce ${i} : rénovation complète et préparation des surfaces`,quantity:12.5,price:89.5,unit:'pi²'})),terms:'Conditions détaillées : échéancier à convenir.'});const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>2);assert.ok(bytes.length>1000)});

