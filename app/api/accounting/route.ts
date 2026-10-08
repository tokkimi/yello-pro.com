import {NextResponse} from 'next/server';
import {identity,db} from '@/lib/supabase';
import {sameOrigin} from '@/lib/access';
import {z} from 'zod';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();if(user?.role!=='admin')return NextResponse.json({error:'Accès refusé.'},{status:403});
 const p=z.object({action:z.enum(['issue','payment','cancel','post_expense','pay_expense']),id:z.uuid(),key:z.uuid(),amount:z.number().positive().optional(),date:z.iso.date().optional(),reference:z.string().max(200).optional()}).safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:'Opération invalide. Vérifiez la date et le montant.'},{status:400});
 const {data,error}=await (await db()).rpc('finance_operation',{p_id:p.data.id,p_actor:user.id,p_action:p.data.action,p_key:p.data.key,p_amount:p.data.amount||0,p_date:p.data.date||new Date().toISOString().slice(0,10),p_reference:p.data.reference||''});
 return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({ok:true,data});
}
