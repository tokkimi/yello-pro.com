'use client';

import {useEffect,useMemo,useState} from 'react';
import {Plus,RotateCcw,Save,Trash2} from 'lucide-react';
import CatalogueCentre from './catalogue-centre';
import type {Data} from '@/lib/model';
import {aggregate,channels,defaultMatrix,matrixFrom,notificationFamilies,type Channel,type Family,type Matrix} from '@/lib/notifications';
import {defaultTemplates,renderTemplate,sampleValues,templateErrors,templatesFrom,variablesFor,type EmailTemplate} from '@/lib/email-templates';
import {reminderSettingsFrom} from '@/lib/billing';
import {aiPreferencesFrom,employeePortalFrom,projectSettingsFrom,brandingFrom,type JournalQuestion} from '@/lib/settings-model';

const sections=['Image de marque','Paramètres de projets','Catalogue et codes couleur','Facturation et paiements','Préférences IA','Courriels par défaut','Portail employés','Notifications','Intégrations et services','Abonnement','Support et commentaires'] as const;
type Section=typeof sections[number];
type Props={settings:Data;demo:boolean;onSave:(data:Data)=>Promise<unknown>;author:string};
type Status={state:'idle'|'pending'|'saved'|'error';message?:string};

function useSection(props:Props){
 const [status,setStatus]=useState<Status>({state:'idle'});
 async function save(patch:Data){setStatus({state:'pending'});try{await props.onSave({...props.settings,...patch});setStatus({state:'saved',message:props.demo?'Enregistré pour cette démonstration seulement.':'Enregistré.'})}catch(error){setStatus({state:'error',message:`${(error as Error).message} Vos saisies sont conservées.`})}}
 return {status,save,setStatus};
}
function Feedback({status}:{status:Status}){
 if(status.state==='idle')return null;
 return <p role={status.state==='error'?'alert':'status'} className={status.state==='error'?'error':'settings-saved'}>{status.state==='pending'?'Enregistrement…':status.message}</p>;
}
function SaveBar({dirty,status,onSave,onReset,resetLabel='Annuler les modifications'}:{dirty:boolean;status:Status;onSave:()=>void;onReset?:()=>void;resetLabel?:string}){
 return <div className="settings-savebar"><Feedback status={status}/>{dirty&&<span className="settings-dirty">Modifications non enregistrées</span>}{onReset&&<button type="button" className="btn ghost" disabled={!dirty} onClick={onReset}><RotateCcw size={15}/>{resetLabel}</button>}<button type="button" className="btn primary" disabled={!dirty||status.state==='pending'} onClick={onSave}><Save size={15}/>Enregistrer</button></div>;
}

/** Settings sections beyond the company form. Every section saves explicitly and keeps its draft on error. */
export default function SettingsCentre(props:Props){
 const [section,setSection]=useState<Section>(()=>{try{const saved=localStorage.getItem('yello-pro-settings-section');return sections.includes(saved as Section)?saved as Section:sections[0]}catch{return sections[0]}});
 useEffect(()=>{try{localStorage.setItem('yello-pro-settings-section',section)}catch{}},[section]);
 return <section className="panel settings-centre" aria-label="Réglages avancés">
  <nav className="settings-nav" aria-label="Sections des réglages">{sections.map(name=><button type="button" key={name} aria-current={section===name?'page':undefined} className={section===name?'active':''} onClick={()=>setSection(name)}>{name}</button>)}</nav>
  <div className="settings-body">
   <h2>{section}</h2>
   {section==='Image de marque'&&<Branding key={section} {...props}/>}
   {section==='Paramètres de projets'&&<ProjectSettings key={section} {...props}/>}
   {section==='Catalogue et codes couleur'&&<CatalogueSettings {...props}/>}
   {section==='Facturation et paiements'&&<Billing key={section} {...props}/>}
   {section==='Préférences IA'&&<AiPreferences key={section} {...props}/>}
   {section==='Courriels par défaut'&&<Templates key={section} {...props}/>}
   {section==='Portail employés'&&<EmployeePortal key={section} {...props}/>}
   {section==='Notifications'&&<Notifications key={section} {...props}/>}
   {section==='Intégrations et services'&&<Services key={section} demo={props.demo}/>}
   {section==='Abonnement'&&<div className="settings-note"><p>Yello Pro est l’application de l’entreprise : aucun abonnement logiciel n’est facturé ici et aucun moyen de paiement n’est enregistré.</p><p>Les coûts des services externes (hébergement Vercel, base Supabase, Resend, clé IA) se gèrent directement dans leurs consoles respectives.</p></div>}
   {section==='Support et commentaires'&&<Support key={section} {...props}/>}
  </div>
 </section>;
}

