import {round,totals,type Data,type RecordItem} from './model';
import {operationsFrom} from './project-operations';
import {vendorBudget} from './vendor-finance';
import {scheduleFrom} from './schedule';

/*
 * Project health (adapted from Follow My Future's engine to Yello Pro's records).
 * Pure: turns a project's figures into a 0–100 score, a status and concrete alerts.
 * The rules are Yello Pro choices (H), tuned for renovation work.
 */
export type HealthAlert={level:'danger'|'warning'|'info';kind:'schedule'|'budget'|'client'|'tasks'|'cash';text:string};
export type HealthStatus='on_track'|'at_risk'|'off_track'|'done';
export type ProjectHealth={projectId:string;title:string;clientId:string|null;manager:string;score:number;status:HealthStatus;progress:number;expected:number|null;start:string;end:string;daysLeft:number|null;budget:number;costToDate:number;forecast:number;contract:number;invoiced:number;paid:number;overdueInvoices:number;margin:number|null;marginPct:number|null;budgetUsedPct:number|null;overdueTasks:number;openTasks:number;clientWaits:{label:string;days:number;recordId:string}[];nextDeadline:{date:string;label:string}|null;alerts:HealthAlert[]};
export const healthLabel:Record<HealthStatus,string>={on_track:'Sur la bonne voie',at_risk:'À surveiller',off_track:'En difficulté',done:'Terminé'};

const DAY=86_400_000;
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b.slice(0,10)+'T12:00:00Z')-Date.parse(a.slice(0,10)+'T12:00:00Z'))/DAY);
const isDone=(status:unknown)=>/termin|complét|archiv|annul/i.test(String(status||''));

/** Progress: average phase progress when phases exist, else share of validated tasks, else schedule progress. */
export function projectProgress(project:RecordItem,records:RecordItem[]){
 const phases=records.filter(r=>r.kind==='phase'&&r.project_id===project.id&&!r.data.archived);
 if(phases.length)return Math.round(phases.reduce((s,p)=>s+Math.max(0,Math.min(100,Number(p.data.progress||0))),0)/phases.length);
 const tasks=records.filter(r=>r.kind==='task'&&r.project_id===project.id);
 if(tasks.length)return Math.round(tasks.filter(t=>t.data.status==='Validée').length/tasks.length*100);
 const schedule=scheduleFrom(project.data.schedule).filter(a=>a.kind!=='group');
 if(schedule.length)return Math.round(schedule.reduce((s,a)=>s+a.progress,0)/schedule.length);
 return isDone(project.data.status)?100:0;
}

