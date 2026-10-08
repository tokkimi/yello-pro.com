import {NextResponse} from 'next/server';
import {z} from 'zod';
import {identity,db} from '@/lib/supabase';
import {sameOrigin,visible} from '@/lib/access';
import {operationsFrom,shiftHours} from '@/lib/project-operations';
import type {RecordItem} from '@/lib/model';

const schema=z.object({projectId:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),start:z.string().regex(/^\d{2}:\d{2}$/),end:z.string().regex(/^\d{2}:\d{2}$/),breakMinutes:z.number().int().min(0).max(600).default(0),costCode:z.string().max(80).default(''),note:z.string().max(500).default('')});

/**
 * Field time entry for a project the person is assigned to. The entry is "Soumise" for approval; the hourly cost
 * stays with the administration (a field account never sets or sees rates). Overlaps for the same person are refused.
 */
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();
 if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 if(user.role==='client')return NextResponse.json({error:'Accès refusé.'},{status:403});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Saisie invalide.'},{status:400});
 const input=parsed.data;let hours:number;
 try{hours=shiftHours(input.start,input.end,input.breakMinutes)}catch(e){return NextResponse.json({error:(e as Error).message},{status:400})}
 if(input.date>new Date(Date.now()+86400000).toISOString().slice(0,10))return NextResponse.json({error:'Impossible de saisir des heures dans le futur.'},{status:400});
 for(let attempt=0;attempt<3;attempt++){
  const project=(await (await db()).from('records').select('*').eq('id',input.projectId).eq('kind','project').maybeSingle()).data as RecordItem|null;
  if(!project||!(await visible(user,project)))return NextResponse.json({error:'Projet introuvable ou non assigné.'},{status:404});
  const operations=operationsFrom(project.data.operations);
  const toMin=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3));
  const overlap=operations.timesheets.some(s=>s.personId===user.id&&s.date===input.date&&s.start&&s.end&&toMin(input.start)<toMin(s.end)&&toMin(s.start)<toMin(input.end));
  if(overlap)return NextResponse.json({error:'Ce quart chevauche une saisie existante pour cette journée.'},{status:409});
  if(operations.timesheets.some(s=>s.date===input.date&&s.closed&&s.personId===user.id))return NextResponse.json({error:'Cette semaine est clôturée.'},{status:409});
  const entry={id:crypto.randomUUID(),date:input.date,person:user.name,personId:user.id,hours,hourlyRate:0,status:'Soumise' as const,costCode:input.costCode,start:input.start,end:input.end,note:input.note};
  const data={...project.data,operations:{...operations,timesheets:[...operations.timesheets,entry]}};
  const {data:saved}=await (await db()).from('records').update({data,version:project.version+1,updated_at:new Date().toISOString()}).eq('id',project.id).eq('version',project.version).select('id').maybeSingle();
  if(saved){await (await db()).from('audit_log').insert({actor_id:user.id,action:'timesheet_submitted',record_id:project.id,details:{family:'timesheets'}});return NextResponse.json({ok:true,hours})}
 }
 return NextResponse.json({error:'Le projet a été modifié en même temps. Réessayez.'},{status:409});
}
