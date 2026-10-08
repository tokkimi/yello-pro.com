import type {RecordItem} from './model';
import {operationsFrom} from './project-operations';
import {projectProgress} from './project-health';
import {clientDecisions} from './billing';

/**
 * Draft of the weekly client report (Follow My Future "Weekly reports"): done this week, in progress,
 * next two weeks and what is waiting on the client. It is only a draft: the team edits and publishes it.
 */
export function weeklyReportDraft(project:RecordItem,records:RecordItem[],today:string){
 const own=records.filter(r=>r.project_id===project.id);
 const weekAgo=new Date(Date.parse(today+'T12:00:00Z')-7*86_400_000).toISOString().slice(0,10);
 const inTwoWeeks=new Date(Date.parse(today+'T12:00:00Z')+14*86_400_000).toISOString().slice(0,10);
 const tasks=own.filter(r=>r.kind==='task');
 const done=tasks.filter(t=>t.data.status==='Validée'&&t.updated_at.slice(0,10)>=weekAgo).map(t=>String(t.data.title));
 const logs=operationsFrom(project.data.operations).dailyLogs.filter(l=>l.date>=weekAgo&&l.date<=today).map(l=>l.summary.trim()).filter(Boolean);
 const progressNow=tasks.filter(t=>['En cours','À valider'].includes(String(t.data.status))).map(t=>String(t.data.title));
 const next=tasks.filter(t=>t.data.status!=='Validée'&&String(t.data.due||'')>today&&String(t.data.due)<=inTwoWeeks).sort((a,b)=>String(a.data.due).localeCompare(String(b.data.due))).map(t=>`${t.data.title} (${t.data.due})`);
 const waiting=clientDecisions([project,...own],today).map(d=>`${d.title} — depuis ${d.days} j`);
 const section=(title:string,items:string[])=>items.length?`${title}\n${items.map(x=>`• ${x}`).join('\n')}`:'';
 const notes=[section('Réalisé cette semaine',[...done,...logs]),section('En cours',progressNow),section('Prochaines étapes (2 semaines)',next),section('En attente de votre part',waiting)].filter(Boolean).join('\n\n');
 return {title:`Rapport de la semaine du ${weekAgo}`,date:today,progress:projectProgress(project,records),notes,empty:!notes};
}
