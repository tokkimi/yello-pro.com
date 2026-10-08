'use client';

import {useState} from 'react';
import {Check,Download,Plus} from 'lucide-react';
import {money} from '@/lib/model';
import {purchaseOrderStatuses,type BidResponse,type ProjectOperations,type PurchaseOrder,type VendorBill,type VendorCredit,type VendorPayment} from '@/lib/project-operations';
import {awardResponse,billBalance,billTotal,compareResponses,orderBilling,receiveOrder,reconciliation,refreshBillStatuses,validateBill,validateCredit,validatePayment,vendorBudget,UNCATEGORISED} from '@/lib/vendor-finance';

type Commit=(next:ProjectOperations)=>Promise<void>|void;
type Shared={operations:ProjectOperations;commit:Commit;phases:{id:string;title:string}[];suppliers:{name:string;email?:string}[]};
const uid=()=>crypto.randomUUID();
const today=()=>new Date().toISOString().slice(0,10);
const views=['Réponses','Bons de commande','Factures fournisseur','Crédits','Paiements','Rapprochement'] as const;
type View=typeof views[number];
const codeKey=(code:{code:string;name:string})=>code.code||code.name;

function CostCodeSelect({operations,value,onChange}:{operations:ProjectOperations;value:string;onChange:(value:string)=>void}){
 return <label>Code de coût<select value={value} onChange={e=>onChange(e.target.value)}><option value="">{UNCATEGORISED}</option>{operations.costCodes.map(code=><option key={code.id} value={codeKey(code)}>{code.code?`${code.code} · ${code.name}`:code.name}</option>)}</select></label>;
}
function PhaseSelect({phases,value,onChange}:{phases:Shared['phases'];value:string;onChange:(value:string)=>void}){
 if(!phases.length)return null;
 return <label>Phase<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Aucune phase</option>{phases.map(phase=><option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></label>;
}
function Errors({errors}:{errors:string[]}){return errors.length?<ul className="error vendor-errors" role="alert">{errors.map(x=><li key={x}>{x}</li>)}</ul>:null}

/** Supplier side of a project: answers, orders, reception, invoices, credits, payments and reconciliation. */
export default function VendorFinance(props:Shared){
 const [view,setView]=useState<View>('Réponses');
 const counts:Record<View,number>={'Réponses':props.operations.priceRequests.length,'Bons de commande':props.operations.purchaseOrders.length,'Factures fournisseur':props.operations.vendorBills.length,'Crédits':props.operations.vendorCredits.length,'Paiements':props.operations.vendorPayments.length,'Rapprochement':reconciliation(props.operations).unreconciledCount};
 return <section className="vendor-finance" aria-label="Chaîne fournisseur">
  <div className="vendor-tabs" role="tablist" aria-label="Étapes fournisseur">{views.map(name=><button key={name} role="tab" aria-selected={view===name} className={view===name?'active':''} onClick={()=>setView(name)}>{name}<span>{counts[name]}</span></button>)}</div>
  <div role="tabpanel" aria-label={view}>
   {view==='Réponses'&&<Responses {...props}/>}
   {view==='Bons de commande'&&<Orders {...props}/>}
   {view==='Factures fournisseur'&&<Bills {...props}/>}
   {view==='Crédits'&&<Credits {...props}/>}
   {view==='Paiements'&&<Payments {...props}/>}
   {view==='Rapprochement'&&<Reconciliation {...props}/>}
  </div>
 </section>;
}

function Responses({operations,commit}:Shared){
 const [open,setOpen]=useState(''),[draft,setDraft]=useState<BidResponse|null>(null),[errors,setErrors]=useState<string[]>([]);
 const requests=operations.priceRequests.filter(x=>x.status!=='Annulée');
 function saveResponse(requestId:string){
  if(!draft)return;const problems=[!draft.supplier.trim()&&'Indiquez le fournisseur.',draft.subtotal<=0&&'Indiquez le montant avant taxes.',draft.validUntil&&draft.receivedOn&&draft.validUntil<draft.receivedOn&&'La validité précède la date de réception.'].filter(Boolean) as string[];
  setErrors(problems);if(problems.length)return;
  void commit({...operations,priceRequests:operations.priceRequests.map(x=>x.id!==requestId?x:{...x,status:x.status==='Attribuée'?x.status:'Réponse reçue',responses:[...(x.responses||[]).filter(r=>r.id!==draft.id),{...draft,supplier:draft.supplier.trim()}]})});
  setDraft(null);
 }
 function award(requestId:string,responseId:string){try{setErrors([]);void commit(awardResponse(operations,requestId,responseId,uid()))}catch(error){setErrors([(error as Error).message])}}
 if(!requests.length)return <p className="muted">Créez une demande de prix pour consigner les réponses de plusieurs fournisseurs et les comparer.</p>;
 return <div className="vendor-stack"><Errors errors={errors}/>{requests.map(request=>{const ranked=compareResponses(request.responses||[]);return <article className="vendor-card" key={request.id}>
  <header><div><h4>{request.scope||'Demande de prix'}</h4><small>{request.status} · {(request.responses||[]).length} réponse(s){request.costCode?` · code ${request.costCode}`:''}</small></div><button className="btn secondary" aria-expanded={open===request.id} onClick={()=>{setOpen(open===request.id?'':request.id);setDraft(null);setErrors([])}}>{open===request.id?'Fermer':'Comparer'}</button></header>
  {open===request.id&&<>
   {ranked.length>0?<div className="vendor-table" role="region" aria-label="Comparaison des réponses" tabIndex={0}><table><thead><tr><th>Fournisseur</th><th>Avant taxes</th><th>Total</th><th>Écart</th><th>Délai</th><th>Validité</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{ranked.map(({response,total,gap,gapPercent,lowest})=><tr key={response.id} className={lowest?'lowest':''}><td>{response.supplier}{lowest&&<small> · plus bas</small>}</td><td>{money(response.subtotal)}</td><td>{money(total)}</td><td>{gap?`+${money(gap)} (${gapPercent.toLocaleString('fr-CA')} %)`:'—'}</td><td>{response.delayDays?`${response.delayDays} j`:'—'}</td><td>{response.validUntil||'—'}</td><td>{response.status}</td><td className="vendor-actions">{request.status!=='Attribuée'&&response.status!=='Écartée'&&<button className="btn primary" onClick={()=>award(request.id,response.id)}>Attribuer</button>}{request.status!=='Attribuée'&&<button className="btn ghost" onClick={()=>void commit({...operations,priceRequests:operations.priceRequests.map(x=>x.id!==request.id?x:{...x,responses:(x.responses||[]).map(r=>r.id===response.id?{...r,status:r.status==='Écartée'?'Reçue':'Écartée'}:r)})})}>{response.status==='Écartée'?'Rétablir':'Écarter'}</button>}{request.status!=='Attribuée'&&<button className="btn ghost" onClick={()=>{setDraft(structuredClone(response));setErrors([])}}>Modifier</button>}</td></tr>)}</tbody></table></div>:<p className="muted">Aucune réponse consignée.</p>}
   {request.status==='Attribuée'?<p className="muted">Attribuée à {request.supplier}. Un bon de commande brouillon a été créé ; il n’engage le budget qu’une fois envoyé.</p>:draft?<form className="vendor-form" onSubmit={e=>{e.preventDefault();saveResponse(request.id)}}>
    <label>Fournisseur<input required value={draft.supplier} onChange={e=>setDraft({...draft,supplier:e.target.value})}/></label>
    <label>Courriel<input type="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
    <label>Montant avant taxes ($)<input required type="number" min="0.01" step="0.01" value={draft.subtotal||''} onChange={e=>setDraft({...draft,subtotal:Number(e.target.value)})}/></label>
    <label>Taxes (%)<input type="number" min="0" step="0.001" value={draft.taxRate} onChange={e=>setDraft({...draft,taxRate:Number(e.target.value)})}/></label>
    <label>Reçue le<input type="date" value={draft.receivedOn} onChange={e=>setDraft({...draft,receivedOn:e.target.value})}/></label>
    <label>Valide jusqu’au<input type="date" value={draft.validUntil} onChange={e=>setDraft({...draft,validUntil:e.target.value})}/></label>
    <label>Délai (jours)<input type="number" min="0" step="1" value={draft.delayDays} onChange={e=>setDraft({...draft,delayDays:Number(e.target.value)})}/></label>
    <label className="wide">Conditions / exclusions<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
    <div className="module-actions wide"><button className="btn primary"><Check size={16}/>Enregistrer la réponse</button><button type="button" className="btn ghost" onClick={()=>{setDraft(null);setErrors([])}}>Annuler</button></div>
   </form>:<button className="btn secondary" onClick={()=>setDraft({id:uid(),supplier:'',email:'',subtotal:0,taxRate:14.975,receivedOn:today(),validUntil:'',delayDays:0,notes:'',status:'Reçue'})}><Plus size={16}/>Consigner une réponse</button>}
  </>}
 </article>})}</div>;
}

function Orders({operations,commit,phases}:Shared){
 const [receiving,setReceiving]=useState<{id:string;values:Record<string,number>}|null>(null),[errors,setErrors]=useState<string[]>([]);
 const patch=(order:PurchaseOrder)=>void commit({...operations,purchaseOrders:operations.purchaseOrders.map(x=>x.id===order.id?order:x)});
 if(!operations.purchaseOrders.length)return <p className="muted">Aucun bon de commande. Attribuez une réponse ou créez un bon depuis le formulaire ci-dessus.</p>;
 return <div className="vendor-stack"><Errors errors={errors}/>{operations.purchaseOrders.map(order=>{const billing=orderBilling(operations,order);return <article className="vendor-card" key={order.id}>
  <header><div><h4>{order.title||'Bon de commande'}</h4><small>{order.supplier} · {order.status}{order.sourceRequestId?' · issu d’une demande de prix':''}</small></div><strong>{money(order.amount)}</strong></header>
  <dl className="vendor-figures"><div><dt>Valeur avant taxes</dt><dd>{money(billing.value)}</dd></div><div><dt>Reçu</dt><dd>{money(billing.received)}</dd></div><div><dt>Facturé</dt><dd>{money(billing.billed)}</dd></div><div><dt>Engagé non facturé</dt><dd>{order.status==='Brouillon'||order.status==='Annulé'?'Non engagé':money(billing.unbilled)}</dd></div></dl>
  {billing.overBilled>0&&<p className="error">Facturation supérieure de {money(billing.overBilled)} au bon de commande. Vérifiez avec le fournisseur.</p>}
  <div className="vendor-form compact"><label>Statut<select value={order.status} onChange={e=>{const status=e.target.value as PurchaseOrder['status'];if(status==='Annulé'&&billing.billed>0){setErrors(['Ce bon a déjà des factures : annulez-les avant le bon.']);return}setErrors([]);patch({...order,status})}}>{purchaseOrderStatuses.map(x=><option key={x}>{x}</option>)}</select></label><CostCodeSelect operations={operations} value={order.costCode||''} onChange={costCode=>patch({...order,costCode})}/><PhaseSelect phases={phases} value={order.phaseId||''} onChange={phaseId=>patch({...order,phaseId})}/></div>
  {(order.lines||[]).length>0&&['Envoyé','Partiellement reçu','Reçu'].includes(order.status)&&(receiving?.id===order.id?<form className="vendor-receive" onSubmit={e=>{e.preventDefault();try{patch(receiveOrder(order,receiving.values));setReceiving(null);setErrors([])}catch(error){setErrors([(error as Error).message])}}}>{(order.lines||[]).map(line=><label key={line.id}>{line.description||'Ligne'} <small>commandé {line.quantity} {line.unit}</small><input type="number" min="0" max={line.quantity} step="0.01" value={receiving.values[line.id]??line.received} onChange={e=>setReceiving({...receiving,values:{...receiving.values,[line.id]:Number(e.target.value)}})}/></label>)}<div className="module-actions"><button className="btn primary">Enregistrer la réception</button><button type="button" className="btn ghost" onClick={()=>setReceiving(null)}>Annuler</button></div></form>:<button className="btn secondary" onClick={()=>setReceiving({id:order.id,values:{}})}>Enregistrer une réception</button>)}
 </article>})}</div>;
}

const emptyBill=():VendorBill=>({id:uid(),reference:'',supplier:'',orderId:'',costCode:'',phaseId:'',issuedOn:today(),dueOn:'',subtotal:0,tax:0,status:'À payer',attachment:'',notes:''});
function Bills({operations,commit,phases,suppliers}:Shared){
 const [draft,setDraft]=useState<VendorBill|null>(null),[errors,setErrors]=useState<string[]>([]);
 const orders=operations.purchaseOrders.filter(x=>['Envoyé','Partiellement reçu','Reçu'].includes(x.status));
 function save(){if(!draft)return;const bill={...draft,reference:draft.reference.trim(),supplier:draft.supplier.trim()};const problems=validateBill(operations,bill);setErrors(problems);if(problems.length)return;void commit(refreshBillStatuses({...operations,vendorBills:[bill,...operations.vendorBills.filter(x=>x.id!==bill.id)]}));setDraft(null)}
 return <div className="vendor-stack">
  {draft?<form className="vendor-form" onSubmit={e=>{e.preventDefault();save()}} aria-label="Facture fournisseur">
   <label>Bon de commande lié<select value={draft.orderId} onChange={e=>{const order=orders.find(x=>x.id===e.target.value);setDraft({...draft,orderId:e.target.value,...(order?{supplier:order.supplier,costCode:order.costCode||'',phaseId:order.phaseId||''}:{})})}}><option value="">Aucun (facture directe)</option>{orders.map(x=><option key={x.id} value={x.id}>{x.title} · {x.supplier}</option>)}</select></label>
   <label>Fournisseur<input required list="vendor-suppliers" value={draft.supplier} onChange={e=>setDraft({...draft,supplier:e.target.value})}/></label>
   <label>N° de facture fournisseur<input required value={draft.reference} onChange={e=>setDraft({...draft,reference:e.target.value})}/></label>
   <label>Émise le<input required type="date" value={draft.issuedOn} onChange={e=>setDraft({...draft,issuedOn:e.target.value})}/></label>
   <label>Échéance<input type="date" value={draft.dueOn} onChange={e=>setDraft({...draft,dueOn:e.target.value})}/></label>
   <label>Avant taxes ($)<input required type="number" min="0.01" step="0.01" value={draft.subtotal||''} onChange={e=>setDraft({...draft,subtotal:Number(e.target.value)})}/></label>
   <label>Taxes ($)<input type="number" min="0" step="0.01" value={draft.tax||''} onChange={e=>setDraft({...draft,tax:Number(e.target.value)})}/></label>
   <label>Statut<select value={draft.status==='Brouillon'||draft.status==='Annulée'?draft.status:'À payer'} onChange={e=>setDraft({...draft,status:e.target.value as VendorBill['status']})}><option value="Brouillon">Brouillon (non comptabilisée)</option><option value="À payer">Reconnue — à payer</option><option value="Annulée">Annulée</option></select></label>
   <CostCodeSelect operations={operations} value={draft.costCode} onChange={costCode=>setDraft({...draft,costCode})}/>
   <PhaseSelect phases={phases} value={draft.phaseId} onChange={phaseId=>setDraft({...draft,phaseId})}/>
   <label className="wide">Justificatif (nom du fichier déposé dans Fichiers ou lien)<input value={draft.attachment} onChange={e=>setDraft({...draft,attachment:e.target.value})} placeholder="Ex. facture-F-100.pdf"/></label>
   <label className="wide">Notes internes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
   <p className="wide">Total : <b>{money(billTotal(draft))}</b></p>
   <Errors errors={errors}/>
   <div className="module-actions wide"><button className="btn primary"><Check size={16}/>Enregistrer</button><button type="button" className="btn ghost" onClick={()=>{setDraft(null);setErrors([])}}>Annuler</button></div>
  </form>:<button className="btn primary" onClick={()=>{setDraft(emptyBill());setErrors([])}}><Plus size={16}/>Ajouter une facture fournisseur</button>}
  <datalist id="vendor-suppliers">{suppliers.map((x,i)=><option key={i} value={x.name}>{x.email}</option>)}</datalist>
  <Table head={['N°','Fournisseur','Bon','Code','Émise','Échéance','Avant taxes','Taxes','Total','Solde','Statut','']} rows={operations.vendorBills.map(bill=>[bill.reference,bill.supplier,operations.purchaseOrders.find(x=>x.id===bill.orderId)?.title||'—',bill.costCode||UNCATEGORISED,bill.issuedOn,bill.dueOn||'—',money(bill.subtotal),money(bill.tax),money(billTotal(bill)),money(['Brouillon','Annulée'].includes(bill.status)?0:billBalance(operations,bill.id)),bill.status,<button key="e" className="btn ghost" onClick={()=>{setDraft(structuredClone(bill));setErrors([])}}>Modifier</button>])} empty="Aucune facture fournisseur."/>
 </div>;
}

function Credits({operations,commit,suppliers}:Shared){
 const [draft,setDraft]=useState<VendorCredit|null>(null),[errors,setErrors]=useState<string[]>([]);
 const bills=operations.vendorBills.filter(x=>!['Brouillon','Annulée'].includes(x.status));
 function save(){if(!draft)return;const credit={...draft,reference:draft.reference.trim(),supplier:draft.supplier.trim()};const problems=validateCredit(operations,credit);setErrors(problems);if(problems.length)return;void commit(refreshBillStatuses({...operations,vendorCredits:[credit,...operations.vendorCredits.filter(x=>x.id!==credit.id)]}));setDraft(null)}
 return <div className="vendor-stack">
  {draft?<form className="vendor-form" onSubmit={e=>{e.preventDefault();save()}} aria-label="Crédit fournisseur">
   <label>Facture liée<select value={draft.billId} onChange={e=>{const bill=bills.find(x=>x.id===e.target.value);setDraft({...draft,billId:e.target.value,...(bill?{supplier:bill.supplier,costCode:bill.costCode}:{})})}}><option value="">Aucune (crédit en attente)</option>{bills.map(x=><option key={x.id} value={x.id}>{x.reference} · {x.supplier} · solde {money(billBalance(operations,x.id,{creditId:draft.id}))}</option>)}</select></label>
   <label>Fournisseur<input required list="vendor-suppliers" value={draft.supplier} onChange={e=>setDraft({...draft,supplier:e.target.value})}/></label>
   <label>N° du crédit<input required value={draft.reference} onChange={e=>setDraft({...draft,reference:e.target.value})}/></label>
   <label>Émis le<input required type="date" value={draft.issuedOn} onChange={e=>setDraft({...draft,issuedOn:e.target.value})}/></label>
   <label>Avant taxes ($)<input required type="number" min="0.01" step="0.01" value={draft.subtotal||''} onChange={e=>setDraft({...draft,subtotal:Number(e.target.value)})}/></label>
   <label>Taxes ($)<input type="number" min="0" step="0.01" value={draft.tax||''} onChange={e=>setDraft({...draft,tax:Number(e.target.value)})}/></label>
   <label>Statut<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as VendorCredit['status']})}><option value="Brouillon">Brouillon (non appliqué)</option><option value="Appliqué">Appliqué à la facture</option><option value="Annulé">Annulé</option></select></label>
   <CostCodeSelect operations={operations} value={draft.costCode} onChange={costCode=>setDraft({...draft,costCode})}/>
   <label className="wide">Motif<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
   <Errors errors={errors}/>
   <div className="module-actions wide"><button className="btn primary"><Check size={16}/>Enregistrer</button><button type="button" className="btn ghost" onClick={()=>{setDraft(null);setErrors([])}}>Annuler</button></div>
  </form>:<button className="btn primary" onClick={()=>{setDraft({id:uid(),reference:'',supplier:'',billId:'',costCode:'',issuedOn:today(),subtotal:0,tax:0,status:'Brouillon',notes:''});setErrors([])}}><Plus size={16}/>Ajouter un crédit fournisseur</button>}
  <datalist id="vendor-suppliers">{suppliers.map((x,i)=><option key={i} value={x.name}>{x.email}</option>)}</datalist>
  <Table head={['N°','Fournisseur','Facture liée','Code','Émis','Avant taxes','Total','Statut','']} rows={operations.vendorCredits.map(credit=>[credit.reference,credit.supplier,operations.vendorBills.find(x=>x.id===credit.billId)?.reference||'—',credit.costCode||UNCATEGORISED,credit.issuedOn,money(credit.subtotal),money(billTotal(credit)),credit.status,<button key="e" className="btn ghost" onClick={()=>{setDraft(structuredClone(credit));setErrors([])}}>Modifier</button>])} empty="Aucun crédit fournisseur."/>
 </div>;
}

