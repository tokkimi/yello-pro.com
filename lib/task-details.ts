import type {Data,RecordItem} from './model';
export function taskDetailsError(data:Data,id:string|undefined,projectId:string|null,tasks:RecordItem[]):string|null{
 const checks=data.checklist??[],labels=data.labels??[],deps=data.dependencies??[];
 if(!Array.isArray(checks)||checks.length>100||checks.some(x=>!x||typeof x.id!=='string'||x.id.length>100||typeof x.text!=='string'||!x.text.trim()||x.text.length>250||typeof x.done!=='boolean')||new Set(checks.map(x=>x.id)).size!==checks.length)return 'La liste de contrôle est invalide.';
 if(!Array.isArray(labels)||labels.length>12||labels.some(x=>typeof x!=='string'||!x.trim()||x.length>50))return 'Les étiquettes sont invalides.';
 if(!Array.isArray(deps)||deps.length>100||new Set(deps).size!==deps.length)return 'Les dépendances sont invalides.';
 const map=new Map(tasks.map(t=>[t.id,t]));
 if(deps.some(key=>typeof key!=='string'||key===id||!map.has(key)||map.get(key)?.project_id!==projectId))return 'Une dépendance doit appartenir au même projet.';
 const visited=new Set<string>();function reaches(key:string):boolean{if(key===id)return true;if(visited.has(key))return false;visited.add(key);return (map.get(key)?.data.dependencies||[]).some(reaches)}
 if(id&&deps.some(reaches))return 'Ces dépendances créeraient une boucle.';
 return null;
}
