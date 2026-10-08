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
 const profileCount=(active?:boolean,role?:string)=>{let q=raw.from('profiles').select('id',{count:'exact',head:true});if(workspace)q=q.eq('workspace_id',workspace);if(active!==undefined)q=q.eq('active',active);if(role)q=q.eq('role',role);return q};
 const subscriptionCount=(status:string)=>{let q=raw.from('subscriptions').select('workspace_id',{count:'exact',head:true}).eq('status',status);if(workspace)q=q.eq('workspace_id',workspace);return q};
 const [users,subscriptions,active,inactive,admins,workers,clients,companies,trials,paid]=await Promise.all([query,raw.from('subscriptions').select('workspace_id,plan_code,status,trial_ends_at,period_end').limit(1000),profileCount(true),profileCount(false),profileCount(undefined,'admin'),profileCount(undefined,'worker'),profileCount(undefined,'client'),raw.from('workspaces').select('id',{count:'exact',head:true}),subscriptionCount('trialing'),subscriptionCount('active')]);
 if([active,inactive,admins,workers,clients,companies,trials,paid].some(x=>x.error))return NextResponse.json({error:'Statistiques indisponibles.'},{status:503});
 if(workspaces.error||users.error||subscriptions.error)return NextResponse.json({error:'Chargement de la plateforme impossible.'},{status:503});
 await raw.from('audit_log').insert({workspace_id:user.workspace_id,actor_id:user.id,action:'platform_directory_view',details:{workspace:workspace||'all',offset}});
 return NextResponse.json({workspaces:workspaces.data,users:users.data,total:users.count,subscriptions:subscriptions.data,stats:{active:active.count,inactive:inactive.count,admins:admins.count,workers:workers.count,clients:clients.count,companies:companies.count,trials:trials.count,paid:paid.count}},{headers:{'Cache-Control':'private, no-store'}});
}
