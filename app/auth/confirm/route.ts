import {NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase';
import type {EmailOtpType} from '@supabase/supabase-js';
export async function GET(req:Request){const url=new URL(req.url);const auth=await authClient();const code=url.searchParams.get('code');const token=url.searchParams.get('token_hash');const type=url.searchParams.get('type') as EmailOtpType;const result=code?await auth.auth.exchangeCodeForSession(code):token&&type?await auth.auth.verifyOtp({token_hash:token,type}):{error:true};return NextResponse.redirect(new URL(result.error?'/connexion?erreur=invitation':'/compte',url));}
