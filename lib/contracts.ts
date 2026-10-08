import {Data,totals} from './model';

export function contractError(data:Data){
 if(!['Brouillon','Envoyé','Signé','Archivé'].includes(data.status))return 'Statut du contrat invalide.';
 const lines=data.lines||[];
 if(!Array.isArray(lines)||lines.length>200||lines.some((line:Data)=>!Number.isFinite(Number(line.quantity))||Number(line.quantity)<0||!Number.isFinite(Number(line.price))||Number(line.price)<0))return 'Vérifiez les quantités et les prix du contrat.';
 for(const key of ['tps','tvq','discount'])if(data[key]!==undefined&&(!Number.isFinite(Number(data[key]))||Number(data[key])<0||Number(data[key])>100))return 'Vérifiez les taux et le rabais.';
 const schedule=data.payment_schedule||[];
 if(!Array.isArray(schedule)||schedule.length>30||schedule.some((step:Data)=>!Number.isFinite(Number(step.percent))||Number(step.percent)<0||Number(step.percent)>100))return 'Vérifiez les pourcentages des paiements.';
 if(data.start&&data.end&&data.end<data.start)return 'La fin prévue doit suivre le début des travaux.';
 if(data.status==='Envoyé'){
  if(!String(data.title||'').trim()||!String(data.number||'').trim())return 'Ajoutez le titre et le numéro du contrat.';
  if(!String(data.scope||data.description||'').trim()&&!lines.some((line:Data)=>String(line.description||'').trim()))return 'Décrivez les travaux avant de partager le contrat.';
  if(lines.some((line:Data)=>!String(line.description||'').trim()))return 'Complétez la description des prestations.';
  if(!String(data.terms||'').trim())return 'Ajoutez les conditions du contrat.';
  if(totals(data).total>0&&(!schedule.length||schedule.some((step:Data)=>!String(step.label||'').trim())||Math.abs(schedule.reduce((sum:number,step:Data)=>sum+Number(step.percent),0)-100)>.001))return 'L’échéancier de paiement doit totaliser 100 %.';
 }
 return null;
}

export function contractFromQuote(data:Data):Data{
 const result:Data={};
 for(const key of ['lines','tps','tvq','discount','markup','markup_mode','payment_schedule','timeline','scope','exclusions','terms','rooms','material_selection'])if(data[key]!==undefined)result[key]=structuredClone(data[key]);
 return result;
}
