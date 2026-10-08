'use client';
import {Plus,Trash2,FileText} from 'lucide-react';
import {Data,Profile,RecordItem,money,totals,round,defaultPaymentSchedule} from '@/lib/model';
import QuoteLineDetails from './quote-line-details';
import DocumentCostSummary from './document-cost-summary';
import {contractFromQuote} from '@/lib/contracts';

type Props={data:Data;clientId?:string|null;projectId?:string|null;records:RecordItem[];users:(Profile&{active?:boolean})[];onChange:(data:Data)=>void};
export default function ContractEditor({data:d,clientId,projectId,records,users,onChange}:Props){
 const set=(key:string,value:any)=>onChange({...d,[key]:value});
 const field=(key:string,label:string,type='text')=><label>{label}{type==='textarea'?<textarea value={d[key]||''} onChange={e=>set(key,e.target.value)} rows={3}/>:<input type={type} value={d[key]??''} onChange={e=>set(key,type==='number'?Number(e.target.value):e.target.value)} min={type==='number'?0:undefined}/>}</label>;
 const lines:Data[]=d.lines||[],schedule:Data[]=d.payment_schedule||[],summary=totals(d);
 const sources=records.filter(r=>(d.partner_id?r.kind==='partner_quote'&&r.data.partner_id===d.partner_id:r.kind==='quote')&&r.client_id===clientId&&r.project_id===projectId);
 const changeLine=(index:number,key:string,value:any)=>set('lines',lines.map((line,i)=>i===index?{...line,[key]:value,...(key==='price'?{pricing_mode:'unit'}:{})}:line));
 const percent=schedule.reduce((sum,row)=>sum+Number(row.percent||0),0);
 return <div className="contract-editor">
  <section><header><FileText size={18}/><div><h3>Document et parties</h3><p>Contrat client ou contrat de sous-traitance, lié au projet.</p></div></header>
   <div className="form-grid">{field('number','Numéro du contrat')}{field('date','Date','date')}</div>
   <label>Partie contractante<select value={d.partner_id||''} onChange={e=>set('partner_id',e.target.value)}><option value="">Client du projet</option>{users.filter(person=>person.role==='worker'&&person.active!==false).map(person=><option key={person.id} value={person.id}>{person.name} — Prestataire</option>)}</select></label>
   {sources.length>0&&<label>Reprendre une soumission<select value={d.quote_id||''} onChange={e=>{const source=sources.find(r=>r.id===e.target.value);if(source)onChange({...d,...contractFromQuote(source.data),quote_id:source.id});else set('quote_id','')}}><option value="">Rédiger un contrat indépendant</option>{sources.map(source=><option key={source.id} value={source.id}>{source.data.number} · {source.data.title} · {money(totals(source.data).total)}</option>)}</select></label>}
   <div className="form-grid">{field('address','Adresse des travaux')}{field('billing_address','Adresse de facturation')}</div>
  </section>
  <section><header><div><h3>Travaux et calendrier</h3><p>Précisez les engagements, les exclusions et les dates convenues.</p></div></header>
   {field('scope','Travaux inclus','textarea')}{field('exclusions','Exclusions et éléments fournis par le client','textarea')}
   <div className="form-grid">{field('start','Début prévu','date')}{field('end','Fin prévue','date')}</div>
   {field('timeline','Déroulement et délais des travaux','textarea')}
  </section>
  <section><header><div><h3>Prestations et prix</h3><p>Montants avant taxes. Les totaux sont recalculés automatiquement.</p></div><button type="button" className="btn secondary" onClick={()=>set('lines',[...lines,{description:'',quantity:1,unit:'forfait',price:0}])}><Plus size={15}/>Ajouter une prestation</button></header>
   {!lines.length&&<p className="muted">Importez une soumission ou ajoutez les prestations du contrat.</p>}
   {lines.map((line,index)=><div key={index}><div className="contract-line"><label>Prestation<input value={line.description||''} onChange={e=>changeLine(index,'description',e.target.value)}/></label><label>Quantité<input type="number" min="0" step="any" value={line.quantity??1} onChange={e=>changeLine(index,'quantity',Number(e.target.value))}/></label><label>Unité<input value={line.unit||'forfait'} onChange={e=>changeLine(index,'unit',e.target.value)}/></label><label>Prix unitaire<input type="number" min="0" step=".01" value={line.price??0} onChange={e=>changeLine(index,'price',Number(e.target.value))}/></label><button type="button" className="icon-button" aria-label={'Supprimer la prestation '+(index+1)} onClick={()=>set('lines',lines.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div><QuoteLineDetails line={line} onChange={next=>set('lines',lines.map((item,i)=>i===index?next:item))}/></div>)}
   <div className="form-grid three">{field('tps','TPS (%)','number')}{field('tvq','TVQ (%)','number')}{field('discount','Rabais (%)','number')}</div>
   <DocumentCostSummary data={d} onChange={onChange}/><div className="contract-costs"><span>Sous-total <b>{money(summary.net)}</b></span><span>TPS <b>{money(summary.tps)}</b></span><span>TVQ <b>{money(summary.tvq)}</b></span><strong>Total du contrat <b>{money(summary.total)}</b></strong></div>
  </section>
  <section><header><div><h3>Échéancier de paiement</h3><p>{percent} % répartis · {money(summary.total)} taxes incluses</p></div><button type="button" className="btn secondary" onClick={()=>set('payment_schedule',[...schedule,{label:'',percent:0}])}><Plus size={15}/>Ajouter un paiement</button></header>
   {schedule.map((row,index)=><div className="contract-payment" key={index}><label>Étape<input value={row.label||''} onChange={e=>set('payment_schedule',schedule.map((s,i)=>i===index?{...s,label:e.target.value}:s))}/></label><label>Pourcentage<input type="number" min="0" max="100" step="any" value={row.percent??0} onChange={e=>set('payment_schedule',schedule.map((s,i)=>i===index?{...s,percent:Number(e.target.value)}:s))}/></label><strong>{money(round(summary.total*Number(row.percent||0)/100))}</strong><button type="button" className="icon-button" aria-label={'Supprimer le paiement '+(index+1)} onClick={()=>set('payment_schedule',schedule.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}
   {!schedule.length&&<button type="button" className="text-button" onClick={()=>set('payment_schedule',structuredClone(defaultPaymentSchedule))}>Utiliser l’échéancier habituel</button>}
   {percent!==100&&<p className="contract-hint">Vous pouvez enregistrer ce brouillon. Avant le partage, répartissez 100 % du montant.</p>}
  </section>
  <section><header><div><h3>Conditions et garanties</h3><p>Ces informations apparaissent dans le document remis au signataire.</p></div></header>{field('terms','Conditions du contrat','textarea')}{field('warranty','Garanties et réception des travaux','textarea')}{field('notes','Notes internes (non incluses dans le PDF)','textarea')}
   <label>Statut<select value={d.status||'Brouillon'} onChange={e=>set('status',e.target.value)}><option>Brouillon</option><option>Envoyé</option><option>Archivé</option></select></label>
  </section>
 </div>;
}
