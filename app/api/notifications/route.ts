import {NextResponse} from 'next/server';
import {identity,db} from '@/lib/supabase';
import {sameOrigin,visible} from '@/lib/access';
import {activeRecords} from '@/lib/client-trash';
import type {RecordItem} from '@/lib/model';
import {familyOf,inAppAllowed,matrixFrom,notificationLabel} from '@/lib/notifications';

export async function GET(){
 const user=await identity();if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 const database=await db();
 const [events,reads,settings]=await Promise.all([
  database.from('audit_log').select('id,record_id,action,created_at,details').not('action','in','(notification_read,INSERT,UPDATE,DELETE)').order('id',{ascending:false}).limit(300),
  database.from('audit_log').select('details').eq('actor_id',user.id).eq('action','notification_read').order('id',{ascending:false}).limit(1000),
  database.from('records').select('data').eq('kind','settings').limit(1).maybeSingle()
 ]);
 const matrix=matrixFrom(settings.data?.data?.notification_matrix);
 if(events.error||reads.error)return NextResponse.json({error:'Historique temporairement indisponible.'},{status:503});
 const ids=[...new Set((events.data||[]).map(x=>x.record_id).filter(Boolean))];
 const records=ids.length?await database.from('records').select('*').in('id',ids):{data:[],error:null};
 if(records.error)return NextResponse.json({error:'Chargement des dossiers impossible.'},{status:503});
 const allowed=new Map<string,RecordItem>();for(const record of activeRecords(records.data||[]))if(await visible(user,record))allowed.set(record.id,record);
 const seen=new Set((reads.data||[]).flatMap(x=>Array.isArray(x.details?.ids)?x.details.ids:[]).map(String));
 const rows=(events.data||[]).filter(x=>allowed.has(x.record_id)).map(event=>{const record=allowed.get(event.record_id)!;const family=familyOf(event.action,record.kind);return {id:String(event.id),recordId:record.id,kind:record.kind,family,title:String(record.data.title||record.data.name||record.data.number||'Dossier'),action:event.action,label:notificationLabel(event.action,event.details||undefined),date:event.created_at,read:seen.has(String(event.id))}}).filter(row=>inAppAllowed(matrix,user.role,row.family));
 return NextResponse.json({notifications:rows},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});const user=await identity();if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Données invalides.'},{status:400})}
 if(!Array.isArray(body.ids)||body.ids.length>300||body.ids.some((id:unknown)=>typeof id!=='string'||!/^\d{1,20}$/.test(id)))return NextResponse.json({error:'Liste de notifications invalide.'},{status:400});
 if(!body.ids.length)return NextResponse.json({ok:true});
 const {error}=await (await db()).from('audit_log').insert({actor_id:user.id,action:'notification_read',details:{ids:[...new Set(body.ids)]}});
 return error?NextResponse.json({error:'Lecture non enregistrée. Réessayez.'},{status:503}):NextResponse.json({ok:true});
}
