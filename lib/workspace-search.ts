import type {RecordItem} from './model';

export const searchableKinds:Record<string,string>={client:'Client',project:'Projet',task:'Tâche',visit:'Visite',quote:'Devis',contract:'Contrat',invoice:'Facture',document:'Document',phase:'Phase',specification:'Cahier des charges',expense:'Dépense',request:'Demande'};
export function normalizeSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();}
/** Only index records already authorized by the server; never persist client data. */
export function searchWorkspace(records:RecordItem[],query:string,limit=12){
 const terms=normalizeSearch(query).split(/\s+/).filter(Boolean);
 if(!terms.length)return [];
 const names=new Map(records.map(r=>[r.id,String(r.data.title||r.data.name||r.data.number||'')]));
 return records.filter(r=>searchableKinds[r.kind]&&!r.data.deleted_at&&!r.data.archived).map(record=>{
  const label=String(record.data.title||record.data.name||record.data.number||searchableKinds[record.kind]);
  const context=[searchableKinds[record.kind],record.data.number,record.client_id&&names.get(record.client_id),record.project_id&&names.get(record.project_id)].filter(Boolean).join(' · ');
  const haystack=normalizeSearch(`${label} ${context} ${record.data.email||''}`);
  const score=terms.every(term=>haystack.includes(term))?(normalizeSearch(label).startsWith(normalizeSearch(query))?2:1):0;
  return {record,label,context,score};
 }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'fr')).slice(0,limit);
}
