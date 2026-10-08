import {isPlatformOwner} from './platform-owner';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {scopeClient} from './tenant-scope';
// Yello requires its own project. Do not copy any MG Pro environment values.
export const configured=()=>process.env.YELLO_DATABASE_READY==='true'&&!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function authClient(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:(items)=>{try{items.forEach(({name,value,options})=>jar.set(name,value,options));}catch{}}}});}
/** Platform operations only: provisioning, signed webhook and public capability links. */
export function platformDb(){if(!configured())throw new Error('La base Yello Pro indépendante doit être configurée.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function identity(){if(!configured())return null;const auth=await authClient();const {data:{user}}=await auth.auth.getUser();if(!user)return null;const {data,error}=await platformDb().from('profiles').select('*').eq('id',user.id).eq('active',true).single();return error||!data?.workspace_id?null:{...data,platform_owner:isPlatformOwner(data.id)};}
export async function db(){const user=await identity();if(!user?.workspace_id)throw new Error('Connexion à une entreprise requise.');return scopeClient(platformDb(),user.workspace_id);}
export function workspaceDb(workspaceId:string){return scopeClient(platformDb(),workspaceId)}
