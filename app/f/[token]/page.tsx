import {notFound} from 'next/navigation';
import {db,workspaceDb} from '@/lib/supabase';
import {defaults,money,totals,type RecordItem} from '@/lib/model';
import {invoiceState,outstanding,safePaymentUrl} from '@/lib/billing';
import {publicInvoice} from '@/lib/public-invoice';
import {redact} from '@/lib/redact';

export const metadata={title:'Facture',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Public invoice page reached through the unguessable link sent to the client: view, download and pay without an account. */
export default async function PublicInvoice({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!uuid.test(token))notFound();
 const found=await publicInvoice(token);if(!found)notFound();const raw=found.invoice;
 if(!raw.data.first_viewed_at){await workspaceDb((raw as any).workspace_id).from('records').update({data:{...raw.data,first_viewed_at:new Date().toISOString()},version:raw.version+1}).eq('id',raw.id).eq('version',raw.version);await workspaceDb((raw as any).workspace_id).from('audit_log').insert({action:'invoice_viewed',record_id:raw.id,details:{family:'invoices'}})}
 const invoice=redact({id:'public',name:'',email:'',role:'client',client_id:raw.client_id},raw);
 const settings:Record<string,any>={...defaults,...((await workspaceDb((raw as any).workspace_id).from('records').select('data').eq('kind','settings').limit(1).maybeSingle()).data?.data||{})};
 const client=found.client.data;const paymentUrl=safePaymentUrl(raw.data.payment_url);
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
 const state=invoiceState(raw.data,today),due=outstanding(raw.data),t=totals(invoice.data);
 return <main className="public-invoice">
  <header><div><p className="eyebrow">{settings.name}</p><h1>Facture {String(invoice.data.number||'')}</h1><p className="muted">Émise le {String(invoice.data.date||'—')} · échéance {String(invoice.data.due||'—')}</p></div><span className={`state-pill ${state==='Payée'?'ok':state==='En retard'?'danger':'warn'}`}>{state}</span></header>
  <section className="public-invoice-pay">{due>0?<><div><small>Solde à payer</small><strong>{money(due)}</strong></div>{paymentUrl?<a className="btn primary" href={paymentUrl} target="_blank" rel="noopener noreferrer">Payer en ligne</a>:null}{settings.payment_instructions?<p className="muted">{String(settings.payment_instructions)}</p>:!paymentUrl?<p className="muted">Pour régler cette facture, contactez {settings.name} au {settings.phone} ou à {settings.email}.</p>:null}</>:<div><small>Facture réglée</small><strong>Merci !</strong></div>}</section>
  <section className="public-invoice-doc"><p><b>{String(client.name||'')}</b><br/>{String(invoice.data.title||'')}</p><table><thead><tr><th>Description</th><th>Qté</th><th>Montant</th></tr></thead><tbody>{((invoice.data.lines||[]) as {description?:string;quantity?:number;unit?:string;price?:number}[]).map((l,i)=><tr key={i}><td>{l.description}</td><td>{l.quantity} {l.unit}</td><td>{money(Number(l.quantity||0)*Number(l.price||0))}</td></tr>)}</tbody></table><dl><div><dt>Sous-total</dt><dd>{money(t.net)}</dd></div><div><dt>TPS</dt><dd>{money(t.tps)}</dd></div><div><dt>TVQ</dt><dd>{money(t.tvq)}</dd></div><div><dt>Total</dt><dd>{money(t.total)}</dd></div><div><dt>Payé</dt><dd>{money(Number(raw.data.paid||0))}</dd></div></dl><a className="btn secondary" href={`/f/${token}/pdf`}>Télécharger le PDF</a></section>
  <footer className="muted">{settings.name} · {settings.phone} · {settings.email} · RBQ {settings.rbq}</footer>
 </main>;
}
