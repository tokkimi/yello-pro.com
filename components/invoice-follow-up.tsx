'use client';

import {useState} from 'react';
import {Bell,Copy,Link2,Mail} from 'lucide-react';
import {money,type RecordItem} from '@/lib/model';
import {invoiceState,manualReminderAllowed,outstanding,remindersOf,daysOverdue} from '@/lib/billing';

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
const tone=(s:string)=>s==='Payée'?'ok':s==='En retard'?'danger':s==='Brouillon'||s==='Annulée'?'neutral':'warn';

/** Follow-up of an issued invoice (or a sent quote/contract): client link, payment link and reminders. */
export default function InvoiceFollowUp({record,demo,clientEmail,onUpdated}:{record:RecordItem;demo:boolean;clientEmail:string;onUpdated:(record:RecordItem)=>void}){
 const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[url,setUrl]=useState(String(record.data.payment_url||''));
 const isInvoice=record.kind==='invoice';
 const state=isInvoice?invoiceState(record.data,today()):String(record.data.status||'');
 const due=isInvoice?outstanding(record.data):0;
 const link=record.data.public_token?`${location.origin}/f/${record.data.public_token}`:'';
 const logs=remindersOf(record.data);
 const waiting=isInvoice?['Émise','Vue','Partiellement payée','En retard'].includes(state)&&due>0:state==='Envoyé';
 async function call(action:string,extra:Record<string,string>={}){if(demo){setMessage('Démonstration : aucune action envoyée au serveur.');return}setBusy(action);setMessage('');try{const response=await fetch('/api/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:record.id,...extra})});const body=await response.json();if(!response.ok)throw new Error(body.error);onUpdated(body.record);setMessage(action==='remind'?'Rappel envoyé par courriel.':action==='link'?'Lien client prêt.':action==='revoke'?'Lien révoqué : l’ancienne adresse ne fonctionne plus.':'Lien de paiement enregistré.')}catch(e){setMessage((e as Error).message)}finally{setBusy('')}}
 if(isInvoice&&state==='Brouillon')return <section className="fm-card follow-up"><p className="eyebrow">Suivi de la facture</p><p className="muted">Émettez la facture pour créer son lien client, son lien de paiement et ses rappels.</p></section>;
 return <section className="fm-card follow-up" aria-label="Suivi client">
  <div className="fm-card-head"><div><p className="eyebrow">{isInvoice?'Suivi de la facture':'Suivi du document'}</p><h3>{isInvoice?<>Solde {money(due)}</>:'En attente du client'}</h3></div><span className={`state-pill ${tone(state)}`}>{state}{isInvoice&&state==='En retard'?` · ${daysOverdue(record.data,today())} j`:''}</span></div>
  {isInvoice&&<div className="follow-row"><Link2 size={16}/><div><b>Lien client</b><small>Le client consulte, télécharge et paie sans créer de compte. {record.data.first_viewed_at?`Consultée le ${new Date(String(record.data.first_viewed_at)).toLocaleDateString('fr-CA')}.`:'Pas encore consultée.'}</small></div>{link?<div className="module-actions"><button className="btn ghost" onClick={()=>{void navigator.clipboard?.writeText(link);setMessage('Lien copié.')}}><Copy size={14}/>Copier</button><button className="btn ghost" disabled={!!busy} onClick={()=>{if(window.confirm('Révoquer ce lien ? Le client ne pourra plus l’ouvrir.'))void call('revoke')}}>Révoquer</button></div>:<button className="btn secondary" disabled={!!busy} onClick={()=>void call('link')}>Créer le lien</button>}</div>}
  {isInvoice&&<form className="follow-row" onSubmit={e=>{e.preventDefault();void call('payment_url',{url:url.trim()})}}><Mail size={16}/><label><b>Lien de paiement en ligne</b><small>Collez un lien Stripe, Square ou PayPal déjà créé chez votre fournisseur de paiement. Yello Pro n’encaisse rien lui-même et ne marque jamais la facture payée à partir de ce lien.</small><input type="url" inputMode="url" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)}/></label><button className="btn secondary" disabled={!!busy||url.trim()===String(record.data.payment_url||'')}>Enregistrer</button></form>}
  <div className="follow-row"><Bell size={16}/><div><b>Rappels</b><small>{logs.length?logs.slice(-4).reverse().map(l=>`${new Date(l.at).toLocaleDateString('fr-CA')} · ${l.kind} · ${l.status}`).join(' — '):'Aucun rappel envoyé.'}</small></div>{waiting&&<div className="module-actions"><button className="btn primary" disabled={!!busy||!manualReminderAllowed(record.data)} title={!manualReminderAllowed(record.data)?'Un rappel a déjà été envoyé dans les 20 dernières heures':''} onClick={()=>void call('remind')}>{busy==='remind'?'Envoi…':'Envoyer un rappel'}</button>{clientEmail&&<a className="btn ghost" href={`mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(`Rappel — ${record.data.number||record.data.title||''}`)}&body=${encodeURIComponent(`Bonjour,\n\nPetit rappel concernant ${record.data.number||record.data.title||'notre document'}${isInvoice?` : solde de ${money(due)}`:''}.${link?`\n\nConsulter : ${link}`:''}${record.data.payment_url?`\nPayer en ligne : ${record.data.payment_url}`:''}\n\nMerci,`)}`}>Préparer dans ma messagerie</a>}</div>}</div>
  <p className="muted small">Les rappels automatiques se règlent dans Paramètres → Facturation et paiements. « Préparer dans ma messagerie » ouvre un brouillon : il n’est pas compté comme envoyé.</p>
  {message&&<p role="status" className="muted">{message}</p>}
 </section>;
}
