import Decimal from 'decimal.js';
import {money,round} from './model';
import type {BidResponse,ProjectOperations,PurchaseOrder,VendorBill,VendorCredit,VendorPayment} from './project-operations';

/*
 * Supplier chain: price request → comparable answers → award → purchase order → reception
 * → supplier invoice → credits → payments → reconciliation.
 *
 * Counting rules (H, documented in docs/IMPLEMENTATION_DECISIONS.md):
 * - A draft or cancelled purchase order is never a commitment.
 * - Actual cost = recognised supplier invoices (pre-tax) − applied credits (pre-tax) + approved labour + manual actuals.
 * - Open commitment = for each active order, its pre-tax value not yet invoiced. An order is never counted twice
 *   once its invoice is recorded, and a payment never adds cost: it only reduces the amount owed.
 */
const d=(n:unknown)=>new Decimal(Number(n)||0);
const cents=(n:Decimal)=>round(n.toNumber());
export const UNCATEGORISED='Non catégorisé';

export const responseTotal=(response:BidResponse)=>cents(d(response.subtotal).times(d(100).plus(response.taxRate)).div(100));

/** Rank comparable answers: lowest pre-tax amount first, then shortest delay; rejected answers last. */
export function compareResponses(responses:BidResponse[]){
 const usable=responses.filter(x=>x.status!=='Écartée'&&x.subtotal>0);
 const lowest=usable.length?Math.min(...usable.map(x=>x.subtotal)):0;
 return [...responses].sort((a,b)=>Number(a.status==='Écartée')-Number(b.status==='Écartée')||a.subtotal-b.subtotal||a.delayDays-b.delayDays||a.supplier.localeCompare(b.supplier,'fr')).map(response=>({response,total:responseTotal(response),gap:response.status==='Écartée'||!lowest?0:cents(d(response.subtotal).minus(lowest)),gapPercent:response.status==='Écartée'||!lowest?0:cents(d(response.subtotal).minus(lowest).div(lowest).times(100)),lowest:response.status!=='Écartée'&&response.subtotal===lowest&&lowest>0}));
}

/** Award one answer: the request is marked awarded and a *draft* order is created atomically in the same snapshot. */
export function awardResponse(operations:ProjectOperations,requestId:string,responseId:string,orderId:string):ProjectOperations{
 const request=operations.priceRequests.find(x=>x.id===requestId);
 if(!request)throw new Error('Demande de prix introuvable.');
 if(request.status==='Annulée')throw new Error('Cette demande est annulée.');
 if(request.awardedOrderId&&operations.purchaseOrders.some(x=>x.id===request.awardedOrderId&&x.status!=='Annulé'))throw new Error('Cette demande est déjà attribuée à un bon de commande actif.');
 const response=(request.responses||[]).find(x=>x.id===responseId);
 if(!response)throw new Error('Réponse introuvable.');
 if(response.status==='Écartée')throw new Error('Une réponse écartée ne peut pas être attribuée.');
 if(!response.supplier||response.subtotal<=0)throw new Error('La réponse doit indiquer un fournisseur et un montant avant taxes.');
 const lines=request.lines?.length?scaleLines(request.lines,response.subtotal):[{id:orderId+'-1',description:request.scope,quantity:1,unit:'forfait',price:response.subtotal,received:0}];
 const order:PurchaseOrder={id:orderId,supplier:response.supplier,email:response.email,title:request.scope,amount:responseTotal(response),neededBy:'',status:'Brouillon',reference:'',notes:response.notes,quoteId:request.quoteId,lines,taxRate:response.taxRate,deliveryAddress:request.deliveryAddress,awardedOrderId:'',costCode:request.costCode,phaseId:request.phaseId,sourceRequestId:request.id,sourceResponseId:response.id};
 return {...operations,purchaseOrders:[...operations.purchaseOrders,order],priceRequests:operations.priceRequests.map(x=>x.id!==requestId?x:{...x,status:'Attribuée',awardedOrderId:orderId,awardedResponseId:response.id,supplier:response.supplier,email:response.email,amount:responseTotal(response),responses:(x.responses||[]).map(r=>({...r,status:r.id===response.id?'Retenue':r.status==='Retenue'?'Reçue':r.status}))})};
}
/** Keep the requested quantities but distribute the awarded pre-tax amount across lines (last line absorbs cents). */
function scaleLines(lines:NonNullable<PurchaseOrder['lines']>,subtotal:number){
 const base=lines.reduce((s,l)=>s.plus(d(l.quantity).times(l.price)),d(0));
 let allocated=d(0);
 return lines.map((line,index)=>{
  const amount=index===lines.length-1?d(subtotal).minus(allocated):base.isZero()?d(0):d(subtotal).times(d(line.quantity).times(line.price)).div(base).toDecimalPlaces(2);
  allocated=allocated.plus(amount);
  return {...line,price:line.quantity?amount.div(line.quantity).toDecimalPlaces(4).toNumber():0,received:0};
 });
}

