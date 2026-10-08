import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsFrom} from '../lib/project-operations';
import {awardResponse,billBalance,compareResponses,receiveOrder,refreshBillStatuses,reconciliation,validateBill,validateCredit,validatePayment,vendorBudget,orderBilling,UNCATEGORISED} from '../lib/vendor-finance';

const base=()=>operationsFrom({
 costCodes:[{id:'c1',code:'16',name:'Électricité',budget:10000},{id:'c2',code:'09',name:'Finitions',budget:4000}],
 priceRequests:[{id:'r1',supplier:'',scope:'Filage cuisine',status:'Envoyée',costCode:'16',lines:[{id:'l1',description:'Prises',quantity:10,unit:'unité',price:50},{id:'l2',description:'Panneau',quantity:1,unit:'unité',price:500}],responses:[
  {id:'a',supplier:'Élec Nord',email:'nord@example.test',subtotal:1200,taxRate:14.975,receivedOn:'2026-10-01',delayDays:10},
  {id:'b',supplier:'Élec Sud',email:'sud@example.test',subtotal:950,taxRate:14.975,receivedOn:'2026-10-02',delayDays:12},
  {id:'c',supplier:'Élec Est',subtotal:900,taxRate:14.975,status:'Écartée'}
 ]}]
});

test('several answers are ranked and the gap to the lowest valid answer is explicit',()=>{
 const ranked=compareResponses(base().priceRequests[0].responses!);
 assert.deepEqual(ranked.map(x=>x.response.id),['b','a','c']);
 assert.equal(ranked[0].lowest,true);
 assert.equal(ranked[1].gap,250);
 assert.equal(ranked[1].gapPercent,26.32);
 assert.equal(ranked[0].total,1092.26);
 assert.equal(ranked[2].lowest,false,'a rejected answer is never the reference');
});

test('award creates one draft order that is not a commitment and cannot be awarded twice',()=>{
 const ops=awardResponse(base(),'r1','b','po1');
 const order=ops.purchaseOrders[0];
 assert.equal(order.status,'Brouillon');
 assert.equal(order.supplier,'Élec Sud');
 assert.equal(order.costCode,'16');
 assert.equal(orderBilling(ops,order).value,950,'requested lines are scaled to the awarded pre-tax amount');
 assert.equal(ops.priceRequests[0].status,'Attribuée');
 assert.equal(ops.priceRequests[0].responses!.find(x=>x.id==='b')!.status,'Retenue');
 assert.equal(vendorBudget(ops).total.committed,0,'draft order is not committed');
 assert.throws(()=>awardResponse(ops,'r1','a','po2'),/déjà attribuée/);
 assert.throws(()=>awardResponse(base(),'r1','c','po3'),/écartée/);
});

test('partial reception, invoice, credit and payment never double count cost',()=>{
 let ops=awardResponse(base(),'r1','b','po1');
 ops.purchaseOrders[0].status='Envoyé';
 assert.throws(()=>receiveOrder(ops.purchaseOrders[0],{l1:11}),/supérieure/);
 ops.purchaseOrders[0]=receiveOrder(ops.purchaseOrders[0],{l1:5});
 assert.equal(ops.purchaseOrders[0].status,'Partiellement reçu');
 let budget=vendorBudget(ops).rows.find(x=>x.key==='16')!;
 assert.equal(budget.committed,950);assert.equal(budget.openCommitment,950);assert.equal(budget.actual,0);assert.equal(budget.forecast,950);
 // Supplier invoices 600 + taxes against the order.
 ops.vendorBills.push({id:'b1',reference:'F-100',supplier:'Élec Sud',orderId:'po1',costCode:'16',phaseId:'',issuedOn:'2026-10-05',dueOn:'2026-11-04',subtotal:600,tax:89.85,status:'À payer',attachment:'',notes:''});
 assert.deepEqual(validateBill(ops,ops.vendorBills[0]),[]);
 budget=vendorBudget(ops).rows.find(x=>x.key==='16')!;
 assert.equal(budget.actual,600);assert.equal(budget.openCommitment,350);assert.equal(budget.forecast,950,'order + its invoice still count once');
 // Credit of 50 + taxes applied to the invoice.
 ops.vendorCredits.push({id:'k1',reference:'C-7',supplier:'Élec Sud',billId:'b1',costCode:'16',issuedOn:'2026-10-06',subtotal:50,tax:7.49,status:'Appliqué',notes:''});
 assert.deepEqual(validateCredit(ops,ops.vendorCredits[0]),[]);
 assert.equal(billBalance(ops,'b1'),632.36);
 // Payment above the balance is refused, exact balance accepted.
 const payment={id:'p1',reference:'CHQ-1',supplier:'Élec Sud',billId:'b1',paidOn:'2026-10-10',method:'Chèque',amount:700,status:'Émis' as const,reconciled:false,reconciledOn:'',notes:''};
 assert.match(validatePayment(ops,payment).join(' '),/dépasse le solde/);
 payment.amount=632.36;assert.deepEqual(validatePayment(ops,payment),[]);
 ops.vendorPayments.push(payment);ops=refreshBillStatuses(ops);
 assert.equal(ops.vendorBills[0].status,'Payée');
 budget=vendorBudget(ops).rows.find(x=>x.key==='16')!;
 assert.equal(budget.actual,550,'payments do not add cost; credits reduce it');
 assert.equal(budget.paid,632.36);assert.equal(budget.payable,0);
 assert.equal(budget.remaining,10000-550-350);
 const check=reconciliation(ops);
 assert.equal(check.unreconciledCount,1);assert.deepEqual(check.billsWithoutAttachment,['b1']);
 ops.vendorPayments[0].reconciled=true;assert.equal(reconciliation(ops).unreconciledCount,0);
});

