import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {authClient,identity,db} from '@/lib/supabase';
import {sameOrigin} from '@/lib/access';
export async function PATCH(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 const {currentPassword,password}=await req.json();
 if(typeof currentPassword!=='string'||typeof password!=='string'||password.length<12||password.length>128||password===currentPassword)return NextResponse.json({error:'Choisissez un nouveau mot de passe de 12 à 128 caractères.'},{status:400});
 const store=await db();const {data:allowed,error:limitError}=await store.rpc('rate_limit',{p_key:'password:'+user.id});
 if(limitError||!allowed)return NextResponse.json({error:'Trop de tentatives. Réessayez plus tard.'},{status:429});
 const auth=await authClient();const {data:{user:account}}=await auth.auth.getUser();if(!account?.email)return NextResponse.json({error:'Compte indisponible.'},{status:401});
 const verifier=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const checked=await verifier.auth.signInWithPassword({email:account.email,password:currentPassword});
 if(checked.error||checked.data.user?.id!==user.id)return NextResponse.json({error:'Mot de passe actuel incorrect.'},{status:401});
 await verifier.auth.signOut({scope:'local'});const {error}=await auth.auth.updateUser({password});
 if(error)return NextResponse.json({error:'Modification refusée. Reconnectez-vous puis réessayez.'},{status:400});
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
}