export const orderSubtotal=(order:PurchaseOrder)=>order.lines?.length?cents(order.lines.reduce((s,l)=>s.plus(cents(d(l.quantity).times(l.price))),d(0))):cents(d(order.amount).div(d(100).plus(order.taxRate||0)).times(100));
export const orderReceivedValue=(order:PurchaseOrder)=>cents((order.lines||[]).reduce((s,l)=>s.plus(d(Math.min(l.received,l.quantity)).times(l.price)),d(0)));
export const isCommitment=(order:PurchaseOrder)=>['Envoyé','Partiellement reçu','Reçu'].includes(order.status);
/** Reception status derived from line quantities; draft and cancelled orders keep their status. */
export function receptionStatus(order:PurchaseOrder):PurchaseOrder['status']{
 if(!isCommitment(order))return order.status;
 const lines=order.lines||[];if(!lines.length)return order.status;
 const total=lines.reduce((s,l)=>s+l.quantity,0),received=lines.reduce((s,l)=>s+Math.min(l.received,l.quantity),0);
 return received<=0?'Envoyé':received>=total?'Reçu':'Partiellement reçu';
}
export function receiveOrder(order:PurchaseOrder,received:Record<string,number>):PurchaseOrder{
 if(!isCommitment(order))throw new Error('Envoyez le bon de commande avant d’enregistrer une réception.');
 const lines=(order.lines||[]).map(line=>{const value=received[line.id];if(value===undefined)return line;if(!Number.isFinite(value)||value<0)throw new Error('La quantité reçue doit être positive.');if(value>line.quantity)throw new Error(`Quantité reçue supérieure à la commande pour « ${line.description||'ligne'} ».`);return {...line,received:value}});
 const next={...order,lines};return {...next,status:receptionStatus(next)};
}

export const billTotal=(bill:{subtotal:number;tax:number})=>cents(d(bill.subtotal).plus(bill.tax));
const activeBill=(bill:VendorBill)=>!['Brouillon','Annulée'].includes(bill.status);
const activePayment=(payment:VendorPayment)=>payment.status==='Émis';
const appliedCredit=(credit:VendorCredit)=>credit.status==='Appliqué';

export function billBalance(operations:ProjectOperations,billId:string,ignore:{paymentId?:string;creditId?:string}={}){
 const bill=operations.vendorBills.find(x=>x.id===billId);if(!bill)return 0;
 const paid=operations.vendorPayments.filter(x=>x.billId===billId&&activePayment(x)&&x.id!==ignore.paymentId).reduce((s,x)=>s.plus(x.amount),d(0));
 const credited=operations.vendorCredits.filter(x=>x.billId===billId&&appliedCredit(x)&&x.id!==ignore.creditId).reduce((s,x)=>s.plus(billTotal(x)),d(0));
 return cents(d(billTotal(bill)).minus(paid).minus(credited));
}
/** Status follows money received against the bill; draft and cancelled stay as chosen. */
export function billStatus(operations:ProjectOperations,bill:VendorBill):VendorBill['status']{
 if(!activeBill(bill))return bill.status;
 const balance=billBalance(operations,bill.id);
 return balance<=0?'Payée':balance<billTotal(bill)?'Partiellement payée':'À payer';
}
export function refreshBillStatuses(operations:ProjectOperations):ProjectOperations{return {...operations,vendorBills:operations.vendorBills.map(bill=>({...bill,status:billStatus(operations,bill)}))}}

