import {NextResponse} from 'next/server';
import {identity,platformDb} from '@/lib/supabase';
import {isPlatformOwner} from '@/lib/platform-owner';
export async function GET(req:Request){
 const user=await identity();if(!user||!isPlatformOwner(user.id))return NextResponse.json({error:'Accès réservé au propriétaire Yello Pro.'},{status:403});
 const raw=platformDb(),params=new URL(req.url).searchParams,workspace=params.get('workspace');
 if(workspace&&!/^[0-9a-f-]{36}$/i.test(workspace))return NextResponse.json({error:'Entreprise invalide.'},{status:400});
 const offset=Math.max(0,Math.min(100000,Number(params.get('offset'))||0));
 const workspaces=await raw.from('workspaces').select('id,name,created_at').order('created_at',{ascending:false}).limit(1000);
 let query=raw.from('profiles').select('id,name,email,role,active,workspace_id',{count:'exact'}).order('name').range(offset,offset+99);if(workspace)query=query.eq('workspace_id',workspace);
 const [users,subscriptions]=await Promise.all([query,raw.from('subscriptions').select('workspace_id,plan_code,status,trial_ends_at,period_end').limit(1000)]);
 if(workspaces.error||users.error||subscriptions.error)return NextResponse.json({error:'Chargement de la plateforme impossible.'},{status:503});
 await raw.from('audit_log').insert({workspace_id:user.workspace_id,actor_id:user.id,action:'platform_directory_view',details:{workspace:workspace||'all',offset}});
 return NextResponse.json({workspaces:workspaces.data,users:users.data,total:users.count,subscriptions:subscriptions.data},{headers:{'Cache-Control':'private, no-store'}});
}