test('duplicate supplier invoices, unlinked payments and oversized credits are refused',()=>{
 const ops=operationsFrom({vendorBills:[{id:'b1',reference:'F-1',supplier:'Bois',issuedOn:'2026-10-01',subtotal:100,tax:0,status:'À payer'}]});
 assert.match(validateBill(ops,{...ops.vendorBills[0],id:'b2',supplier:'bois'}).join(' '),/déjà enregistrée/);
 assert.match(validatePayment(ops,{id:'p',reference:'',supplier:'Bois',billId:'zz',paidOn:'2026-10-02',method:'Virement',amount:10,status:'Émis',reconciled:false,reconciledOn:'',notes:''}).join(' '),/Choisissez la facture/);
 assert.match(validateCredit(ops,{id:'k',reference:'C',supplier:'Bois',billId:'b1',costCode:'',issuedOn:'2026-10-02',subtotal:150,tax:0,status:'Appliqué',notes:''}).join(' '),/dépasse le solde/);
 const draft=operationsFrom({vendorBills:[{id:'b1',reference:'F-1',supplier:'Bois',issuedOn:'2026-10-01',subtotal:100,tax:0,status:'Brouillon'}]});
 assert.match(validatePayment(draft,{id:'p',reference:'',supplier:'Bois',billId:'b1',paidOn:'2026-10-02',method:'Virement',amount:10,status:'Émis',reconciled:false,reconciledOn:'',notes:''}).join(' '),/brouillon/);
 assert.equal(vendorBudget(draft).total.actual,0,'draft supplier invoice is not a cost');
});

test('budget keeps original, revised, labour and uncategorised rows separate',()=>{
 const ops=operationsFrom({costCodes:[{id:'c',code:'09',name:'Finitions',budget:4000}],changeOrders:[{id:'x',title:'Extra',amount:1500,cost:1000,costCode:'09',status:'Approuvée'},{id:'y',title:'Refusé',amount:900,cost:600,costCode:'09',status:'Refusée'}],timesheets:[{id:'t1',person:'A',date:'2026-10-05',hours:8,hourlyRate:40,status:'Approuvée',costCode:'09'},{id:'t2',person:'A',date:'2026-10-06',hours:8,hourlyRate:40,status:'Brouillon',costCode:'09'}],purchaseOrders:[{id:'o',supplier:'S',title:'Peinture',amount:115,taxRate:15,status:'Envoyé'}]});
 const {rows,total}=vendorBudget(ops);
 const finishes=rows.find(x=>x.key==='09')!;
 assert.equal(finishes.original,4000);assert.equal(finishes.revised,5000);assert.equal(finishes.labour,320);assert.equal(finishes.actual,320);
 const other=rows.find(x=>x.key===UNCATEGORISED)!;
 assert.equal(other.committed,100,'pre-tax value of an order without lines');
 assert.equal(rows.at(-1)!.key,UNCATEGORISED);
 assert.equal(total.forecast,420);
});

test('company supplier ledger keeps families apart and never adds payments or orders to cost',async()=>{
 const {supplierLedger,ledgerCost}=await import('../lib/vendor-finance');
 const project={id:'p1',data:{operations:{purchaseOrders:[{id:'o',supplier:'S',title:'Bois',amount:115,taxRate:15,status:'Envoyé'}],vendorBills:[{id:'b',reference:'F1',supplier:'S',orderId:'o',issuedOn:'2026-10-01',subtotal:100,tax:15,status:'À payer'},{id:'d',reference:'F2',supplier:'S',issuedOn:'2026-10-02',subtotal:50,tax:0,status:'Brouillon'}],vendorCredits:[{id:'c',reference:'C1',supplier:'S',billId:'b',issuedOn:'2026-10-03',subtotal:10,tax:1.5,status:'Appliqué'}],vendorPayments:[{id:'p',supplier:'S',billId:'b',paidOn:'2026-10-04',amount:50,status:'Émis'}]}}};
 const expense={id:'e',project_id:'p1',data:{supplier:'Quinc',date:'2026-10-05',net:20,tps:1,tvq:1.99,status:'À payer'}};
 const rows=supplierLedger([project],[expense],operationsFrom);
 assert.deepEqual(rows.map(r=>r.family).sort(),['Bon de commande','Crédit fournisseur','Dépense','Facture fournisseur','Facture fournisseur','Paiement fournisseur']);
 const cost=ledgerCost(rows);
 assert.equal(cost.subtotal,110,'100 invoice − 10 credit + 20 expense; draft invoice, payment and order excluded');
 assert.equal(cost.total,126.49);
 assert.equal(rows.find(r=>r.id==='b:p1:b')!.balance,53.5);
});