export function validateBill(operations:ProjectOperations,bill:VendorBill){
 const errors:string[]=[];
 if(!bill.supplier)errors.push('Indiquez le fournisseur.');
 if(!bill.reference)errors.push('Indiquez le numéro de facture du fournisseur.');
 if(!bill.issuedOn)errors.push('Indiquez la date d’émission.');
 if(bill.dueOn&&bill.issuedOn&&bill.dueOn<bill.issuedOn)errors.push('L’échéance précède la date d’émission.');
 if(bill.subtotal<=0)errors.push('Le montant avant taxes doit être supérieur à zéro.');
 if(operations.vendorBills.some(x=>x.id!==bill.id&&x.status!=='Annulée'&&x.supplier.toLowerCase()===bill.supplier.toLowerCase()&&x.reference.toLowerCase()===bill.reference.toLowerCase()))errors.push('Cette facture fournisseur est déjà enregistrée (même fournisseur et même numéro).');
 const order=bill.orderId?operations.purchaseOrders.find(x=>x.id===bill.orderId):undefined;
 if(bill.orderId&&!order)errors.push('Le bon de commande lié est introuvable.');
 if(order&&!isCommitment(order))errors.push('Le bon de commande lié doit être envoyé avant d’y rattacher une facture.');
 const paidOrCredited=operations.vendorPayments.filter(x=>x.billId===bill.id&&activePayment(x)).reduce((s,x)=>s+x.amount,0)+operations.vendorCredits.filter(x=>x.billId===bill.id&&appliedCredit(x)).reduce((s,x)=>s+billTotal(x),0);
 if(round(paidOrCredited)>billTotal(bill))errors.push('Le total est inférieur aux paiements et crédits déjà appliqués.');
 if(bill.status==='Annulée'&&round(paidOrCredited)>0)errors.push('Annulez d’abord les paiements et crédits rattachés.');
 return errors;
}
/** Warn (without blocking) when invoices exceed the pre-tax value of their order. */
export function orderBilling(operations:ProjectOperations,order:PurchaseOrder){
 const billed=cents(operations.vendorBills.filter(x=>x.orderId===order.id&&activeBill(x)).reduce((s,x)=>s.plus(x.subtotal),d(0)));
 const value=orderSubtotal(order);
 return {value,billed,unbilled:cents(Decimal.max(0,d(value).minus(billed))),overBilled:cents(Decimal.max(0,d(billed).minus(value))),received:orderReceivedValue(order)};
}
export function validatePayment(operations:ProjectOperations,payment:VendorPayment){
 const errors:string[]=[];
 const bill=operations.vendorBills.find(x=>x.id===payment.billId);
 if(!bill)errors.push('Choisissez la facture fournisseur payée.');
 else if(!activeBill(bill))errors.push('Une facture brouillon ou annulée ne peut pas être payée.');
 if(!payment.paidOn)errors.push('Indiquez la date du paiement.');
 if(payment.amount<=0)errors.push('Le montant doit être supérieur à zéro.');
 if(bill&&payment.status==='Émis'&&payment.amount>billBalance(operations,bill.id,{paymentId:payment.id}))errors.push(`Le paiement dépasse le solde dû (${money(billBalance(operations,bill.id,{paymentId:payment.id}))}).`);
 if(bill&&payment.supplier&&payment.supplier.toLowerCase()!==bill.supplier.toLowerCase())errors.push('Le fournisseur du paiement diffère de celui de la facture.');
 return errors;
}
export function validateCredit(operations:ProjectOperations,credit:VendorCredit){
 const errors:string[]=[];
 if(!credit.supplier)errors.push('Indiquez le fournisseur.');
 if(!credit.reference)errors.push('Indiquez le numéro du crédit.');
 if(!credit.issuedOn)errors.push('Indiquez la date du crédit.');
 if(credit.subtotal<=0)errors.push('Le montant avant taxes doit être supérieur à zéro.');
 const bill=credit.billId?operations.vendorBills.find(x=>x.id===credit.billId):undefined;
 if(credit.status==='Appliqué'){if(!bill)errors.push('Choisissez la facture à laquelle appliquer le crédit.');else if(!activeBill(bill))errors.push('Le crédit doit s’appliquer à une facture émise.');else if(billTotal(credit)>billBalance(operations,bill.id,{creditId:credit.id}))errors.push('Le crédit dépasse le solde de la facture liée.');}
 if(bill&&bill.supplier.toLowerCase()!==credit.supplier.toLowerCase())errors.push('Le fournisseur du crédit diffère de celui de la facture.');
 return errors;
}

