import {db} from './supabase';
import {Profile, RecordItem, permitted} from './model';
export function allowsPerson(profile:Profile,record:RecordItem){const sharing=record.data.access;if(profile.role==='client')return sharing?.client!==false;if(profile.role==='worker')return !Array.isArray(sharing?.workers)||sharing.workers.includes(profile.id);return true;}
export async function visible(profile:Profile,r:RecordItem){
 if(!permitted(profile.role,r.kind))return false;
 if(profile.role==='admin')return true;
 const clientId=r.kind==='client'?r.id:r.client_id;
 if(clientId){const client=r.kind==='client'?r:(await (await db()).from('records').select('data').eq('id',clientId).eq('kind','client').maybeSingle()).data;if(!client||client.data.deleted_at)return false;}
 if(!allowsPerson(profile,r))return false;
 if(profile.role==='client'){
  if(!profile.client_id||clientId!==profile.client_id)return false;
  if(r.kind==='document'&&r.data.visibility!=='client')return false;
  if(['quote','invoice','contract','specification'].includes(r.kind)&&['Brouillon','Validé'].includes(r.data.status))return false;
  if(r.kind==='message'&&r.data.visibility==='internal')return false;
  if(r.project_id){const project=(await (await db()).from('records').select('data').eq('id',r.project_id).eq('kind','project').maybeSingle()).data;if(project?.data.access?.client===false)return false;}
  return true;
 }
 const projectId=r.kind==='project'?r.id:r.project_id;if(!projectId)return (r.kind==='message'||r.kind==='document')&&Array.isArray(r.data.participants)&&r.data.participants.includes(profile.id);
 const project=r.kind==='project'?r:(await (await db()).from('records').select('*').eq('id',projectId).eq('kind','project').maybeSingle()).data;
 if(!project||!allowsPerson(profile,project))return false;
 if(r.kind==='partner_quote')return r.data.partner_id===profile.id;
 if((r.kind==='message'||r.kind==='document')&&Array.isArray(r.data.participants)&&r.data.participants.includes(profile.id))return true;
 const {data}=await (await db()).from('memberships').select('project_id').eq('user_id',profile.id).eq('project_id',projectId).maybeSingle();return !!data;
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
