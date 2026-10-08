import {identity,db} from '@/lib/supabase';
import {visible} from '@/lib/access';
import {ics} from '@/lib/calendar';

export async function GET(req:Request){
 const user=await identity();if(!user)return Response.json({error:'Connexion requise.'},{status:401});
 const id=new URL(req.url).searchParams.get('id')||'';
 const visit=(await (await db()).from('records').select('*').eq('id',id).eq('kind','visit').maybeSingle()).data;
 if(!visit||!await visible(user,visit))return Response.json({error:'Visite inaccessible.'},{status:404});
 const start=String(visit.data.scheduled_at||visit.data.date||'');
 if(!/^\d{4}-\d{2}-\d{2}(?:T[0-2]\d:[0-5]\d)?$/.test(start))return Response.json({error:'Date de visite invalide.'},{status:400});
 const settings=(await (await db()).from('records').select('data').eq('kind','settings').limit(1).maybeSingle()).data?.data||{};
 const body=ics({uid:visit.id,title:visit.data.title||'Visite Yello Pro',description:[visit.data.notes,visit.data.scope].filter(Boolean).join('\n'),location:visit.data.address||'',start,durationMinutes:Number(visit.data.duration)||Number(settings.appointment_duration)||60});
 return new Response(body,{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="visite-mg-pro.ics"','Cache-Control':'private, no-store'}});
}