export type BudgetRow={key:string;label:string;original:number;changes:number;revised:number;committed:number;openCommitment:number;billed:number;credits:number;labour:number;manual:number;actual:number;paid:number;payable:number;forecast:number;remaining:number};
/**
 * Budget by cost code. "committed" shows active orders (pre-tax) for information; the forecast adds only the
 * not-yet-invoiced part, so an order and its invoice are never added together.
 */
export function vendorBudget(operations:ProjectOperations):{rows:BudgetRow[];total:BudgetRow}{
 const labelFor=new Map<string,string>();
 const rows=new Map<string,BudgetRow>();
 const row=(code:string)=>{const key=code||UNCATEGORISED;if(!rows.has(key))rows.set(key,{key,label:labelFor.get(key)||key,original:0,changes:0,revised:0,committed:0,openCommitment:0,billed:0,credits:0,labour:0,manual:0,actual:0,paid:0,payable:0,forecast:0,remaining:0});return rows.get(key)!};
 const add=(r:BudgetRow,field:keyof BudgetRow,value:number)=>{(r[field] as number)=cents(d(r[field] as number).plus(value))};
 for(const code of operations.costCodes){const key=code.code||code.name;labelFor.set(key,code.code?`${code.code} · ${code.name}`:code.name);add(row(key),'original',code.budget)}
 for(const line of operations.budget){const key='Poste · '+line.name;labelFor.set(key,line.name);const r=row(key);add(r,'original',line.budget);add(r,'manual',line.actual)}
 for(const change of operations.changeOrders)if(change.status==='Approuvée'&&change.cost)add(row(change.costCode||''),'changes',change.cost||0);
 for(const order of operations.purchaseOrders)if(isCommitment(order)){const r=row(order.costCode||'');const billing=orderBilling(operations,order);add(r,'committed',billing.value);add(r,'openCommitment',billing.unbilled)}
 for(const bill of operations.vendorBills)if(activeBill(bill)){const r=row(bill.costCode||'');add(r,'billed',bill.subtotal);add(r,'payable',billBalance(operations,bill.id))}
 for(const credit of operations.vendorCredits)if(appliedCredit(credit))add(row(credit.costCode||operations.vendorBills.find(x=>x.id===credit.billId)?.costCode||''),'credits',credit.subtotal);
 for(const payment of operations.vendorPayments)if(activePayment(payment))add(row(operations.vendorBills.find(x=>x.id===payment.billId)?.costCode||''),'paid',payment.amount);
 for(const sheet of operations.timesheets)if(sheet.status==='Approuvée')add(row(sheet.costCode||''),'labour',cents(d(sheet.hours).times(sheet.hourlyRate)));
 const list=[...rows.values()].map(r=>{const revised=cents(d(r.original).plus(r.changes));const actual=cents(d(r.billed).minus(r.credits).plus(r.labour).plus(r.manual));const forecast=cents(d(actual).plus(r.openCommitment));return {...r,label:labelFor.get(r.key)||r.label,revised,actual,forecast,remaining:cents(d(revised).minus(forecast))}});
 list.sort((a,b)=>Number(a.key===UNCATEGORISED)-Number(b.key===UNCATEGORISED)||a.label.localeCompare(b.label,'fr'));
 const total=list.reduce<BudgetRow>((t,r)=>{for(const k of ['original','changes','revised','committed','openCommitment','billed','credits','labour','manual','actual','paid','payable','forecast','remaining'] as const)t[k]=cents(d(t[k]).plus(r[k]));return t},{key:'total',label:'Total',original:0,changes:0,revised:0,committed:0,openCommitment:0,billed:0,credits:0,labour:0,manual:0,actual:0,paid:0,payable:0,forecast:0,remaining:0});
 return {rows:list,total};
}

