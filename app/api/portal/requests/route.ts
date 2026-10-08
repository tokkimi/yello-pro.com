import {NextResponse} from 'next/server';
import {z} from 'zod';
import {identity,db} from '@/lib/supabase';
import {sameOrigin,visible} from '@/lib/access';
import {clientRequestsFrom} from '@/lib/client-requests';
import type {RecordItem} from '@/lib/model';

const schema=z.object({projectId:z.string().uuid(),title:z.string().trim().min(3).max(160),description:z.string().trim().max(4000).default('')});

/** A client asks for a change on their own project. It is a request to study, never an approved change order. */
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();
 if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 if(user.role!=='client')return NextResponse.json({error:'Réservé aux clients.'},{status:403});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Indiquez un titre (3 caractères minimum).'},{status:400});
 for(let attempt=0;attempt<3;attempt++){
  const project=(await (await db()).from('records').select('*').eq('id',parsed.data.projectId).eq('kind','project').maybeSingle()).data as RecordItem|null;
  if(!project||!(await visible(user,project)))return NextResponse.json({error:'Projet introuvable.'},{status:404});
  const list=clientRequestsFrom(project.data.client_requests);
  if(list.filter(r=>r.status==='Nouvelle').length>=20)return NextResponse.json({error:'Trop de demandes en attente sur ce projet.'},{status:429});
  const entry={id:crypto.randomUUID(),title:parsed.data.title,description:parsed.data.description,status:'Nouvelle',createdAt:new Date().toISOString(),author:user.name,response:''};
  const {data}=await (await db()).from('records').update({data:{...project.data,client_requests:[...list,entry]},version:project.version+1,updated_at:new Date().toISOString()}).eq('id',project.id).eq('version',project.version).select('id').maybeSingle();
  if(data){await (await db()).from('audit_log').insert({actor_id:user.id,action:'client_request',record_id:project.id,details:{family:'projects'}});return NextResponse.json({ok:true,request:entry})}
 }
 return NextResponse.json({error:'Le projet a changé en même temps. Réessayez.'},{status:409});
}
