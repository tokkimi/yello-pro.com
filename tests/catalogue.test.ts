import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueFrom,catalogueLines,exportCatalogue,importCatalogue,starterCatalogue} from '../lib/catalogue';
import {clientPricing} from '../lib/client-pricing';
import {totals} from '../lib/model';
import {operationsFrom,operationTotals,procurementAmount} from '../lib/project-operations';

test('catalogue snapshots preserve quote independence and exclude private notes',()=>{
 const entry=catalogueFrom([{id:'t',tab:'Mes soumissions',name:'Cuisine',lines:[{description:'Armoires',price:200,internal_notes:'Équipe',admin_notes:'Confidentiel'}]}])[0];
 const lines=catalogueLines(entry);lines[0].price=999;
 assert.equal(entry.lines[0].price,200);assert.equal(lines[0].internal_notes,undefined);assert.equal(lines[0].admin_notes,undefined);
 assert.equal(importCatalogue(exportCatalogue([entry]))[0].name,'Cuisine');
 assert.throws(()=>importCatalogue('{"format":"other","entries":[]}'));
 assert.throws(()=>importCatalogue('{"format":"mgpro-catalogue","version":1,"entries":[{"tab":"unknown"}]}'));
 assert.ok(starterCatalogue.every(x=>x.steps.length||x.lines.length||x.activities.length));
});
test('split catalogue costs become the document unit cost',()=>{
 const entry=catalogueFrom([{id:'a',tab:'Produits',name:'Pose',material:150,labour:300}])[0];
 assert.equal(catalogueLines(entry)[0].price,450);assert.equal(catalogueLines(entry)[0].pricing_mode,'split');
});
test('client sale-price projection hides costs and preserves exact taxes and discounts',()=>{
 for(const lines of [[{description:'A',quantity:2.3,price:7.895,margin:17.356,material_cost:2,labour_cost:5.895,internal_notes:'Secret'}],Array.from({length:35},(_,i)=>({description:String(i),quantity:i%3?0.3:1,price:0.03,margin:16.346})),[{quantity:1,price:450,margin:25},{quantity:0,price:100,margin:5}]]){
  const source={lines,markup:14.37,discount:3.25,tps:5,tvq:9.975};const projected=clientPricing(source),before=totals(source),after=totals(projected);
  assert.equal(after.net,before.net);assert.equal(after.tps,before.tps);assert.equal(after.tvq,before.tvq);assert.equal(after.total,before.total);
  assert.equal(projected.markup,0);assert.equal(projected.lines[0].material_cost,undefined);assert.equal(projected.lines[0].labour_cost,undefined);assert.equal(projected.lines[0].margin,undefined);assert.equal(projected.lines[0].internal_notes,undefined);
 }
});
test('procurement details survive project save normalization and draft orders are not committed',()=>{
 const operations=operationsFrom({purchaseOrders:[{id:'a',status:'Brouillon',amount:1000,reference:'PO-1',email:'vendor@example.com',quoteId:'q',taxRate:14.975,lines:[{id:'l',description:'Planches',quantity:2,price:100,received:3}]}]});
 assert.equal(operations.purchaseOrders[0].quoteId,'q');assert.equal(operations.purchaseOrders[0].lines?.[0].received,2);
 assert.equal(procurementAmount(operations.purchaseOrders[0].lines!,14.975),229.95);
 assert.equal(operationTotals(operations).committed,0);
 operations.purchaseOrders[0].status='Envoyé';assert.equal(operationTotals(operations).committed,1000);
});
