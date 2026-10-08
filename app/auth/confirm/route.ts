import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import type {EmailOtpType} from '@supabase/supabase-js';
export async function GET(req:NextRequest){
 const url=new URL(req.url);const done=NextResponse.redirect(new URL('/compte',url.origin));
 const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>req.cookies.getAll(),setAll(items){items.forEach(({name,value,options})=>done.cookies.set(name,value,options));}}});
 const code=url.searchParams.get('code');const token=url.searchParams.get('token_hash');const type=url.searchParams.get('type') as EmailOtpType;
 const result=code?await auth.auth.exchangeCodeForSession(code):token&&type?await auth.auth.verifyOtp({token_hash:token,type}):{error:true};
 return result.error?NextResponse.redirect(new URL('/connexion?erreur=invitation',url.origin)):done;
}