function Branding(props:Props){
 const initial=useMemo(()=>brandingFrom(props.settings.branding),[props.settings.branding]);
 const [draft,setDraft]=useState(initial);const {status,save}=useSection(props);
 const [previewError,setPreviewError]=useState('');
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const swatches=['#466952','#193f39','#c0392b','#d97706','#ca8a04','#65a30d','#0891b2','#2563eb','#7c3aed','#52525b','#171717'];
 return <div className="settings-form">
  <p className="muted">Personnalisez les soumissions, contrats et factures. Les réglages enregistrés sont appliqués aux PDF générés ; les fichiers déjà téléchargés restent inchangés.</p><fieldset><legend>Documents (PDF)</legend><label>Logo de l’entreprise (PNG ou JPEG, 200 Ko maximum)<input type="file" accept="image/png,image/jpeg" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setPreviewError('');if(!['image/png','image/jpeg'].includes(file.type)||file.size>200000){setPreviewError('Choisissez une image PNG ou JPEG de 200 Ko maximum.');return}const reader=new FileReader();reader.onload=()=>setDraft(old=>({...old,logo:String(reader.result)}));reader.readAsDataURL(file)}}/></label>{draft.logo&&<div><img src={draft.logo} alt="Logo du document" style={{maxWidth:140,maxHeight:70,objectFit:'contain'}}/><button type="button" className="btn ghost" onClick={()=>setDraft({...draft,logo:''})}>Retirer le logo</button></div>}
   <div className="swatches" role="radiogroup" aria-label="Couleur d’accent">{swatches.map(color=><button type="button" key={color} role="radio" aria-checked={draft.accent===color} aria-label={`Couleur ${color}`} style={{background:color}} onClick={()=>setDraft({...draft,accent:color})}/>)}<label>Code couleur personnalisé<div className="branding-color-input"><input type="color" aria-label="Choisir la couleur du document" value={/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:"#466952"} onChange={e=>setDraft({...draft,accent:e.target.value})}/><input value={draft.accent} onChange={e=>setDraft({...draft,accent:e.target.value})} pattern="#[0-9a-fA-F]{6}" maxLength={7}/></div></label></div>
   <label>En-tête<select value={draft.header} onChange={e=>setDraft({...draft,header:e.target.value as 'classic'|'compact'})}><option value="classic">Classique</option><option value="compact">Compact</option></select></label>
   {([['showLogo','Afficher le logo de l’entreprise'],['colorAccent','Afficher la bande de couleur'],['showCompanyAddress','Afficher l’adresse de l’entreprise'],['showContactName','Afficher le nom du contact'],['showCompanyEmail','Afficher le courriel du contact'],['showCompanyPhone','Afficher le téléphone du contact'],['showWebsite','Afficher le site web'],['showClientName','Afficher le nom du client'],['showClientCompany','Afficher l’entreprise du client'],['showBillingAddress','Afficher l’adresse de facturation'],['showLicence','Afficher la licence RBQ'],['showTaxNumbers','Afficher les numéros de taxes'],['showClientPhone','Afficher le téléphone du client'],['showClientEmail','Afficher le courriel du client']] as const).map(([key,label])=><label className="note-visibility" key={key}><input type="checkbox" checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{label}</label>)}
   <div className="form-grid"><label>Nom du contact sur les documents<input maxLength={100} value={draft.contactName} onChange={e=>setDraft({...draft,contactName:e.target.value})}/></label><label>Courriel du contact<input type="email" maxLength={160} value={draft.contactEmail} placeholder={props.settings.email||''} onChange={e=>setDraft({...draft,contactEmail:e.target.value})}/></label><label>Téléphone du contact<input type="tel" maxLength={50} value={draft.contactPhone} placeholder={props.settings.phone||''} onChange={e=>setDraft({...draft,contactPhone:e.target.value})}/></label><label>Site web affiché<input maxLength={250} value={draft.website} placeholder="https://…" onChange={e=>setDraft({...draft,website:e.target.value})}/></label></div>
   <label>Coordonnées de remplacement sur les documents (facultatif)<textarea value={draft.contactOverride} onChange={e=>setDraft({...draft,contactOverride:e.target.value})} rows={3}/></label>
  </fieldset>
  <div className="branding-document-preview" style={{borderTopColor:draft.colorAccent&&/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:'#466952'}} aria-label="Aperçu des options PDF"><small>APERÇU DU DOCUMENT · DONNÉES FICTIVES</small>{draft.showLogo&&draft.logo&&<img src={draft.logo} alt="Logo" style={{maxWidth:110,maxHeight:50,objectFit:"contain"}}/>}<div className="branding-preview-heading"><strong style={{fontSize:draft.header==='compact'?16:21}}>{props.settings.name||'Yello Pro'}</strong><b style={{color:draft.accent}}>SOUMISSION</b></div>{draft.showCompanyAddress&&<p>{props.settings.address||''}</p>}<p>{draft.contactOverride||[draft.showContactName?draft.contactName:'',draft.showCompanyPhone?draft.contactPhone||props.settings.phone:'',draft.showCompanyEmail?draft.contactEmail||props.settings.email:''].filter(Boolean).join(' · ')}</p>{draft.showWebsite&&draft.website&&<p>{draft.website}</p>}{draft.showLicence&&<small>RBQ {props.settings.rbq||'Numéro de licence'}</small>}{draft.showTaxNumbers&&<small>TPS {props.settings.tps_number||'Numéro TPS'} · TVQ {props.settings.tvq_number||'Numéro TVQ'}</small>}<hr/>{draft.showClientName&&<strong>Client Exemple</strong>}{draft.showClientCompany&&<p>Entreprise Exemple</p>}{draft.showBillingAddress&&<p>123 rue Exemple, Laval</p>}{draft.showClientEmail&&<p>client@exemple.com</p>}{draft.showClientPhone&&<p>514-555-0123</p>}<div className="branding-preview-heading" style={{background:draft.accent,color:'#fff',padding:12}}><span>Description</span><span>Montant</span></div><div className="branding-preview-heading"><span>Travaux de rénovation</span><strong>1 000,00 $</strong></div></div>
  <button type="button" className="btn secondary" onClick={async()=>{setPreviewError('');try{const {makePdf}=await import('@/lib/pdf');const bytes=await makePdf('Soumission',{number:'APERÇU',lines:[{description:'Travaux de rénovation',quantity:1,unit:'forfait',price:1000}]},{name:'Client Exemple',company:'Entreprise Exemple',email:'client@exemple.com',phone:'514-555-0123',billing_address:'123 rue Exemple, Laval'},{...props.settings,branding:draft});const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download='apercu-mgpro.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch{setPreviewError('Impossible de générer l’aperçu. Vérifiez le logo et réessayez.')}}}>Télécharger l’aperçu PDF avec ces options</button>{previewError&&<p role="alert" className="error">{previewError}</p>}
  <fieldset><legend>Courriels</legend>
   <label className="note-visibility"><input type="checkbox" checked={draft.emailSameColor} onChange={e=>setDraft({...draft,emailSameColor:e.target.checked})}/>Utiliser la même couleur que les documents</label>
   <label>Position du nom de l’entreprise dans le courriel<select value={draft.emailLogo} onChange={e=>setDraft({...draft,emailLogo:e.target.value as 'top'|'signature'|'none'})}><option value="top">En haut</option><option value="signature">Dans la signature</option><option value="none">Aucun</option></select></label>
   <label>Signature<textarea value={draft.signature} onChange={e=>setDraft({...draft,signature:e.target.value})} rows={4}/></label>
  </fieldset>
  <div className="email-preview" style={{borderTopColor:/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:'#466952'}} aria-label="Aperçu"><small>APERÇU</small>{draft.emailLogo==='top'&&<b>{props.settings.name||'Yello Pro'}</b>}<p>Bonjour Client Exemple,</p><p>Voici votre document.</p><span className="preview-button" style={{background:draft.emailSameColor&&/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:'#193f39'}}>Consulter</span><pre>{draft.signature}</pre>{draft.emailLogo==='signature'&&<b>{props.settings.name||'Yello Pro'}</b>}</div>
  {!/^#[0-9a-f]{6}$/i.test(draft.accent)&&<p className="error">Couleur invalide : utilisez le format #RRGGBB.</p>}
  <p className="muted">Courriel de test : indisponible tant que le service d’envoi n’est pas configuré (voir Intégrations et services).</p>
  <SaveBar dirty={dirty&&/^#[0-9a-f]{6}$/i.test(draft.accent)} status={status} onSave={()=>void save({branding:draft})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function ProjectSettings(props:Props){
 const initial=useMemo(()=>projectSettingsFrom(props.settings),[props.settings]);
 const [draft,setDraft]=useState(initial);const {status,save}=useSection(props);
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const total=draft.payment_schedule.reduce((s,x)=>s+Number(x.percent||0),0);
 const errors=[Math.abs(total-100)>0.001&&`L’échéancier de paiement totalise ${total} % : il doit totaliser 100 %.`,draft.project_types.some(x=>!x.trim())&&'Chaque type de projet doit avoir un nom.',draft.holidays.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x))&&'Chaque jour férié doit être une date valide.',!draft.work_week.length&&'Choisissez au moins un jour de travail.'].filter(Boolean) as string[];
 const days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
 return <div className="settings-form">
  <fieldset><legend>Types de projets</legend>{draft.project_types.map((type,index)=><div className="settings-row" key={index}><input aria-label={`Type ${index+1}`} value={type} onChange={e=>setDraft({...draft,project_types:draft.project_types.map((x,i)=>i===index?e.target.value:x)})}/><label className="note-visibility"><input type="radio" name="default-type" checked={draft.default_project_type===type} onChange={()=>setDraft({...draft,default_project_type:type})}/>Par défaut</label><button type="button" className="icon-button" aria-label={`Retirer ${type}`} disabled={draft.project_types.length<2||draft.default_project_type===type} onClick={()=>setDraft({...draft,project_types:draft.project_types.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}<button type="button" className="btn secondary" onClick={()=>setDraft({...draft,project_types:[...draft.project_types,'']})}><Plus size={15}/>Ajouter un type</button></fieldset>
  <fieldset><legend>Échéancier de paiement par défaut</legend>{draft.payment_schedule.map((step,index)=><div className="settings-row" key={index}><input aria-label={`Étape ${index+1}`} value={step.label} onChange={e=>setDraft({...draft,payment_schedule:draft.payment_schedule.map((x,i)=>i===index?{...x,label:e.target.value}:x)})}/><input aria-label={`Pourcentage ${index+1}`} type="number" min="0" max="100" step="0.01" value={step.percent} onChange={e=>setDraft({...draft,payment_schedule:draft.payment_schedule.map((x,i)=>i===index?{...x,percent:Number(e.target.value)}:x)})}/><span>%</span><button type="button" className="icon-button" aria-label={`Retirer ${step.label}`} disabled={draft.payment_schedule.length<2} onClick={()=>setDraft({...draft,payment_schedule:draft.payment_schedule.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}<p className={Math.abs(total-100)>0.001?'error':'muted'}>Total : {total} %</p><button type="button" className="btn secondary" onClick={()=>setDraft({...draft,payment_schedule:[...draft.payment_schedule,{label:'Nouvelle étape',percent:0}]})}><Plus size={15}/>Ajouter une étape</button></fieldset>
  <fieldset><legend>Documents</legend><label>Validité des soumissions (jours)<input type="number" min="1" max="365" value={draft.validity_days} onChange={e=>setDraft({...draft,validity_days:Number(e.target.value)})}/></label><label>Retenue contractuelle par défaut (%)<input type="number" min="0" max="20" step="0.5" value={draft.holdback_percent} onChange={e=>setDraft({...draft,holdback_percent:Number(e.target.value)})}/></label><p className="muted">Ces valeurs s’appliquent aux nouveaux documents. Les documents existants et signés ne sont pas modifiés.</p></fieldset>
  <fieldset><legend>Semaine de travail et jours fériés</legend><div className="settings-days">{days.map((day,index)=><label className="note-visibility" key={day}><input type="checkbox" checked={draft.work_week.includes(index+1)} onChange={e=>setDraft({...draft,work_week:e.target.checked?[...draft.work_week,index+1].sort():draft.work_week.filter(x=>x!==index+1)})}/>{day}</label>)}</div>{draft.holidays.map((date,index)=><div className="settings-row" key={index}><input type="date" aria-label={`Jour férié ${index+1}`} value={date} onChange={e=>setDraft({...draft,holidays:draft.holidays.map((x,i)=>i===index?e.target.value:x)})}/><button type="button" className="icon-button" aria-label={`Retirer ${date}`} onClick={()=>setDraft({...draft,holidays:draft.holidays.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}<button type="button" className="btn secondary" onClick={()=>setDraft({...draft,holidays:[...draft.holidays,'']})}><Plus size={15}/>Ajouter un jour férié</button><p className="muted">Utilisés par le recalcul des échéanciers. Aucun jour férié n’est ajouté automatiquement.</p></fieldset>
  <fieldset><legend>Unités</legend>{draft.units.map((unit,index)=><div className="settings-row" key={index}><input aria-label={`Unité ${index+1}`} value={unit} onChange={e=>setDraft({...draft,units:draft.units.map((x,i)=>i===index?e.target.value:x)})}/><button type="button" className="icon-button" aria-label={`Monter ${unit}`} disabled={!index} onClick={()=>{const units=[...draft.units];[units[index-1],units[index]]=[units[index],units[index-1]];setDraft({...draft,units})}}>↑</button><button type="button" className="icon-button" aria-label={`Descendre ${unit}`} disabled={index===draft.units.length-1} onClick={()=>{const units=[...draft.units];[units[index+1],units[index]]=[units[index],units[index+1]];setDraft({...draft,units})}}>↓</button><button type="button" className="icon-button" aria-label={`Retirer ${unit}`} onClick={()=>setDraft({...draft,units:draft.units.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}<button type="button" className="btn secondary" onClick={()=>setDraft({...draft,units:[...draft.units,'']})}><Plus size={15}/>Ajouter une unité</button></fieldset>
  {errors.map(x=><p className="error" key={x}>{x}</p>)}
  <SaveBar dirty={dirty&&!errors.length} status={status} onSave={()=>void save({project_types:draft.project_types.map(x=>x.trim()),default_project_type:draft.default_project_type,payment_schedule:draft.payment_schedule,validity_days:draft.validity_days,validity:`${draft.validity_days} jours`,holdback_percent:draft.holdback_percent,work_week:draft.work_week,holidays:[...new Set(draft.holidays)].sort(),units:draft.units.map(x=>x.trim()).filter(Boolean)})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function AiPreferences(props:Props){
 const initial=useMemo(()=>aiPreferencesFrom(props.settings.ai_preferences),[props.settings.ai_preferences]);
 const [draft,setDraft]=useState(initial);const {status,save}=useSection(props);const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 return <div className="settings-form">
  <label>Ton des propositions<select value={draft.tone} onChange={e=>setDraft({...draft,tone:e.target.value as typeof draft.tone})}><option value="professional">Professionnel</option><option value="friendly">Chaleureux</option><option value="concise">Concis</option></select></label>
  <label>Niveau de détail des descriptions<select value={draft.detail} onChange={e=>setDraft({...draft,detail:e.target.value as typeof draft.detail})}><option value="short">Court</option><option value="standard">Standard</option><option value="detailed">Détaillé</option></select></label>
  <label className="note-visibility"><input type="checkbox" checked={draft.splitLabour} onChange={e=>setDraft({...draft,splitLabour:e.target.checked})}/>Séparer matériaux et main-d’œuvre</label>
  <label className="note-visibility"><input type="checkbox" checked={draft.listAssumptions} onChange={e=>setDraft({...draft,listAssumptions:e.target.checked})}/>Afficher les hypothèses</label>
  <label className="note-visibility"><input type="checkbox" checked={draft.listMissing} onChange={e=>setDraft({...draft,listMissing:e.target.checked})}/>Signaler les éléments manquants</label>
  <label className="note-visibility"><input type="checkbox" checked={draft.neverInventPrices} onChange={e=>setDraft({...draft,neverInventPrices:e.target.checked})}/>Ne jamais proposer de prix sans référence fournie</label>
  <label>Instructions générales (max. 2 000 caractères)<textarea maxLength={2000} rows={5} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})}/></label>
  <p className="muted">Ces préférences sont ajoutées aux consignes de l’analyse IA des notes de visite lorsqu’une clé IA est configurée. Sans clé, l’analyse locale ne les utilise pas.</p>
  <SaveBar dirty={dirty} status={status} onSave={()=>void save({ai_preferences:draft})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function Templates(props:Props){
 const initial=useMemo(()=>templatesFrom(props.settings.email_templates),[props.settings.email_templates]);
 const [draft,setDraft]=useState<EmailTemplate[]>(initial),[open,setOpen]=useState<string[]>([]);const {status,save}=useSection(props);
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const errors=draft.flatMap(t=>templateErrors(t).map(e=>`${t.label} : ${e}`));
 const patch=(id:string,value:Partial<EmailTemplate>)=>setDraft(old=>old.map(t=>t.id===id?{...t,...value}:t));
 function insert(id:string,field:'subject'|'body',token:string){const element=document.getElementById(`tpl-${id}-${field}`) as HTMLInputElement|HTMLTextAreaElement|null;const template=draft.find(t=>t.id===id)!;const text=template[field];const start=element?.selectionStart??text.length,end=element?.selectionEnd??text.length;patch(id,{[field]:text.slice(0,start)+`[${token}]`+text.slice(end)});requestAnimationFrame(()=>{element?.focus();element?.setSelectionRange(start+token.length+2,start+token.length+2)})}
 return <div className="settings-form">
  <div className="module-actions"><button type="button" className="btn secondary" onClick={()=>setOpen(open.length===draft.length?[]:draft.map(t=>t.id))}>{open.length===draft.length?'Tout replier':'Tout ouvrir'}</button></div>
  {draft.map(template=>{const base=defaultTemplates.find(x=>x.id===template.id)!;const vars=variablesFor(template);const preview=renderTemplate(template.body,sampleValues,vars);const problems=templateErrors(template);return <details key={template.id} open={open.includes(template.id)} onToggle={e=>{const isOpen=(e.currentTarget as HTMLDetailsElement).open;setOpen(old=>isOpen?[...new Set([...old,template.id])]:old.filter(x=>x!==template.id))}} className="template-item">
   <summary>{template.label}{problems.length>0&&<span className="settings-dirty"> · à corriger</span>}</summary>
   <div className="template-vars" aria-label="Variables disponibles">{vars.map(v=><button type="button" key={v} onClick={()=>insert(template.id,'body',v)}>[{v}]</button>)}</div>
   <label>Sujet<input id={`tpl-${template.id}-subject`} required value={template.subject} onChange={e=>patch(template.id,{subject:e.target.value})}/></label><button type="button" className="btn ghost" onClick={()=>patch(template.id,{subject:base.subject})}><RotateCcw size={14}/>Sujet par défaut</button>
   <label>Message<textarea id={`tpl-${template.id}-body`} required rows={7} value={template.body} onChange={e=>patch(template.id,{body:e.target.value})}/></label><button type="button" className="btn ghost" onClick={()=>patch(template.id,{body:base.body})}><RotateCcw size={14}/>Message par défaut</button>
   <label>Texte du bouton<input value={template.button} onChange={e=>patch(template.id,{button:e.target.value})}/></label>
   <label className="note-visibility"><input type="checkbox" checked={template.attachPdf} onChange={e=>patch(template.id,{attachPdf:e.target.checked})}/>Joindre le PDF du document</label>
   {problems.map(x=><p className="error" key={x}>{x}</p>)}
   <div className="email-preview"><small>APERÇU AVEC DES DONNÉES FICTIVES</small><b>{renderTemplate(template.subject,sampleValues,vars).text}</b><pre>{preview.text}</pre><span className="preview-button">{template.button}</span></div>
  </details>})}
  {errors.length>0&&<p className="error">Corrigez {errors.length} problème(s) avant d’enregistrer.</p>}
  <p className="muted">Modifier un modèle ne change aucun courriel déjà envoyé. Les envois restent bloqués tant que le service de courriel n’est pas configuré.</p>
  <SaveBar dirty={dirty&&!errors.length} status={status} onSave={()=>void save({email_templates:draft.map(({id,subject,body,button,attachPdf})=>({id,subject,body,button,attachPdf}))})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function EmployeePortal(props:Props){
 const initial=useMemo(()=>employeePortalFrom(props.settings.employee_portal),[props.settings.employee_portal]);
 const [draft,setDraft]=useState(initial);const {status,save}=useSection(props);const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const patch=(index:number,value:Partial<JournalQuestion>)=>setDraft({...draft,questions:draft.questions.map((q,i)=>i===index?{...q,...value}:q)});
 const invalid=draft.questions.some(q=>!q.title.trim());
 return <div className="settings-form settings-portal">
  <div>
   <label>Projets visibles par les prestataires<select value={draft.projectVisibility} onChange={e=>setDraft({...draft,projectVisibility:e.target.value as typeof draft.projectVisibility})}><option value="assigned">Projets assignés seulement</option><option value="active_assigned">Projets assignés en cours seulement</option></select></label>
   <label>Codes de coût accessibles<select value={draft.costCodes} onChange={e=>setDraft({...draft,costCodes:e.target.value as typeof draft.costCodes})}><option value="all">Tous</option><option value="quote">Ceux de la soumission du projet</option><option value="none">Aucun</option></select></label>
   <h3>Questions du journal de chantier</h3>
   {draft.questions.map((q,index)=><div className="settings-row question" key={q.id}><input aria-label={`Question ${index+1}`} value={q.title} onChange={e=>patch(index,{title:e.target.value})}/><select aria-label={`Type de la question ${index+1}`} value={q.type} onChange={e=>patch(index,{type:e.target.value as JournalQuestion['type']})}><option value="text">Texte</option><option value="yesno">Oui / non</option></select><label className="note-visibility"><input type="checkbox" checked={q.active} onChange={e=>patch(index,{active:e.target.checked})}/>Active</label><label className="note-visibility"><input type="checkbox" checked={q.required} onChange={e=>patch(index,{required:e.target.checked})}/>Obligatoire</label><button type="button" className="icon-button" aria-label={`Supprimer la question ${index+1}`} onClick={()=>setDraft({...draft,questions:draft.questions.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}
   <button type="button" className="btn secondary" onClick={()=>setDraft({...draft,questions:[...draft.questions,{id:crypto.randomUUID(),title:'',type:'text',active:true,required:false}]})}><Plus size={15}/>Ajouter une question</button>
   {invalid&&<p className="error">Chaque question doit avoir un titre.</p>}
  </div>
  <div className="phone-preview" aria-label="Aperçu téléphone"><small>Aperçu du journal sur téléphone</small>{draft.questions.filter(q=>q.active).map(q=><label key={q.id}>{q.title||'Question sans titre'}{q.required&&' *'}{q.type==='yesno'?<span className="yesno"><span>Oui</span><span>Non</span></span>:<span className="fake-input"/>}</label>)}</div>
  <SaveBar dirty={dirty&&!invalid} status={status} onSave={()=>void save({employee_portal:draft})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function Notifications(props:Props){
 const initial=useMemo(()=>matrixFrom(props.settings.notification_matrix),[props.settings.notification_matrix]);
 const [draft,setDraft]=useState<Matrix>(initial),[role,setRole]=useState<'admin'|'worker'|'client'>('admin');const {status,save}=useSection(props);
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const set=(family:Family,channel:Channel,value:boolean)=>setDraft(old=>({...old,[role]:{...old[role],[family]:{...old[role][family],[channel]:value}}}));
 const available=channels.filter(c=>c.available);
 const columnState=(channel:Channel)=>aggregate(notificationFamilies.map(f=>draft[role][f.id][channel]));
 return <div className="settings-form">
  <label>Rôle<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="admin">Administration</option><option value="worker">Prestataires et employés</option><option value="client">Clients</option></select></label>
  <div className="vendor-table" role="region" aria-label="Matrice des notifications" tabIndex={0}><table><thead><tr><th>Famille d’événements</th>{channels.map(c=><th key={c.id}><label className="note-visibility"><input type="checkbox" disabled={!c.available} checked={columnState(c.id)==='on'} ref={el=>{if(el)el.indeterminate=columnState(c.id)==='mixed'}} onChange={e=>notificationFamilies.forEach(f=>set(f.id,c.id,e.target.checked))}/>{c.label}</label></th>)}</tr></thead><tbody>{notificationFamilies.map(f=><tr key={f.id}><th scope="row">{f.label}</th>{channels.map(c=><td key={c.id}><input type="checkbox" aria-label={`${f.label} — ${c.label}`} disabled={!c.available} checked={c.available&&draft[role][f.id][c.id]} onChange={e=>set(f.id,c.id,e.target.checked)}/></td>)}</tr>)}</tbody></table></div>
  <p className="muted">Seul le canal « Dans l’application » est actif ({available.length} canal disponible). Courriel : en attente du service d’envoi. SMS et Push : aucun fournisseur intégré — ces cases restent désactivées plutôt que d’annoncer un envoi qui n’aurait pas lieu.</p>
  <SaveBar dirty={dirty} status={status} onSave={()=>void save({notification_matrix:draft})} onReset={()=>setDraft(defaultMatrix())} resetLabel="Valeurs par défaut"/>
 </div>;
}

function Services({demo}:{demo:boolean}){
 const [rows,setRows]=useState<{id:string;label:string;ready:boolean;missing:string[];effect:string}[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(demo){setError('Mode démonstration : l’état des services du serveur n’est pas consulté.');return}let alive=true;fetch('/api/services',{cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);if(alive)setRows(body.services)}).catch(e=>alive&&setError((e as Error).message));return()=>{alive=false}},[demo]);
 return <div className="settings-form">
  {error&&<p className="muted" role="status">{error}</p>}
  {!rows&&!error&&<p role="status">Vérification…</p>}
  {rows&&<ul className="service-list">{rows.map(s=><li key={s.id} className={s.ready?'ok':'warn'}><b>{s.label}</b><span>{s.ready?'Configuré':'Non configuré'}</span>{!s.ready&&<small>À fournir : {s.missing.join(', ')}. {s.effect}</small>}</li>)}</ul>}
  <p className="muted">Les valeurs secrètes ne sont jamais affichées. Elles se configurent dans les variables d’environnement du projet Vercel, puis un nouveau déploiement les active.</p>
 </div>;
}

function Support(props:Props){
 const list:Data[]=Array.isArray(props.settings.feedback)?props.settings.feedback:[];
 const [text,setText]=useState(''),[kind,setKind]=useState('Amélioration');const {status,save}=useSection(props);
 return <div className="settings-form">
  <p>Signalez un problème ou proposez une amélioration. Les retours sont conservés ici et dans le suivi des améliorations de l’administration.</p>
  <label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option>Amélioration</option><option>Problème</option><option>Question</option></select></label>
  <label>Description<textarea rows={4} maxLength={3000} value={text} onChange={e=>setText(e.target.value)}/></label>
  <div className="module-actions"><button type="button" className="btn primary" disabled={!text.trim()||status.state==='pending'} onClick={()=>void save({feedback:[{id:crypto.randomUUID(),kind,text:text.trim(),author:props.author,date:new Date().toISOString(),status:'Nouveau'},...list].slice(0,200)}).then(()=>setText(''))}>Envoyer le retour</button><Feedback status={status}/></div>
  {list.length>0&&<ul className="feedback-list">{list.map(item=><li key={String(item.id)}><small>{String(item.kind)} · {new Date(String(item.date)).toLocaleDateString('fr-CA')} · {String(item.author||'')}</small><p>{String(item.text)}</p><select aria-label="Statut du retour" value={String(item.status)} onChange={e=>void save({feedback:list.map(x=>x.id===item.id?{...x,status:e.target.value}:x)})}>{['Nouveau','En cours','Résolu','Écarté'].map(x=><option key={x}>{x}</option>)}</select></li>)}</ul>}
 </div>;
}

function Billing(props:Props){
 const initial=useMemo(()=>({...reminderSettingsFrom(props.settings.invoice_reminders),instructions:String(props.settings.payment_instructions||'')}),[props.settings.invoice_reminders,props.settings.payment_instructions]);
 const [draft,setDraft]=useState(initial),[offset,setOffset]=useState('');const {status,save}=useSection(props);
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
 const label=(o:number)=>o<0?`${-o} j avant l’échéance`:o===0?'le jour de l’échéance':`${o} j après l’échéance`;
 return <div className="settings-form">
  <fieldset><legend>Rappels de paiement automatiques</legend>
   <label className="note-visibility"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Envoyer automatiquement des rappels aux clients pour les factures impayées</label>
   <div className="settings-days">{draft.offsets.map(o=><span key={o} className="state-pill neutral">{label(o)} <button type="button" className="icon-button" aria-label={`Retirer le rappel ${label(o)}`} onClick={()=>setDraft({...draft,offsets:draft.offsets.filter(x=>x!==o)})}>×</button></span>)}</div>
   <div className="settings-row"><input type="number" min="-30" max="90" step="1" aria-label="Jours par rapport à l’échéance (négatif = avant)" placeholder="Ex. -3, 0, 7" value={offset} onChange={e=>setOffset(e.target.value)}/><button type="button" className="btn secondary" disabled={offset===''||draft.offsets.length>=6} onClick={()=>{const n=Math.round(Number(offset));if(Number.isFinite(n)&&n>=-30&&n<=90)setDraft({...draft,offsets:[...new Set([...draft.offsets,n])].sort((a,b)=>a-b)});setOffset('')}}>Ajouter</button></div>
   <p className="muted">Chaque rappel n’est envoyé qu’une fois par facture, au plus tard 2 jours après la date prévue. Ils partent chaque matin grâce à la tâche planifiée Vercel ; elle exige la variable CRON_SECRET et le service de courriel (RESEND_API_KEY, MAIL_FROM). Sans eux, rien n’est envoyé et rien n’est noté comme envoyé.</p>
  </fieldset>
  <fieldset><legend>Instructions de paiement affichées au client</legend><label>Virement Interac, dépôt direct, chèque…<textarea rows={4} maxLength={1500} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} placeholder="Ex. Virement Interac à paiements@exemple.com (réponse : numéro de facture)"/></label><p className="muted">Affichées sur la page publique de chaque facture. Pour le paiement par carte, collez un lien de paiement (Stripe, Square, PayPal) dans le suivi de la facture.</p></fieldset>
  <SaveBar dirty={dirty} status={status} onSave={()=>void save({invoice_reminders:{enabled:draft.enabled,offsets:draft.offsets},payment_instructions:draft.instructions.trim()})} onReset={()=>setDraft(initial)}/>
 </div>;
}

function CatalogueSettings(props:Props){const {status,save}=useSection(props);return <div className="settings-form"><p className="muted">Gérez les catégories de travaux, les codes de coût, leurs couleurs, les prix et les gabarits au même endroit. Cette bibliothèque est partagée avec l’outil Catalogue et les nouveaux devis ; les documents existants conservent leurs données.</p><Feedback status={status}/><CatalogueCentre value={props.settings.catalogue} quotes={[]} onSave={async entries=>{await props.onSave({...props.settings,catalogue:entries})}}/></div>}
