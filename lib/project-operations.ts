import {round} from './model';

export type BudgetLine={id:string;name:string;budget:number;actual:number};
export type CostCode={id:string;code:string;name:string;budget:number};
export type ProcurementLine={id:string;description:string;quantity:number;unit:string;price:number;received:number};
export type ProcurementDetails={email?:string;reference?:string;notes?:string;quoteId?:string;lines?:ProcurementLine[];taxRate?:number;deliveryAddress?:string;awardedOrderId?:string;costCode?:string;phaseId?:string};
/** One supplier answer to a price request. Several answers can be compared before awarding one. */
export type BidResponse={id:string;supplier:string;email:string;subtotal:number;taxRate:number;receivedOn:string;validUntil:string;delayDays:number;notes:string;status:'Reçue'|'Retenue'|'Écartée'};
export type PriceRequest=ProcurementDetails&{id:string;supplier:string;scope:string;dueOn:string;status:'Brouillon'|'Envoyée'|'Réponse reçue'|'Attribuée'|'Annulée';amount:number;responses?:BidResponse[];awardedResponseId?:string};
export const purchaseOrderStatuses=['Brouillon','Envoyé','Partiellement reçu','Reçu','Annulé'] as const;
export type PurchaseOrder=ProcurementDetails&{id:string;supplier:string;title:string;amount:number;neededBy:string;status:typeof purchaseOrderStatuses[number];sourceRequestId?:string;sourceResponseId?:string};
export type ChangeOrder={id:string;title:string;amount:number;days:number;status:'Brouillon'|'À approuver'|'Approuvée'|'Refusée';cost?:number;costCode?:string};
export type DailyLog={id:string;date:string;summary:string;blockers:string;sharedWithClient?:boolean};
export type Timesheet={id:string;date:string;person:string;hours:number;hourlyRate:number;status:'Brouillon'|'Soumise'|'Approuvée';costCode?:string;closed?:boolean;start?:string;end?:string;personId?:string;note?:string};
export const vendorBillStatuses=['Brouillon','À payer','Partiellement payée','Payée','Annulée'] as const;
/** Supplier invoice. Amounts are entered as printed on the supplier document (subtotal + taxes). */
export type VendorBill={id:string;reference:string;supplier:string;orderId:string;costCode:string;phaseId:string;issuedOn:string;dueOn:string;subtotal:number;tax:number;status:typeof vendorBillStatuses[number];attachment:string;notes:string};
export type VendorCredit={id:string;reference:string;supplier:string;billId:string;costCode:string;issuedOn:string;subtotal:number;tax:number;status:'Brouillon'|'Appliqué'|'Annulé';notes:string};
export type VendorPayment={id:string;reference:string;supplier:string;billId:string;paidOn:string;method:string;amount:number;status:'Émis'|'Annulé';reconciled:boolean;reconciledOn:string;notes:string};
export function timesheetsForDates(sheets:Timesheet[],dates:string[],person?:string){
 const selected=new Set(dates);
 return sheets.filter(sheet=>selected.has(sheet.date)&&(person===undefined||sheet.person===person));
}
export function approveTimesheets(sheets:Timesheet[],dates:string[],person:string):Timesheet[]{
 const selected=new Set(dates);
 return sheets.map(sheet=>selected.has(sheet.date)&&sheet.person===person&&!sheet.closed?{...sheet,status:'Approuvée'}:sheet);
}
/** Close a week: only approved entries are locked; anything still pending blocks the closing. */
export function closeWeek(sheets:Timesheet[],dates:string[]):Timesheet[]{
 const selected=new Set(dates);
 const pending=sheets.filter(s=>selected.has(s.date)&&s.status!=='Approuvée');
 if(pending.length)throw new Error(`${pending.length} saisie(s) de la semaine ne sont pas approuvées.`);
 return sheets.map(s=>selected.has(s.date)?{...s,closed:true}:s);
}
/** Hours between two HH:MM times minus a break, in hours with two decimals; rejects negative or > 24 h. */
export function shiftHours(start:string,end:string,breakMinutes=0){
 const m=(v:string)=>{const [h,mi]=v.split(':').map(Number);return h*60+mi};
 if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end))throw new Error('Heures de début et de fin requises.');
 const minutes=m(end)-m(start)-Math.max(0,breakMinutes);
 if(minutes<=0)throw new Error('La fin doit être après le début (pause déduite).');
 return Math.round(minutes/60*100)/100;
}
/** Approved hours and cost grouped by cost code (the "by category" view shows approved shifts only). */
export function hoursByCategory(sheets:Timesheet[],dates:string[]){
 const selected=new Set(dates);const rows=new Map<string,{hours:number;cost:number}>();
 for(const s of sheets)if(selected.has(s.date)&&s.status==='Approuvée'){const key=s.costCode||'Non catégorisé';const r=rows.get(key)||{hours:0,cost:0};r.hours=round(r.hours+s.hours);r.cost=round(r.cost+s.hours*s.hourlyRate);rows.set(key,r)}
 return [...rows.entries()].map(([code,v])=>({code,...v})).sort((a,b)=>Number(a.code==='Non catégorisé')-Number(b.code==='Non catégorisé')||a.code.localeCompare(b.code,'fr'));
}
export type ProjectOperations={budget:BudgetLine[];costCodes:CostCode[];priceRequests:PriceRequest[];purchaseOrders:PurchaseOrder[];changeOrders:ChangeOrder[];dailyLogs:DailyLog[];timesheets:Timesheet[];vendorBills:VendorBill[];vendorCredits:VendorCredit[];vendorPayments:VendorPayment[]};