export function projectHealth(project:RecordItem,records:RecordItem[],today:string):ProjectHealth{
 const own=records.filter(r=>r.project_id===project.id);
 const progress=projectProgress(project,records);
 const ops=operationsFrom(project.data.operations);
 const budgetRows=vendorBudget(ops).total;
 const expenses=own.filter(r=>r.kind==='expense').reduce((s,r)=>s+Number(r.data.net||0),0);
 const costToDate=round(budgetRows.actual+expenses);
 const budget=round(budgetRows.revised||Number(project.data.budget||0));
 const issued=own.filter(r=>r.kind==='invoice'&&!['Brouillon','Annulée'].includes(String(r.data.status)));
 const invoiced=round(issued.reduce((s,r)=>s+totals(r.data).total,0));
 const paid=round(issued.reduce((s,r)=>s+Number(r.data.paid||0),0));
 const overdueInvoices=round(issued.filter(r=>String(r.data.due||'')&&String(r.data.due)<today).reduce((s,r)=>s+Math.max(0,totals(r.data).total-Number(r.data.paid||0)),0));
 const signed=own.filter(r=>r.kind==='contract'&&r.data.status==='Signé'&&!r.data.partner_id);
 const contract=round(signed.reduce((s,r)=>s+(Number(r.data.amount)||totals(r.data).total),0)+own.filter(r=>r.kind==='quote'&&r.data.status==='Accepté'&&!signed.some(c=>c.data.quote_id===r.id)).reduce((s,r)=>s+totals(r.data).total,0));
 // Financial margins compare revenue and costs before tax. Legacy amount-only contracts
 // use their linked quote when available, otherwise the document's tax rates.
 const netContract=(r:RecordItem)=>{const quote=own.find(q=>q.kind==='quote'&&q.id===r.data.quote_id);if(quote)return totals(quote.data).net;if(r.data.lines?.length)return totals(r.data).net;return Number(r.data.amount||0)/(1+Number(r.data.tps??5)/100+Number(r.data.tvq??9.975)/100)};
 const contractNet=round(signed.reduce((s,r)=>s+netContract(r),0)+own.filter(r=>r.kind==='quote'&&r.data.status==='Accepté'&&!signed.some(c=>c.data.quote_id===r.id)).reduce((s,r)=>s+totals(r.data).net,0));
 const revenueNet=Math.max(contractNet,round(issued.reduce((s,r)=>s+totals(r.data).net,0)));
 const tasks=own.filter(r=>r.kind==='task');
 const openTasks=tasks.filter(t=>t.data.status!=='Validée');
 const overdueTasks=openTasks.filter(t=>String(t.data.due||'')&&String(t.data.due)<today).length;
 const age=(r:RecordItem,key='sent_at')=>Math.max(0,daysBetween(String(r.data[key]||r.updated_at),today));
 const clientWaits=[
  ...own.filter(r=>r.kind==='quote'&&r.data.status==='Envoyé').map(r=>({label:`${r.data.document_type==='change_order'?'Ordre de changement':'Soumission'} ${r.data.number||r.data.title||''} à approuver`,days:age(r),recordId:r.id})),
  ...own.filter(r=>r.kind==='contract'&&r.data.status==='Envoyé'&&!r.data.partner_id).map(r=>({label:`Contrat ${r.data.title||''} à signer`,days:age(r),recordId:r.id})),
  ...((Array.isArray(project.data.selections)?project.data.selections:[]) as Data[]).filter(s=>s.published===true&&!s.decision).map(s=>({label:`Choix « ${s.title||'matériau'} »`,days:Math.max(0,daysBetween(String(s.published_at||s.date||project.updated_at),today)),recordId:project.id}))
 ];
 const start=String(project.data.start||project.created_at).slice(0,10);
 const end=String(project.data.end||'').slice(0,10);
 const alerts:HealthAlert[]=[];
 const upcoming=[...openTasks.filter(t=>String(t.data.due||'')>=today).map(t=>({date:String(t.data.due),label:String(t.data.title||'Tâche')})),...scheduleFrom(project.data.schedule).filter(a=>a.start&&a.kind==='milestone'&&a.start>=today).map(a=>({date:a.start,label:a.title})),...(end&&end>=today?[{date:end,label:'Livraison prévue'}]:[])].sort((a,b)=>a.date.localeCompare(b.date));
 const nextDeadline=upcoming[0]||null;
 if(isDone(project.data.status)){
  const revenue=revenueNet;const margin=revenue?round(revenue-costToDate):null;
  return {projectId:project.id,title:String(project.data.title||'Projet'),clientId:project.client_id,manager:String(project.data.assignee||project.data.manager||''),score:100,status:'done',progress,expected:null,start,end,daysLeft:null,budget,costToDate,forecast:costToDate,contract,invoiced,paid,overdueInvoices,margin,marginPct:margin!==null&&revenue?Math.round(margin/revenue*100):null,budgetUsedPct:budget?Math.round(costToDate/budget*100):null,overdueTasks,openTasks:openTasks.length,clientWaits,nextDeadline,alerts};
 }
 let score=100,expected:number|null=null,daysLeft:number|null=null;
 if(end){
  const total=daysBetween(start,end),elapsed=daysBetween(start,today);
  expected=total>0?Math.max(0,Math.min(100,Math.round(elapsed/total*100))):100;
  daysLeft=daysBetween(today,end);
  if(daysLeft<0&&progress<100){score-=35;alerts.push({level:'danger',kind:'schedule',text:`Date de fin dépassée de ${-daysLeft} j — ${progress} % réalisé`})}
  else if(expected-progress>=25){score-=25;alerts.push({level:'danger',kind:'schedule',text:`En retard : ${progress} % réalisé, ${expected} % attendu à ce jour`})}
  else if(expected-progress>=10){score-=12;alerts.push({level:'warning',kind:'schedule',text:`Léger retard : ${progress} % réalisé, ${expected} % attendu`})}
  if(daysLeft>=0&&daysLeft<=7&&progress<90)alerts.push({level:'warning',kind:'schedule',text:`Livraison dans ${daysLeft} j avec ${progress} % réalisé`});
 }
 if(overdueTasks>0){score-=Math.min(20,4*overdueTasks);alerts.push({level:overdueTasks>=5?'danger':'warning',kind:'tasks',text:overdueTasks===1?'1 tâche en retard':`${overdueTasks} tâches en retard`})}
 const blockers=ops.dailyLogs.filter(l=>l.blockers.trim()&&daysBetween(l.date||today,today)>=0&&daysBetween(l.date||today,today)<=7).length;
 if(blockers){score-=Math.min(10,3*blockers);alerts.push({level:'warning',kind:'tasks',text:`${blockers} blocage(s) signalé(s) au journal cette semaine`})}
 let forecast=round(costToDate+budgetRows.openCommitment),usedPct:number|null=null;
 if(budget>0){
  usedPct=Math.round(costToDate/budget*100);
  const byProgress=progress>=20?round(costToDate/(progress/100)):0;
  forecast=Math.max(forecast,byProgress);
  if(costToDate>budget){score-=25;alerts.push({level:'danger',kind:'budget',text:`Budget dépassé : ${usedPct} % consommé`})}
  else if(forecast>budget*1.5){score-=25;alerts.push({level:'danger',kind:'budget',text:`Risque de dépassement : prévision à ${Math.round(forecast/budget*100)} % du budget`})}
  else if(forecast>budget*1.05){score-=15;alerts.push({level:'warning',kind:'budget',text:`Risque de dépassement : prévision à ${Math.round(forecast/budget*100)} % du budget`})}
  else if(usedPct>=80&&progress<70){score-=10;alerts.push({level:'warning',kind:'budget',text:`${usedPct} % du budget utilisé pour ${progress} % d’avancement`})}
 }
 const longest=clientWaits.reduce((m,w)=>Math.max(m,w.days),0);
 if(clientWaits.length){score-=longest>=7?15:6;alerts.push({level:longest>=7?'danger':'warning',kind:'client',text:`En attente du client : ${clientWaits.length} élément(s), le plus ancien depuis ${longest} j`})}
 if(overdueInvoices>0){score-=8;alerts.push({level:'warning',kind:'cash',text:`Factures en retard de paiement`})}
 const revenue=revenueNet;const margin=revenue?round(revenue-forecast):null;
 score=Math.max(0,Math.min(100,score));
 const order={danger:0,warning:1,info:2} as const;alerts.sort((a,b)=>order[a.level]-order[b.level]);
 return {projectId:project.id,title:String(project.data.title||'Projet'),clientId:project.client_id,manager:String(project.data.assignee||project.data.manager||''),score,status:score>=75?'on_track':score>=50?'at_risk':'off_track',progress,expected,start,end,daysLeft,budget,costToDate,forecast,contract,invoiced,paid,overdueInvoices,margin,marginPct:margin!==null&&revenue?Math.round(margin/revenue*100):null,budgetUsedPct:usedPct,overdueTasks,openTasks:openTasks.length,clientWaits,nextDeadline,alerts};
}