function Payments({operations,commit}:Shared){
 const [draft,setDraft]=useState<VendorPayment|null>(null),[errors,setErrors]=useState<string[]>([]);
 const bills=operations.vendorBills.filter(x=>!['Brouillon','Annulée'].includes(x.status));
 function save(){if(!draft)return;const problems=validatePayment(operations,draft);setErrors(problems);if(problems.length)return;void commit(refreshBillStatuses({...operations,vendorPayments:[draft,...operations.vendorPayments.filter(x=>x.id!==draft.id)]}));setDraft(null)}
 return <div className="vendor-stack">
  {draft?<form className="vendor-form" onSubmit={e=>{e.preventDefault();save()}} aria-label="Paiement fournisseur">
   <label>Facture payée<select required value={draft.billId} onChange={e=>{const bill=bills.find(x=>x.id===e.target.value);setDraft({...draft,billId:e.target.value,supplier:bill?.supplier||'',amount:bill?billBalance(operations,bill.id,{paymentId:draft.id}):draft.amount})}}><option value="">Choisir…</option>{bills.map(x=><option key={x.id} value={x.id}>{x.reference} · {x.supplier} · solde {money(billBalance(operations,x.id,{paymentId:draft.id}))}</option>)}</select></label>
   <label>Payé le<input required type="date" value={draft.paidOn} onChange={e=>setDraft({...draft,paidOn:e.target.value})}/></label>
   <label>Méthode<select value={draft.method} onChange={e=>setDraft({...draft,method:e.target.value})}>{['Virement','Chèque','Carte','Interac','Comptant','Autre'].map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Montant ($)<input required type="number" min="0.01" step="0.01" value={draft.amount||''} onChange={e=>setDraft({...draft,amount:Number(e.target.value)})}/></label>
   <label>Référence (n° chèque, virement)<input value={draft.reference} onChange={e=>setDraft({...draft,reference:e.target.value})}/></label>
   <label>Statut<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as VendorPayment['status']})}><option>Émis</option><option>Annulé</option></select></label>
   <p className="wide muted">Paiement consigné manuellement : aucun virement ni paiement réel n’est déclenché par Yello Pro.</p>
   <Errors errors={errors}/>
   <div className="module-actions wide"><button className="btn primary"><Check size={16}/>Enregistrer</button><button type="button" className="btn ghost" onClick={()=>{setDraft(null);setErrors([])}}>Annuler</button></div>
  </form>:<button className="btn primary" disabled={!bills.length} onClick={()=>{setDraft({id:uid(),reference:'',supplier:'',billId:'',paidOn:today(),method:'Virement',amount:0,status:'Émis',reconciled:false,reconciledOn:'',notes:''});setErrors([])}}><Plus size={16}/>Consigner un paiement</button>}
  {!bills.length&&<p className="muted">Enregistrez d’abord une facture fournisseur reconnue.</p>}
  <Table head={['Payé le','Fournisseur','Facture','Méthode','Référence','Montant','Statut','Rapproché','']} rows={operations.vendorPayments.map(payment=>[payment.paidOn,payment.supplier,operations.vendorBills.find(x=>x.id===payment.billId)?.reference||'—',payment.method,payment.reference||'—',money(payment.amount),payment.status,payment.reconciled?`Oui · ${payment.reconciledOn}`:'Non',<button key="e" className="btn ghost" onClick={()=>{setDraft(structuredClone(payment));setErrors([])}}>Modifier</button>])} empty="Aucun paiement fournisseur."/>
 </div>;
}

