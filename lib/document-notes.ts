import type {Data,Role} from './model';

// Remove private fields recursively before returning a document to another role.
export function documentNotes(data:Data,role:Role):Data{
 if(role==='admin')return data;
 const walk=(value:any):any=>{
  if(Array.isArray(value))return value.map(walk);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='admin_notes'&&key!=='notebook'&&!(role==='client'&&key==='internal_notes')&&!(role==='client'&&key==='notes'&&value.show_notes===false)).map(([key,item])=>[key,walk(item)]));
 };
 return walk(data);
}