/** Reconciliation checklist: what still needs a human look before closing the supplier side of the job. */
export function reconciliation(operations:ProjectOperations){
 const unreconciled=operations.vendorPayments.filter(x=>activePayment(x)&&!x.reconciled);
 return {
  unreconciledCount:unreconciled.length,
  unreconciledAmount:cents(unreconciled.reduce((s,x)=>s.plus(x.amount),d(0))),
  billsWithoutAttachment:operations.vendorBills.filter(x=>activeBill(x)&&!x.attachment.trim()).map(x=>x.id),
  billsWithoutOrder:operations.vendorBills.filter(x=>activeBill(x)&&!x.orderId).map(x=>x.id),
  overBilledOrders:operations.purchaseOrders.filter(x=>isCommitment(x)&&orderBilling(operations,x).overBilled>0).map(x=>x.id),
  receivedNotBilled:operations.purchaseOrders.filter(x=>isCommitment(x)&&orderReceivedValue(x)>orderBilling(operations,x).billed).map(x=>x.id),
  overdueBills:operations.vendorBills.filter(x=>activeBill(x)&&x.dueOn&&x.dueOn<new Date().toISOString().slice(0,10)&&billBalance(operations,x.id)>0).map(x=>x.id)
 };
}

/** Whole-ledger check run by the server on every project save (the UI checks each form before). */
export function vendorLedgerErrors(operations:ProjectOperations){
 const errors=new Set<string>();
 for(const bill of operations.vendorBills)for(const error of validateBill(operations,bill))errors.add(`Facture ${bill.reference||bill.id} : ${error}`);
 for(const payment of operations.vendorPayments)if(payment.status==='Émis'){const bill=operations.vendorBills.find(x=>x.id===payment.billId);if(!bill||!activeBill(bill))errors.add(`Paiement ${payment.reference||payment.id} : facture fournisseur absente, brouillon ou annulée.`)}
 for(const credit of operations.vendorCredits)if(credit.status==='Appliqué'){const bill=operations.vendorBills.find(x=>x.id===credit.billId);if(!bill||!activeBill(bill))errors.add(`Crédit ${credit.reference||credit.id} : facture liée absente, brouillon ou annulée.`)}
 for(const bill of operations.vendorBills)if(activeBill(bill)&&billBalance(operations,bill.id)<0)errors.add(`Facture ${bill.reference||bill.id} : paiements et crédits supérieurs au total.`);
 return [...errors];
}

export type LedgerFamily='Dépense'|'Facture fournisseur'|'Crédit fournisseur'|'Paiement fournisseur'|'Bon de commande';
export type LedgerRow={id:string;family:LedgerFamily;projectId:string|null;reference:string;supplier:string;description:string;date:string;dueOn:string;costCode:string;subtotal:number;tax:number;total:number;balance:number;status:string;attachment:string;sourceId:string};
type ProjectLike={id:string;data:{operations?:unknown}};
type ExpenseLike={id:string;project_id:string|null;data:Record<string,any>};
/**
 * Company-wide supplier ledger (Billdr "Dépenses" families). Families stay separate: the "cost" total adds
 * expenses and recognised supplier invoices minus applied credits, never payments nor purchase orders.
 */