function Reconciliation({operations,commit}:Shared){
 const check=reconciliation(operations);const ref=(id:string)=>operations.vendorBills.find(x=>x.id===id)?.reference||operations.purchaseOrders.find(x=>x.id===id)?.title||id;
 const toggle=(payment:VendorPayment)=>void commit({...operations,vendorPayments:operations.vendorPayments.map(x=>x.id===payment.id?{...x,reconciled:!x.reconciled,reconciledOn:x.reconciled?'':today()}:x)});
 const items:[string,string[]][]=[['Factures sans justificatif',check.billsWithoutAttachment],['Factures sans bon de commande',check.billsWithoutOrder],['Bons facturés au-delà de leur valeur',check.overBilledOrders],['Réceptions non encore facturées',check.receivedNotBilled],['Factures échues avec solde',check.overdueBills]];
 return <div className="vendor-stack">
  <p>Cochez chaque paiement retrouvé sur le relevé bancaire. Reste à rapprocher : <b>{check.unreconciledCount}</b> paiement(s), <b>{money(check.unreconciledAmount)}</b>.</p>
  <div className="vendor-checklist">{operations.vendorPayments.filter(x=>x.status==='Émis').map(payment=><label key={payment.id}><input type="checkbox" checked={payment.reconciled} onChange={()=>toggle(payment)}/>{payment.paidOn} · {payment.supplier} · {payment.method} {payment.reference} · <b>{money(payment.amount)}</b></label>)}</div>
  <ul className="vendor-findings">{items.map(([label,ids])=><li key={label} className={ids.length?'warn':'ok'}><b>{label}</b> : {ids.length?ids.map(ref).join(', '):'aucun'}</li>)}</ul>
 </div>;
}

