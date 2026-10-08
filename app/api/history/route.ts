import {NextResponse} from 'next/server';
import {db,identity} from '@/lib/supabase';
export async function GET(req:Request){
 const user=await identity();if(user?.role!=='admin')return NextResponse.json({error:'Historique réservé aux administrateurs.'},{status:403});
 const id=new URL(req.url).searchParams.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Dossier invalide.'},{status:400});
 const database=await db();const record=await database.from('records').select('id').eq('id',id).maybeSingle();if(!record.data)return NextResponse.json({error:'Dossier inaccessible.'},{status:404});
 const {data,error}=await database.from('audit_log').select('id,action,created_at,actor_id,details').eq('record_id',id).order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:'Historique indisponible.'},{status:503});
 const people=(await database.from('profiles').select('id,name')).data||[];
 return NextResponse.json({events:(data||[]).map(e=>({...e,actor:people.find(p=>p.id===e.actor_id)?.name||'Modification du système',before:e.details?.before||null,after:e.details?.after||null,details:undefined}))},{headers:{'Cache-Control':'private, no-store'}});
}