export function supplierLedger(projects:ProjectLike[],expenses:ExpenseLike[],operationsOf:(value:unknown)=>ProjectOperations):LedgerRow[]{
 const rows:LedgerRow[]=[];
 for(const e of expenses){const net=Number(e.data.net||0),tax=Number(e.data.tps||0)+Number(e.data.tvq||0);rows.push({id:'e:'+e.id,family:'Dépense',projectId:e.project_id,reference:String(e.data.reference||e.data.number||''),supplier:String(e.data.supplier||''),description:String(e.data.title||e.data.category||''),date:String(e.data.date||''),dueOn:'',costCode:String(e.data.cost_code||e.data.category||''),subtotal:round(net),tax:round(tax),total:round(net+tax),balance:e.data.status==='Payée'?0:round(net+tax),status:String(e.data.status||''),attachment:String(e.data.receipt||e.data.attachment||''),sourceId:e.id})}
 for(const p of projects){const ops=operationsOf(p.data.operations);
  for(const b of ops.vendorBills)rows.push({id:'b:'+p.id+':'+b.id,family:'Facture fournisseur',projectId:p.id,reference:b.reference,supplier:b.supplier,description:ops.purchaseOrders.find(o=>o.id===b.orderId)?.title||b.notes,date:b.issuedOn,dueOn:b.dueOn,costCode:b.costCode,subtotal:b.subtotal,tax:b.tax,total:billTotal(b),balance:['Brouillon','Annulée'].includes(b.status)?0:billBalance(ops,b.id),status:b.status,attachment:b.attachment,sourceId:b.id});
  for(const c of ops.vendorCredits)rows.push({id:'c:'+p.id+':'+c.id,family:'Crédit fournisseur',projectId:p.id,reference:c.reference,supplier:c.supplier,description:c.notes,date:c.issuedOn,dueOn:'',costCode:c.costCode,subtotal:-c.subtotal,tax:-c.tax,total:-billTotal(c),balance:0,status:c.status,attachment:'',sourceId:c.id});
  for(const pay of ops.vendorPayments)rows.push({id:'p:'+p.id+':'+pay.id,family:'Paiement fournisseur',projectId:p.id,reference:pay.reference,supplier:pay.supplier,description:`${pay.method} · facture ${ops.vendorBills.find(b=>b.id===pay.billId)?.reference||'?'}`,date:pay.paidOn,dueOn:'',costCode:'',subtotal:pay.amount,tax:0,total:pay.amount,balance:0,status:pay.status+(pay.reconciled?' · rapproché':''),attachment:'',sourceId:pay.id});
  for(const o of ops.purchaseOrders){const billing=orderBilling(ops,o);rows.push({id:'o:'+p.id+':'+o.id,family:'Bon de commande',projectId:p.id,reference:o.reference||'',supplier:o.supplier,description:o.title,date:o.neededBy,dueOn:'',costCode:o.costCode||'',subtotal:billing.value,tax:round(o.amount-billing.value),total:o.amount,balance:billing.unbilled,status:o.status,attachment:'',sourceId:o.id})}
 }
 return rows.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
/** Cost total of a ledger selection: expenses + recognised invoices − applied credits (pre-tax and with taxes). */
export function ledgerCost(rows:LedgerRow[]){
 const counted=rows.filter(r=>(r.family==='Dépense')||(r.family==='Facture fournisseur'&&!['Brouillon','Annulée'].includes(r.status))||(r.family==='Crédit fournisseur'&&r.status==='Appliqué'));
 return {subtotal:cents(counted.reduce((s,r)=>s.plus(r.subtotal),d(0))),tax:cents(counted.reduce((s,r)=>s.plus(r.tax),d(0))),total:cents(counted.reduce((s,r)=>s.plus(r.total),d(0))),payable:cents(rows.filter(r=>r.family==='Facture fournisseur'||r.family==='Dépense').reduce((s,r)=>s.plus(r.balance),d(0)))};
}