function Table({head,rows,empty}:{head:string[];rows:React.ReactNode[][];empty:string}){
 if(!rows.length)return <p className="muted">{empty}</p>;
 return <div className="vendor-table" role="region" aria-label="Tableau" tabIndex={0}><table><thead><tr>{head.map((h,i)=><th key={i}>{h||<span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

/** Budget by cost code: original → revised → committed → actual → remaining, exportable as CSV. */
export function VendorBudgetTable({operations}:{operations:ProjectOperations}){
 const {rows,total}=vendorBudget(operations);
 const columns:[keyof typeof total,string][]=[['original','Budget original'],['changes','Changements approuvés'],['revised','Budget révisé'],['committed','Bons engagés'],['openCommitment','Engagé non facturé'],['billed','Factures fournisseur'],['credits','Crédits'],['labour','Main-d’œuvre approuvée'],['manual','Réel saisi'],['actual','Réalisé'],['paid','Payé'],['payable','À payer'],['forecast','Prévision finale'],['remaining','Reste à engager']];
 function exportCsv(){const esc=(x:unknown)=>'"'+String(x??'').replace(/^([\s]*[=+@-])/,"'$1").replaceAll('"','""')+'"';const lines=[['Code de coût',...columns.map(x=>x[1])],...[...rows,total].map(r=>[r.label,...columns.map(([k])=>String(r[k]))])];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+lines.map(l=>l.map(esc).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download='yello-pro-budget-projet.csv';a.click();URL.revokeObjectURL(a.href)}
 return <section className="vendor-budget"><div className="operations-heading"><div><h3>Budget par code de coût</h3><p>Montants avant taxes. Un bon brouillon n’est pas engagé ; une facture remplace la part engagée de son bon ; un paiement ne crée pas de coût.</p></div><button className="btn secondary" onClick={exportCsv}><Download size={16}/>Exporter</button></div>
  {rows.length?<div className="vendor-table" role="region" aria-label="Budget par code de coût" tabIndex={0}><table><thead><tr><th>Code de coût</th>{columns.map(([k,label])=><th key={k}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><th scope="row">{r.label}</th>{columns.map(([k])=><td key={k} className={k==='remaining'&&r.remaining<0?'negative':''}>{money(r[k] as number)}</td>)}</tr>)}</tbody><tfoot><tr><th scope="row">Total</th>{columns.map(([k])=><td key={k} className={k==='remaining'&&total.remaining<0?'negative':''}>{money(total[k] as number)}</td>)}</tr></tfoot></table></div>:<p className="muted">Ajoutez des codes de coût avec leur budget, ou des postes budgétaires, pour suivre l’original, le révisé et le réalisé.</p>}
 </section>;
}