export const emptyOperations=():ProjectOperations=>({budget:[],costCodes:[],priceRequests:[],purchaseOrders:[],changeOrders:[],dailyLogs:[],timesheets:[],vendorBills:[],vendorCredits:[],vendorPayments:[]});
const num=(value:unknown)=>Math.max(0,Number(value)||0);
const text=(value:unknown)=>String(value??'');
const day=(value:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';
const pick=<T extends string>(value:unknown,allowed:readonly T[],fallback:T):T=>allowed.includes(value as T)?value as T:fallback;
function details(value:ProcurementDetails):ProcurementDetails{return {email:text(value.email),reference:text(value.reference),notes:text(value.notes),quoteId:text(value.quoteId),taxRate:num(value.taxRate),deliveryAddress:text(value.deliveryAddress),awardedOrderId:text(value.awardedOrderId),costCode:text(value.costCode),phaseId:text(value.phaseId),lines:Array.isArray(value.lines)?value.lines.map(x=>({id:String(x.id),description:text(x.description),quantity:num(x.quantity),unit:String(x.unit||'unité'),price:num(x.price),received:Math.min(num(x.quantity),num(x.received))})):[]}}
export function procurementAmount(lines:ProcurementLine[],taxRate=0){return round(lines.reduce((sum,line)=>sum+round(line.quantity*line.price),0)*(1+Math.max(0,taxRate)/100))}
function responsesFrom(value:unknown):BidResponse[]{return Array.isArray(value)?value.filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id),supplier:text(x.supplier).trim(),email:text(x.email).trim(),subtotal:num(x.subtotal),taxRate:num(x.taxRate),receivedOn:day(x.receivedOn),validUntil:day(x.validUntil),delayDays:Math.floor(num(x.delayDays)),notes:text(x.notes),status:pick(x.status,['Reçue','Retenue','Écartée'] as const,'Reçue')})):[]}
export function operationsFrom(value:unknown):ProjectOperations{
 const source=value&&typeof value==='object'?value as Partial<Record<keyof ProjectOperations,any[]>>:{};
 const list=(key:keyof ProjectOperations)=>Array.isArray(source[key])?source[key] as any[]:[];
 return {
  budget:list('budget').map(line=>({id:String(line.id),name:String(line.name||'Poste'),budget:num(line.budget),actual:num(line.actual)})),
  costCodes:list('costCodes').map(code=>({id:String(code.id),code:text(code.code),name:String(code.name||'Poste'),budget:num(code.budget)})),
  priceRequests:list('priceRequests').map(request=>({...details(request),id:String(request.id),supplier:text(request.supplier),scope:text(request.scope),dueOn:text(request.dueOn),status:pick(request.status,['Brouillon','Envoyée','Réponse reçue','Attribuée','Annulée'] as const,'Brouillon'),amount:num(request.amount),responses:responsesFrom(request.responses),awardedResponseId:text(request.awardedResponseId)})),
  purchaseOrders:list('purchaseOrders').map(order=>({...details(order),id:String(order.id),supplier:text(order.supplier),title:text(order.title),amount:num(order.amount),neededBy:text(order.neededBy),status:pick(order.status,purchaseOrderStatuses,'Brouillon'),sourceRequestId:text(order.sourceRequestId),sourceResponseId:text(order.sourceResponseId)})),
  changeOrders:list('changeOrders').map(change=>({id:String(change.id),title:text(change.title),amount:num(change.amount),days:num(change.days),status:pick(change.status,['Brouillon','À approuver','Approuvée','Refusée'] as const,'Brouillon'),cost:num(change.cost),costCode:text(change.costCode)})),
  dailyLogs:list('dailyLogs').map(log=>({id:String(log.id),date:text(log.date),summary:text(log.summary),blockers:text(log.blockers),sharedWithClient:log.sharedWithClient===true})),
  timesheets:list('timesheets').map(sheet=>({id:String(sheet.id),date:text(sheet.date),person:text(sheet.person),hours:num(sheet.hours),hourlyRate:num(sheet.hourlyRate),status:pick(sheet.status,['Brouillon','Soumise','Approuvée'] as const,'Brouillon'),costCode:text(sheet.costCode),...(sheet.closed===true?{closed:true}:{}),...(/^\d{2}:\d{2}$/.test(String(sheet.start))?{start:String(sheet.start)}:{}),...(/^\d{2}:\d{2}$/.test(String(sheet.end))?{end:String(sheet.end)}:{}),...(sheet.personId?{personId:text(sheet.personId)}:{}),...(sheet.note?{note:text(sheet.note).slice(0,500)}:{})})),
  vendorBills:list('vendorBills').map(bill=>({id:String(bill.id),reference:text(bill.reference).trim(),supplier:text(bill.supplier).trim(),orderId:text(bill.orderId),costCode:text(bill.costCode),phaseId:text(bill.phaseId),issuedOn:day(bill.issuedOn),dueOn:day(bill.dueOn),subtotal:num(bill.subtotal),tax:num(bill.tax),status:pick(bill.status,vendorBillStatuses,'Brouillon'),attachment:text(bill.attachment),notes:text(bill.notes)})),
  vendorCredits:list('vendorCredits').map(credit=>({id:String(credit.id),reference:text(credit.reference).trim(),supplier:text(credit.supplier).trim(),billId:text(credit.billId),costCode:text(credit.costCode),issuedOn:day(credit.issuedOn),subtotal:num(credit.subtotal),tax:num(credit.tax),status:pick(credit.status,['Brouillon','Appliqué','Annulé'] as const,'Brouillon'),notes:text(credit.notes)})),
  vendorPayments:list('vendorPayments').map(payment=>({id:String(payment.id),reference:text(payment.reference).trim(),supplier:text(payment.supplier).trim(),billId:text(payment.billId),paidOn:day(payment.paidOn),method:text(payment.method)||'Virement',amount:num(payment.amount),status:pick(payment.status,['Émis','Annulé'] as const,'Émis'),reconciled:payment.reconciled===true,reconciledOn:day(payment.reconciledOn),notes:text(payment.notes)}))
 };
}
export function operationTotals(value:ProjectOperations){
 const planned=round(value.budget.reduce((sum,line)=>sum+line.budget,0));
 const actual=round(value.budget.reduce((sum,line)=>sum+line.actual,0));
 const committed=round(value.purchaseOrders.filter(order=>['Envoyé','Partiellement reçu','Reçu'].includes(order.status)).reduce((sum,order)=>sum+order.amount,0));
 const requested=round(value.priceRequests.filter(request=>!['Annulée','Attribuée'].includes(request.status)).reduce((sum,request)=>sum+request.amount,0));
 const approvedChanges=round(value.changeOrders.filter(change=>change.status==='Approuvée').reduce((sum,change)=>sum+change.amount,0));
 const hours=round(value.timesheets.reduce((sum,sheet)=>sum+sheet.hours,0));
 return {planned,actual,committed,requested,approvedChanges,hours,remaining:round(planned-actual-committed)};
}
