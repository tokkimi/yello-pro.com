import type {Data,RecordItem} from './model';
import {catalogueFrom} from './catalogue';
import {scheduleFrom} from './schedule';

/** Six task sources (as in the reference menu). Opening the menu or a source never creates anything. */
export const taskSources=['Personnalisée','Soumission','Ordre de changement','Catalogue de tâches','Gabarit de tâches','Échéancier'] as const;
export type TaskSource=typeof taskSources[number];
export type TaskCandidate={ref:string;title:string;detail:string;source:TaskSource};

export function taskCandidates(source:TaskSource,project:RecordItem,records:RecordItem[],settings:Data):TaskCandidate[]{
 const own=records.filter(r=>r.project_id===project.id);
 const lines=(r:RecordItem,src:TaskSource)=>((r.data.lines||[]) as Data[]).filter(l=>String(l.description||'').trim()).map((l,i)=>({ref:`${r.id}:${i}`,title:String(l.description).slice(0,160),detail:[r.data.title||r.data.number,l.category,l.quantity?`${l.quantity} ${l.unit||''}`:''].filter(Boolean).join(' · '),source:src}));
 switch(source){
  case 'Soumission':return own.filter(r=>r.kind==='quote'&&r.data.document_type!=='change_order').flatMap(r=>lines(r,source));
  case 'Ordre de changement':return own.filter(r=>r.kind==='quote'&&r.data.document_type==='change_order').flatMap(r=>lines(r,source));
  case 'Catalogue de tâches':return catalogueFrom(settings.catalogue).filter(e=>e.tab==='Tâches'&&!e.steps.length).map(e=>({ref:`catalogue:${e.id}`,title:e.name,detail:e.description||e.category,source}));
  case 'Gabarit de tâches':return catalogueFrom(settings.catalogue).filter(e=>e.tab==='Tâches'&&e.steps.length).flatMap(e=>e.steps.map((s,i)=>({ref:`template:${e.id}:${i}`,title:String(s.title||s.name||s.description||`Étape ${i+1}`),detail:e.name,source})));
  case 'Échéancier':return scheduleFrom(project.data.schedule).filter(a=>a.kind!=='group').map(a=>({ref:`schedule:${a.id}`,title:a.title,detail:a.start?`Début ${a.start}`:'Sans date',source}));
  default:return [];
 }
}
/** Candidates not yet imported in this project (a re-import never duplicates a task). */
export function newCandidates(candidates:TaskCandidate[],tasks:RecordItem[]){const done=new Set(tasks.map(t=>String(t.data.source_ref||'')).filter(Boolean));return candidates.filter(c=>!done.has(c.ref))}
export const sourceOf=(task:RecordItem)=>String(task.data.source||'Personnalisée');
